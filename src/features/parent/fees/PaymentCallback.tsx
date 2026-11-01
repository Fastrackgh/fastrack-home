'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Loader, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatGhs } from '@/features/fees/money';
import { parentRoutes } from '../routes';
import type { PaymentVerification } from '../types';
import { usePaymentVerification } from './usePaymentVerification';

/** Where the payment provider returns the parent after paying. */
export function PaymentCallback() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');
  const { status, result, checking, checkAgain } = usePaymentVerification(reference);
  const billHref = result?.invoiceId ? parentRoutes.invoice(result.invoiceId) : parentRoutes.fees;

  return (
    <Paper withBorder radius="lg" p="xl" mt="xl">
      <Stack align="center" ta="center" gap="sm">
        {status === 'pending' && checking && <Confirming />}
        {status === 'pending' && !checking && (
          <Outcome icon={<Clock size={28} />} color="orange" title="Payment still processing">
            <Text size="sm" c="dimmed">
              We have not heard back yet. You will not be charged twice. Check again in a minute, or
              look for it under Fees → Payments.
            </Text>
            <Button color="fastrackRed" onClick={checkAgain}>
              Check again
            </Button>
            <BackToBill href={billHref} />
          </Outcome>
        )}
        {status === 'success' && (
          <Outcome icon={<CheckCircle2 size={28} />} color="green" title="Payment received">
            <PaymentReceived payment={result?.payment ?? null} />
            <BackToBill href={billHref} />
          </Outcome>
        )}
        {status === 'failed' && (
          <Outcome icon={<XCircle size={28} />} color="red" title="Payment not completed">
            <Text size="sm" c="dimmed">
              {result?.message ??
                'The payment was cancelled or declined. You have not been charged.'}
            </Text>
            <Button color="fastrackRed" component={Link} href={billHref}>
              Try again
            </Button>
          </Outcome>
        )}
      </Stack>
    </Paper>
  );
}

function Confirming() {
  return (
    <>
      <Loader color="fastrackRed" size="lg" />
      <Title order={3}>Confirming your payment…</Title>
      <Text size="sm" c="dimmed">
        If you paid with Mobile Money, approve the prompt on your phone. Keep this page open.
      </Text>
    </>
  );
}

function Outcome({
  icon,
  color,
  title,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeIcon size={56} radius="xl" color={color} variant="light">
        {icon}
      </ThemeIcon>
      <Title order={3}>{title}</Title>
      {children}
    </>
  );
}

function PaymentReceived({ payment }: { payment: PaymentVerification['payment'] }) {
  if (!payment) return null;
  return (
    <>
      <Text size="sm" c="dimmed">
        {formatGhs(payment.amountPaid)} paid. Receipt {payment.receiptNumber}.
        {payment.newBalance === null
          ? ''
          : payment.newBalance > 0
            ? ` Balance left: ${formatGhs(payment.newBalance)}.`
            : ' This bill is fully paid.'}
      </Text>
      <Button color="fastrackRed" component={Link} href={parentRoutes.receipt(payment.id)}>
        View receipt
      </Button>
    </>
  );
}

function BackToBill({ href }: { href: string }) {
  return (
    <Button variant="default" component={Link} href={href}>
      Back to bill
    </Button>
  );
}
