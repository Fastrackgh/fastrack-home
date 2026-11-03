'use client';

import { useState } from 'react';
import {
  Button,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { Lock } from 'lucide-react';
import { formatGhs, toCedis, toPesewas } from '@/features/fees/money';
import { errorCode, errorMessage } from '@/lib/api-client';
import { emailInputProps } from '@/lib/email-input';
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
  // Asked for only after the payment partner refused the account's email (QA-229).
  const [receiptEmail, setReceiptEmail] = useState<string | null>(null);
  const emailError =
    receiptEmail === null || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(receiptEmail.trim())
      ? null
      : 'Enter an email address, like name@gmail.com.';

  const amount = toPesewas(cedis);
  const amountError = checkoutAmountError(amount, invoice.balance);

  const pay = () => {
    if (amountError || emailError) return;
    run(
      async () => {
        const session = await parentApi.checkout(studentId, invoice.id, {
          amount,
          channel,
          idempotencyKey: checkoutKeys.keyFor(invoice.id, amount, channel),
          callbackUrl: `${window.location.origin}${parentRoutes.paymentCallback}`,
          ...(receiptEmail ? { email: receiptEmail.trim() } : {}),
        });
        window.location.assign(session.authorizationUrl);
      },
      {
        failure: (err) => {
          if (errorCode(err) !== 'PAYMENT_EMAIL_REJECTED')
            return errorMessage(err, 'Could not start the payment. Try again.');
          // That attempt has ended: the next tap is a new checkout.
          checkoutKeys.clear(invoice.id);
          setReceiptEmail((current) => current ?? '');
          return receiptEmail
            ? "Our payment partner didn't accept that email either. Check it, or try another."
            : "Our payment partner didn't accept the email on your account. Enter another email for this payment's receipt, then tap Pay again.";
        },
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
        {receiptEmail !== null && (
          <TextInput
            label="Email for the receipt"
            description="Used only for this payment. Your sign-in email doesn't change."
            size="md"
            required
            {...emailInputProps}
            autoComplete="email"
            value={receiptEmail}
            onChange={(e) => setReceiptEmail(e.currentTarget.value)}
            error={receiptEmail !== '' ? emailError : null}
            data-autofocus
          />
        )}
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
          disabled={amountError !== null || emailError !== null || receiptEmail === ''}
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
