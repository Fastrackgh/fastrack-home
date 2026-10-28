'use client';

import { useState } from 'react';
import { Button, Modal, NumberInput, SegmentedControl, Stack, Text } from '@mantine/core';
import { Lock } from 'lucide-react';
import { formatGhs, toCedis, toPesewas } from '@/features/fees/money';
import { errorMessage } from '@/lib/api-client';
import { parentApi } from '../api';
import { checkoutKeys } from '../domain/CheckoutKeyStore';
import { checkoutAmountError, PAYMENT_CHANNELS } from '../domain/invoices';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { parentRoutes } from '../routes';
import type { ParentInvoice, PaymentChannel } from '../types';
import { ErrorAlert } from '../ui';

/** Starts an online payment and sends the parent to the provider's checkout page. */
export function PayInvoiceModal({
  onClose,
  studentId,
  invoice,
}: {
  onClose: () => void;
  studentId: string;
  invoice: ParentInvoice;
}) {
  const [cedis, setCedis] = useState<number | string>(toCedis(invoice.balance));
  const [channel, setChannel] = useState<PaymentChannel>('mobile_money');
  const { busy, error, run } = useAsyncAction();

  const amount = toPesewas(cedis);
  const amountError = checkoutAmountError(amount, invoice.balance);

  const pay = () => {
    if (amountError) return;
    run(
      async () => {
        const session = await parentApi.checkout(studentId, invoice.id, {
          amount,
          channel,
          idempotencyKey: checkoutKeys.keyFor(invoice.id, amount, channel),
          callbackUrl: `${window.location.origin}${parentRoutes.paymentCallback}`,
        });
        window.location.assign(session.authorizationUrl);
      },
      {
        failure: (err) => errorMessage(err, 'Could not start the payment. Try again.'),
        holdOnSuccess: true,
      },
    );
  };

  return (
    <Modal opened onClose={onClose} title="Pay fees" radius="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          Balance on {invoice.invoiceNumber}: <strong>{formatGhs(invoice.balance)}</strong>
        </Text>
        <ErrorAlert>{error}</ErrorAlert>
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
