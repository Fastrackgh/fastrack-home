'use client';

import { useEffect, useState } from 'react';
import {
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
import { feesApi, PAYMENT_METHODS, type Invoice, type Payment } from './api';
import { formatGhs, toCedis, toPesewas } from './money';
import { errorMessage, notifyLoadError } from './notify';

/** Rendered only while open, so every payment starts from an empty form. */
export function RecordPaymentModal({
  studentOptions,
  onClose,
  onRecorded,
}: {
  studentOptions: { value: string; label: string }[];
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
  // One key per payment attempt: a double-click or network retry of the same
  // attempt is refused by the server (409) instead of recorded twice.
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState('MoMo');
  const [channel, setChannel] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  // The payment goes against the student's latest invoice; default to its
  // balance unless an amount was already typed.
  useEffect(() => {
    setInvoice(null);
    setAttemptKey(crypto.randomUUID());
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
      onRecorded(payment);
    } catch (err) {
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
      onClose={onClose}
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
          <Select
            label="Select Student"
            placeholder="Search by student name or code"
            data={studentOptions}
            value={studentId}
            onChange={setStudentId}
            searchable
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

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
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
