'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Loader, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatGhs } from '@/features/fees/money';
import { parentApi } from '../api';
import type { PaymentVerification } from '../types';
import { clearCheckoutKeys } from './PayInvoiceModal';

/** Waits between checks while a payment is pending, e.g. a MoMo prompt not yet approved. */
const POLL_DELAYS_MS = [0, 2000, 3000, 5000, 5000, 8000, 8000];

/**
 * Where the payment provider returns the parent. The backend confirms the
 * payment with the provider (and from its webhook); this page only asks it
 * for the outcome, never trusts the query string.
 */
export function PaymentCallback() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');
  const [result, setResult] = useState<PaymentVerification | null>(null);
  const [checking, setChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!reference) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setChecking(true);
      for (const delay of POLL_DELAYS_MS) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled) return;
        try {
          const verification = await parentApi.verifyPayment(reference);
          if (cancelled) return;
          setResult(verification);
          if (verification.status !== 'pending') {
            if (verification.invoiceId) clearCheckoutKeys(verification.invoiceId);
            break;
          }
        } catch {
          // A failed check is retried; the outcome stays pending until one succeeds.
        }
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reference, attempt]);

  const status = !reference ? 'failed' : (result?.status ?? 'pending');
  const billHref = result?.invoiceId ? `/parent/fees/${result.invoiceId}` : '/parent/fees';

  return (
    <Paper withBorder radius="lg" p="xl" mt="xl">
      <Stack align="center" ta="center" gap="sm">
        {status === 'pending' && checking && (
          <>
            <Loader color="fastrackRed" size="lg" />
            <Title order={3}>Confirming your payment…</Title>
            <Text size="sm" c="dimmed">
              If you paid with Mobile Money, approve the prompt on your phone. Keep this page open.
            </Text>
          </>
        )}
        {status === 'pending' && !checking && (
          <>
            <ThemeIcon size={56} radius="xl" color="orange" variant="light">
              <Clock size={28} />
            </ThemeIcon>
            <Title order={3}>Payment still processing</Title>
            <Text size="sm" c="dimmed">
              We have not heard back yet. You will not be charged twice. Check again in a minute, or
              look for it under Fees → Payments.
            </Text>
            <Button color="fastrackRed" onClick={() => setAttempt((a) => a + 1)}>
              Check again
            </Button>
            <Button variant="default" component={Link} href={billHref}>
              Back to bill
            </Button>
          </>
        )}
        {status === 'success' && (
          <>
            <ThemeIcon size={56} radius="xl" color="green" variant="light">
              <CheckCircle2 size={28} />
            </ThemeIcon>
            <Title order={3}>Payment received</Title>
            {result?.payment && (
              <Text size="sm" c="dimmed">
                {formatGhs(result.payment.amountPaid)} paid. Receipt {result.payment.receiptNumber}.
                {result.payment.newBalance > 0
                  ? ` Balance left: ${formatGhs(result.payment.newBalance)}.`
                  : ' This bill is fully paid.'}
              </Text>
            )}
            {result?.payment && (
              <Button
                color="fastrackRed"
                component={Link}
                href={`/parent/receipts/${result.payment.id}`}
              >
                View receipt
              </Button>
            )}
            <Button variant="default" component={Link} href={billHref}>
              Back to bill
            </Button>
          </>
        )}
        {status === 'failed' && (
          <>
            <ThemeIcon size={56} radius="xl" color="red" variant="light">
              <XCircle size={28} />
            </ThemeIcon>
            <Title order={3}>Payment not completed</Title>
            <Text size="sm" c="dimmed">
              {result?.message ??
                'The payment was cancelled or declined. You have not been charged.'}
            </Text>
            <Button color="fastrackRed" component={Link} href={billHref}>
              Try again
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
