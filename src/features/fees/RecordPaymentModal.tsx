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
import { CheckCircle } from 'lucide-react';
import { ApiError, errorMessage } from '@/lib/api-client';
import {
  feesApi,
  PAYMENT_METHODS,
  paymentExcessOf,
  type Invoice,
  type Payment,
  type PaymentExcess,
} from './api';
import { formatGhs, toCedis, toPesewas } from './money';
import { notifyLoadError } from './notify';
import { attemptKeyFor, settleAttempt } from './payment-attempts';
import { StudentPicker } from './StudentPicker';

/** After this long without an answer, the modal says it's still waiting and may be closed. */
const SLOW_MS = 20_000;

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
  // A changed form makes the question stale; the next submit asks again if needed.
  useEffect(() => setExcess(null), [studentId, invoice, amount, method, reference]);
  // The server has taken longer than SLOW_MS: say so, and let the cashier close.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!saving) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [saving]);
  const locked = saving && !slow;

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
    Promise.all([
      feesApi.latestInvoiceFor(studentId),
      // Without the list the latest bill can still be paid, as before QA-221.
      feesApi.openInvoicesFor(studentId).catch(() => []),
    ])
      .then(([latest, open]) => {
        if (!current) return;
        setBills(open.some((bill) => bill.id === latest.id) ? open : [latest, ...open]);
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
    void send(false);
  };

  /** `allowCredit`: the cashier agreed to keep the extra as credit; same key, so still one payment. */
  const send = async (allowCredit: boolean) => {
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
    // The same payment keeps its key until confirmed, so a retry is refused (409), not doubled.
    const signature = {
      studentId,
      invoiceId: invoice?.id ?? null,
      amount: pesewas,
      method,
      reference,
    };
    const attemptKey = attemptKeyFor(signature);
    setSaving(true);
    try {
      const payment = await feesApi.recordPayment(
        {
          studentId,
          invoiceId: invoice?.id,
          amount: pesewas,
          paymentMethod: method,
          bankType: channel.trim() || undefined,
          transactionReference: reference.trim() || undefined,
          allowCredit: allowCredit || undefined,
        },
        attemptKey,
      );
      notifications.show({
        title: 'Payment Recorded Successfully',
        message: `Receipt ${payment?.receiptNumber || ''} issued for ${formatGhs(pesewas)}`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 6000,
      });
      settleAttempt(signature);
      setExcess(null);
      onRecorded(payment, !open.current);
    } catch (err) {
      // Nothing was saved, and the key stays for the confirmed resend.
      const refused = paymentExcessOf(err);
      if (refused) {
        setExcess(refused);
        return;
      }
      if (err instanceof ApiError && err.statusCode === 409) {
        // The server already has this payment (a repeated key or reference).
        settleAttempt(signature);
        notifications.show({
          title: 'Already recorded',
          message: `${err.message}. It was not recorded again; find it under Payments.`,
          color: 'yellow',
          autoClose: false,
        });
        onRecorded(null, !open.current);
        return;
      }
      notifications.show({
        title: 'Payment Failed',
        message: errorMessage(err, 'Could not record payment.'),
        color: 'red',
      });
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

          {slow && (
            <Alert color="yellow" radius="md" title="Still waiting for the server">
              Don&apos;t record this payment again. If you close this window, check Payments in a
              minute: submitting the same payment again is safe and won&apos;t charge twice.
            </Alert>
          )}

          {excess ? (
            <CreditPrompt
              excess={excess}
              studentName={invoice?.studentName}
              saving={saving}
              onKeep={() => void send(true)}
              onChange={() => {
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
