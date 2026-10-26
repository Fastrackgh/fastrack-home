'use client';

import { useEffect, useState } from 'react';
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
import { feesApi, PAYMENT_METHODS, type Invoice, type Payment } from './api';
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
  onRecorded: (payment: Payment | null) => void;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
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
  // The server has taken longer than SLOW_MS: say so, and let the cashier close.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!saving) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [saving]);
  const locked = saving && !slow;

  // The payment goes against the student's latest invoice; default to its
  // balance unless an amount was already typed.
  useEffect(() => {
    setInvoice(null);
    setAmountField((field) => (field.typed ? field : { value: '', typed: false }));
    if (!studentId) return;
    let current = true;
    setInvoiceLoading(true);
    feesApi
      .latestInvoiceFor(studentId)
      .then((latest) => {
        if (!current) return;
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const signature = { studentId, amount: pesewas, method, reference };
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
      onRecorded(payment);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        // The server already has this payment (a repeated key or reference).
        settleAttempt(signature);
        notifications.show({
          title: 'Already recorded',
          message: `${err.message}. It was not recorded again; find it under Payments.`,
          color: 'yellow',
          autoClose: false,
        });
        onRecorded(null);
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
              invoice &&
              invoice.balance > 0 &&
              amount !== '' &&
              toPesewas(amount) !== invoice.balance
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
        </Stack>
      </form>
    </Modal>
  );
}
