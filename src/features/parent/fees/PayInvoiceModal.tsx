'use client';

import { useState } from 'react';
import { Alert, Button, Modal, NumberInput, SegmentedControl, Stack, Text } from '@mantine/core';
import { AlertCircle, Lock } from 'lucide-react';
import { errorMessage } from '@/features/fees/notify';
import { formatGhs, toCedis, toPesewas } from '@/features/fees/money';
import { parentApi } from '../api';
import { PAYMENT_CHANNELS, type ParentInvoice, type PaymentChannel } from '../types';

const KEY_PREFIX = 'fastrack_parent_checkout:';

/**
 * One key per bill, amount and channel, kept until the payment resolves: a
 * second tap, a reload or a retry after a dropped connection repeats the same
 * checkout instead of starting a new charge (QA-004).
 */
function idempotencyKey(invoiceId: string, amount: number, channel: PaymentChannel) {
  const storageKey = `${KEY_PREFIX}${invoiceId}:${amount}:${channel}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

/** Forgets the checkout keys of a bill once its payment has resolved. */
export function clearCheckoutKeys(invoiceId: string) {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(`${KEY_PREFIX}${invoiceId}:`))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Nothing stored.
  }
}

export function PayInvoiceModal({
  opened,
  onClose,
  studentId,
  invoice,
}: {
  opened: boolean;
  onClose: () => void;
  studentId: string;
  invoice: ParentInvoice;
}) {
  const [cedis, setCedis] = useState<number | string>(toCedis(invoice.balance));
  const [channel, setChannel] = useState<PaymentChannel>('mobile_money');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = toPesewas(cedis);
  // Online payments can't exceed what is owed (QA-029).
  const amountError =
    amount <= 0
      ? 'Enter an amount.'
      : amount > invoice.balance
        ? `You can pay at most ${formatGhs(invoice.balance)}.`
        : null;

  const pay = async () => {
    if (amountError) return;
    setError(null);
    setBusy(true);
    try {
      const session = await parentApi.checkout(studentId, invoice.id, {
        amount,
        channel,
        idempotencyKey: idempotencyKey(invoice.id, amount, channel),
        callbackUrl: `${window.location.origin}/parent/fees/pay/callback`,
      });
      window.location.assign(session.authorizationUrl);
    } catch (err) {
      setError(errorMessage(err, 'Could not start the payment. Try again.'));
      setBusy(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Pay fees" radius="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          Balance on {invoice.invoiceNumber}: <strong>{formatGhs(invoice.balance)}</strong>
        </Text>
        {error && (
          <Alert color="red" radius="md" icon={<AlertCircle size={16} />}>
            {error}
          </Alert>
        )}
        <NumberInput
          label="Amount (GHS)"
          description="Pay the full balance or part of it."
          size="md"
          min={0}
          max={toCedis(invoice.balance)}
          decimalScale={2}
          fixedDecimalScale
          thousandSeparator=","
          hideControls
          inputMode="decimal"
          value={cedis}
          onChange={setCedis}
          error={cedis !== '' ? amountError : null}
        />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Pay with
          </Text>
          <SegmentedControl
            fullWidth
            color="fastrackRed"
            data={PAYMENT_CHANNELS}
            value={channel}
            onChange={(value) => setChannel(value as PaymentChannel)}
          />
        </div>
        <Button
          size="md"
          color="fastrackRed"
          loading={busy}
          disabled={amountError !== null}
          onClick={pay}
          leftSection={<Lock size={16} />}
        >
          Pay {amountError ? '' : formatGhs(amount)}
        </Button>
        <Text size="xs" c="dimmed" ta="center">
          You will finish on our payment partner&apos;s secure page, then come back here. The school
          receives your payment straight away.
        </Text>
      </Stack>
    </Modal>
  );
}
