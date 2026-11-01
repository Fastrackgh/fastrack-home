'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CheckCircle, CloudOff } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import type { Raw } from '@/lib/pagination';
import type { ReviewItem } from '@/lib/offline/outbox';
import { connectivity } from '@/lib/offline/connectivity';
import {
  dismissReviewItem,
  onSyncApplied,
  resendReviewItem,
  waitForOp,
  type OpOutcome,
} from '@/lib/offline/syncEngine';
import {
  PAYMENT_METHODS,
  toSharedTransfer,
  type Invoice,
  type Payment,
  type PaymentExcess,
  type SharedTransfer,
} from './api';
import { formatGhs, toCedis, toPesewas } from './money';
import { notifyLoadError } from './notify';
import {
  landedByRef,
  landedPayment,
  liveBills,
  offlineAccountBalance,
  offlineInvoicesFor,
  onlineOr,
  provisionalPayment,
  queuedAmounts,
  queuePayment,
  samePaymentQueued,
  serverNowIso,
  warningText,
  type SeenBalance,
} from './payments-sync';
import { StudentPicker } from './StudentPicker';

/**
 * How long a payment may take to land before the provisional receipt is
 * shown instead: it stays queued and lands when the server answers.
 */
const LAND_WAIT_MS = 8_000;

/**
 * Waits for a queued op to land, but not once the device is known to be
 * offline (before queuing, or after its first send got no answer): the
 * provisional receipt is then shown at once (OFF-14).
 */
function waitUnlessOffline(opId: string): Promise<OpOutcome | null> {
  if (!connectivity.get().online) return Promise.resolve(null);
  let unsubscribe = () => {};
  const offline = new Promise<null>((resolve) => {
    unsubscribe = connectivity.subscribe(() => {
      if (!connectivity.get().online) resolve(null);
    });
  });
  return Promise.race([waitForOp(opId, LAND_WAIT_MS), offline]).finally(() => unsubscribe());
}

/** The bills with something to pay, less what this device has queued against each. */
function withQueued(bills: Invoice[], queued: Map<string, number>): Invoice[] {
  return bills.map((bill) =>
    queued.has(bill.id) ? { ...bill, balance: bill.balance - (queued.get(bill.id) ?? 0) } : bill,
  );
}

const excessOf = (item: ReviewItem): PaymentExcess | null => {
  const d = (item.error?.details ?? {}) as Raw;
  if (item.error?.code !== 'PAYMENT_EXCEEDS_BALANCE' || d.surplus == null) return null;
  return {
    owed: toPesewas(d.owed),
    amount: toPesewas(d.amount),
    surplus: toPesewas(d.surplus),
    against: d.against === 'ACCOUNT' ? 'ACCOUNT' : 'INVOICE',
  };
};

/** Rendered only while open, so every payment starts from an empty form. */
export function RecordPaymentModal({
  onClose,
  onRecorded,
}: {
  onClose: () => void;
  /** `closed`: the answer came after the cashier closed this window (QA-273). */
  onRecorded: (payment: Payment | null, closed: boolean) => void;
}) {
  const open = useRef(true);
  useEffect(() => {
    open.current = true;
    return () => {
      open.current = false;
    };
  }, []);
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  // Bills the payment can go to: the open ones and the latest (QA-221).
  const [bills, setBills] = useState<Invoice[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  // `typed`: the user entered the amount, so a loaded balance must not replace it.
  const [amountField, setAmountField] = useState<{ value: number | ''; typed: boolean }>({
    value: '',
    typed: false,
  });
  const amount = amountField.value;
  const [method, setMethod] = useState('MoMo');
  const [channel, setChannel] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  // The backend refused an amount above what's owed: ask before keeping it as credit (QA-029).
  const [excess, setExcess] = useState<PaymentExcess | null>(null);
  // A reference already used for another pupil: is this the same transfer? (QA-216)
  const [shared, setShared] = useState<SharedTransfer | null>(null);
  // The refusal the question is about: answering resends it from the tray.
  const asked = useRef<string | null>(null);
  // A changed form makes the question stale: the refused payment is dropped, and the next submit is new.
  useEffect(() => {
    setExcess(null);
    setShared(null);
    if (asked.current) void dismissReviewItem(asked.current);
    asked.current = null;
  }, [studentId, invoice, amount, method, reference]);
  // What the balance shown came from, for the server's warnings (§9.1).
  const [seen, setSeen] = useState<Omit<SeenBalance, 'balance'>>({});
  // The pupil's account balance before this payment, for the provisional receipt.
  const [accountBalance, setAccountBalance] = useState(0);
  const locked = saving;

  // The payment goes against the bill picked, by default the student's latest;
  // its balance fills the amount unless one was already typed.
  const pickInvoice = (next: Invoice | null) => {
    setInvoice(next);
    setAmountField((field) =>
      field.typed || !next
        ? field
        : { value: next.balance > 0 ? toCedis(next.balance) : '', typed: false },
    );
  };

  useEffect(() => {
    setBills([]);
    setInvoice(null);
    setAmountField((field) => (field.typed ? field : { value: '', typed: false }));
    if (!studentId) return;
    let current = true;
    setInvoiceLoading(true);
    const fromServer = async (): Promise<{ latest: Invoice; open: Invoice[]; asOf?: string }> => ({
      ...(await liveBills(studentId)),
      asOf: serverNowIso(),
    });
    // Offline: the bills synced to this device.
    const fromRecords = async (): Promise<{ latest: Invoice; open: Invoice[]; asOf?: string }> => {
      const all = await offlineInvoicesFor(studentId);
      if (!all.length) throw new Error('No bills for this pupil are saved on this device.');
      const open = all.filter((bill) => bill.status === 'UNPAID' || bill.status === 'PARTIAL');
      return { latest: all[0], open };
    };
    Promise.all([
      onlineOr(fromServer, fromRecords),
      queuedAmounts(studentId),
      offlineAccountBalance(studentId),
    ])
      .then(([{ value, offline }, queued, synced]) => {
        if (!current) return;
        const [latest, ...open] = withQueued([value.latest, ...value.open], queued);
        const bills = open.some((bill) => bill.id === latest.id) ? open : [latest, ...open];
        setBills(bills);
        setSeen(offline ? { fromRecords: true } : { asOf: value.asOf });
        const queuedTotal = [...queued.values()].reduce((sum, a) => sum + a, 0);
        // The synced account if there is one, else what the open bills owe.
        setAccountBalance(
          synced === null
            ? bills.reduce((sum, bill) => sum + Math.max(bill.balance, 0), 0)
            : synced - queuedTotal,
        );
        setInvoice(latest);
        setAmountField((field) =>
          field.typed
            ? field
            : { value: latest.balance > 0 ? toCedis(latest.balance) : '', typed: false },
        );
      })
      .catch((err) => current && notifyLoadError("the student's balance", err))
      .finally(() => current && setInvoiceLoading(false));
    return () => {
      current = false;
    };
  }, [studentId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void send();
  };

  /** The answers from the server for this window's payments, by op (this tab may be the one sending). */
  const landed = useRef(new Map<string, unknown>());
  useEffect(
    () =>
      onSyncApplied((op, body) => {
        landed.current.set(op.opId, body);
      }),
    [],
  );

  /**
   * Waits for a queued payment to land, then shows its receipt; a refusal the
   * cashier can answer (more than owed, a shared reference) becomes a
   * question here. Unanswered within LAND_WAIT_MS, the provisional receipt
   * is shown and the payment lands later.
   */
  const settle = async (opId: string, provisional: Payment) => {
    const outcome = await waitUnlessOffline(opId);
    const closed = !open.current;
    if (!outcome) {
      notifications.show({
        title: 'Saved on this device',
        message: `Provisional receipt ${provisional.receiptNumber} for ${formatGhs(provisional.amountPaid)}. It gets its official number when the device is back online.`,
        color: 'yellow',
        icon: <CloudOff size={18} />,
        autoClose: 8000,
      });
      onRecorded(provisional, closed);
      return;
    }
    if (outcome.state === 'applied') {
      const body = landed.current.get(outcome.opId);
      const payment =
        (body !== undefined ? landedPayment(body) : null) ??
        (await landedByRef(provisional.receiptNumber).catch(() => null)) ??
        provisional;
      notifications.show({
        title: 'Payment Recorded Successfully',
        message: `Receipt ${payment.receiptNumber} issued for ${formatGhs(payment.amountPaid)}`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 6000,
      });
      for (const warning of payment.warnings ?? []) {
        notifications.show({
          title: 'Check this payment',
          message: warningText(warning),
          color: warning.code === 'POSSIBLE_DOUBLE_PAYMENT' ? 'red' : 'yellow',
          autoClose: warning.code === 'POSSIBLE_DOUBLE_PAYMENT' ? false : 10000,
        });
      }
      onRecorded(payment, closed);
      return;
    }
    if (outcome.state === 'forwarded') {
      notifications.show({
        title: 'Passed to the head teacher',
        message: 'You no longer have permission to record payments, so it was not saved here.',
        color: 'yellow',
        autoClose: false,
      });
      onRecorded(null, closed);
      return;
    }
    const item = outcome.item;
    const refused = item ? excessOf(item) : null;
    const reused =
      item?.error?.code === 'SHARED_TRANSFER_REFERENCE'
        ? toSharedTransfer(item.error.details)
        : null;
    if (item && !closed && (refused || reused)) {
      // Nothing was saved: answering resends it from the tray.
      asked.current = item.id;
      setExcess(refused);
      setShared(reused);
      return;
    }
    // Anything else saved nothing. The window says so; once closed, the tray does.
    if (item && !closed) await dismissReviewItem(item.id);
    const duplicate = item?.error?.code === 'DUPLICATE_REFERENCE';
    notifications.show({
      title: duplicate ? 'Already recorded' : 'Payment Failed',
      message: duplicate
        ? `${item?.error?.message ?? 'This reference was already used'}. It was not recorded again; find it under Payments.`
        : (item?.error?.message ?? 'Could not record payment.'),
      color: duplicate ? 'yellow' : 'red',
      autoClose: duplicate ? false : undefined,
    });
    if (duplicate) onRecorded(null, closed);
  };

  /** Queues the payment, then waits for it (every payment goes through the outbox, §9.1). */
  const send = async () => {
    const pesewas = toPesewas(amount);
    if (!studentId) {
      notifications.show({ title: 'Error', message: 'Please select a student.', color: 'red' });
      return;
    }
    if (saving) return;
    if (pesewas <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid payment amount.',
        color: 'red',
      });
      return;
    }
    const request = {
      studentId,
      invoiceId: invoice?.id,
      amount: pesewas,
      paymentMethod: method,
      bankType: channel.trim() || undefined,
      transactionReference: reference.trim() || undefined,
    };
    setSaving(true);
    try {
      // The same payment already waiting (a double click, a retry after a reload) isn't queued twice.
      const queued = await samePaymentQueued(request);
      if (queued) {
        notifications.show({
          title: 'Already waiting to sync',
          message: `This payment is already saved on this device as ${queued.receiptNumber}. It was not recorded again.`,
          color: 'yellow',
          autoClose: false,
        });
        onRecorded(queued, !open.current);
        return;
      }
      const op = await queuePayment(
        request,
        { ...seen, balance: invoice?.balance ?? 0 },
        {
          studentName: invoice?.studentName,
          studentCode: invoice?.studentCode,
          className: invoice?.className,
          invoiceNumber: invoice?.invoiceNumber,
          previousBalance: accountBalance,
          recordedByName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
        },
      );
      const provisional = provisionalPayment(op);
      if (provisional) await settle(op.opId, provisional);
    } catch (err) {
      notifications.show({
        title: 'Payment Failed',
        message: err instanceof Error ? err.message : 'Could not record payment.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  /** The cashier's answer to a refusal: the tray resends it with the fix, as the same payment. */
  const answer = async () => {
    const id = asked.current;
    if (!id || saving) return;
    setSaving(true);
    try {
      asked.current = null;
      const next = await resendReviewItem(id);
      setExcess(null);
      setShared(null);
      const provisional = next ? provisionalPayment(next) : null;
      if (next && provisional) await settle(next.opId, provisional);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={() => !locked && onClose()}
      closeOnEscape={!locked}
      closeOnClickOutside={!locked}
      withCloseButton={!locked}
      title={
        <Box>
          <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
            Record Student Payment
          </Title>
          <Text size="xs" c="dimmed">
            Direct waterfall debt deduction & printable receipt generation
          </Text>
        </Box>
      }
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <StudentPicker
            label="Select Student"
            placeholder="Search by student name or code"
            value={studentId}
            onChange={setStudentId}
            required
            radius="md"
            id="select-pay-student"
          />

          {invoiceLoading ? (
            <Group gap="xs" py="xs">
              <Loader size="xs" color="fastrackRed" />
              <Text size="xs" c="dimmed">
                Fetching student ledger debt...
              </Text>
            </Group>
          ) : invoice ? (
            <>
              {bills.length > 1 ? (
                <Select
                  label="Bill to pay"
                  description={`${bills.length} bills have something to pay`}
                  data={bills.map((bill) => ({
                    value: bill.id,
                    label: `${bill.invoiceNumber} · ${bill.title || 'Bill'} · ${formatGhs(bill.balance)} due`,
                  }))}
                  value={invoice.id}
                  onChange={(id) => pickInvoice(bills.find((bill) => bill.id === id) ?? invoice)}
                  allowDeselect={false}
                  radius="md"
                  id="select-pay-invoice"
                />
              ) : null}
              <Card withBorder radius="md" p="sm" bg="gray.0">
                <Group justify="space-between">
                  <Box>
                    <Text size="xs" c="dimmed">
                      Target Invoice:
                    </Text>
                    <Text size="sm" fw={700}>
                      {invoice.invoiceNumber}
                    </Text>
                  </Box>
                  <Box ta="right">
                    <Text size="xs" c="dimmed">
                      Outstanding Debt:
                    </Text>
                    <Text size="md" fw={800} c={invoice.balance > 0 ? 'red.7' : 'teal.7'}>
                      {formatGhs(invoice.balance)}
                    </Text>
                  </Box>
                </Group>
              </Card>
            </>
          ) : null}

          <NumberInput
            label="Payment Amount (GHS)"
            placeholder="0.00"
            decimalScale={2}
            min={0.01}
            required
            value={amount}
            onChange={(v) =>
              setAmountField(
                typeof v === 'number' ? { value: v, typed: true } : { value: '', typed: false },
              )
            }
            description={
              !invoice || amount === ''
                ? undefined
                : toPesewas(amount) > Math.max(invoice.balance, 0)
                  ? `${formatGhs(toPesewas(amount) - Math.max(invoice.balance, 0))} more than this bill owes: you'll be asked to keep it as credit`
                  : invoice.balance > 0 && toPesewas(amount) !== invoice.balance
                    ? `Outstanding balance is ${formatGhs(invoice.balance)}`
                    : undefined
            }
            radius="md"
            id="input-pay-amount"
          />

          <Grid gutter="sm">
            <Grid.Col span={6}>
              <Select
                label="Payment Method"
                data={PAYMENT_METHODS}
                value={method}
                onChange={(v) => setMethod(v || 'MoMo')}
                radius="md"
                id="select-pay-method"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Channel / Network"
                placeholder="e.g. MTN MoMo"
                value={channel}
                onChange={(e) => setChannel(e.currentTarget.value)}
                radius="md"
                id="input-pay-channel"
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label="Transaction / Cheque Reference"
            placeholder="e.g. TXN-987654321"
            value={reference}
            onChange={(e) => setReference(e.currentTarget.value)}
            radius="md"
            id="input-pay-ref"
          />

          {shared ? (
            <SharedTransferPrompt
              shared={shared}
              studentName={invoice?.studentName}
              saving={saving}
              onConfirm={() => void answer()}
              onChange={() => {
                if (asked.current) void dismissReviewItem(asked.current);
                asked.current = null;
                setShared(null);
                document.getElementById('input-pay-ref')?.focus();
              }}
            />
          ) : excess ? (
            <CreditPrompt
              excess={excess}
              studentName={invoice?.studentName}
              saving={saving}
              onKeep={() => void answer()}
              onChange={() => {
                if (asked.current) void dismissReviewItem(asked.current);
                asked.current = null;
                setExcess(null);
                document.getElementById('input-pay-amount')?.focus();
              }}
            />
          ) : (
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose} radius="md" disabled={locked}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="teal"
                loading={saving}
                radius="md"
                id="btn-confirm-payment"
              >
                Record Payment & Print Receipt
              </Button>
            </Group>
          )}
        </Stack>
      </form>
    </Modal>
  );
}

function SharedTransferPrompt({
  shared,
  studentName,
  saving,
  onConfirm,
  onChange,
}: {
  shared: SharedTransfer;
  studentName?: string;
  saving: boolean;
  onConfirm: () => void;
  onChange: () => void;
}) {
  const earlier = shared.payments
    .map((p) => `${p.studentName} (${p.receiptNumber}, ${formatGhs(p.amount)})`)
    .join(', ');
  return (
    <Alert color="yellow" radius="md" title="Reference already used" id="alert-pay-shared">
      <Stack gap="sm">
        <Text size="sm">
          <b>{shared.reference}</b> was already used for {earlier || 'another pupil'}. Is this the
          same transfer, also paying for {studentName || 'this pupil'}?
        </Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={onChange}
            disabled={saving}
            radius="md"
            id="btn-pay-change-ref"
          >
            Change reference
          </Button>
          <Button
            color="teal"
            onClick={onConfirm}
            loading={saving}
            radius="md"
            id="btn-pay-same-transfer"
          >
            Yes, same transfer
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}

/** A refusal over GHS 100 and more than double what's owed is likely a typo. */
const isLikelyTypo = ({ owed, surplus }: PaymentExcess) => surplus >= 10_000 && surplus > owed;

function CreditPrompt({
  excess,
  studentName,
  saving,
  onKeep,
  onChange,
}: {
  excess: PaymentExcess;
  studentName?: string;
  saving: boolean;
  onKeep: () => void;
  onChange: () => void;
}) {
  const { owed, amount, surplus, against } = excess;
  const typo = isLikelyTypo(excess);
  // A likely typo puts the safe choice under the cashier's Enter key.
  const changeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (typo) changeButton.current?.focus();
  }, [typo]);
  const what = against === 'ACCOUNT' ? 'is owed in total' : 'this bill owes';
  const whose = studentName ? `${studentName}'s` : "the student's";
  return (
    <Alert
      color={typo ? 'red' : 'yellow'}
      radius="md"
      title={typo ? 'Check the amount: this is far more than is owed' : 'More than is owed'}
      id="alert-pay-credit"
    >
      <Stack gap="sm">
        {typo ? (
          <Text size="xl" fw={900} c="red.8">
            {formatGhs(amount)}
          </Text>
        ) : null}
        <Text size="sm">
          {owed > 0 ? (
            <>
              {formatGhs(amount)} is <b>{formatGhs(surplus)}</b> more than {what} ({formatGhs(owed)}
              ).
            </>
          ) : (
            <>Nothing {against === 'ACCOUNT' ? 'is owed' : 'is owed on this bill'}.</>
          )}{' '}
          Keep {owed > 0 ? '' : 'all '}
          {formatGhs(surplus)} as credit on {whose} account?
        </Text>
        <Group justify="flex-end">
          <Button
            variant={typo ? 'filled' : 'default'}
            color={typo ? 'red' : undefined}
            onClick={onChange}
            disabled={saving}
            radius="md"
            ref={changeButton}
            id="btn-pay-change-amount"
          >
            Change amount
          </Button>
          <Button
            variant={typo ? 'default' : 'filled'}
            color="teal"
            onClick={onKeep}
            loading={saving}
            radius="md"
            id="btn-pay-keep-credit"
          >
            Keep as credit
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}
