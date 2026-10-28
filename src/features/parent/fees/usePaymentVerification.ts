'use client';

import { useCallback, useEffect, useState } from 'react';
import { parentApi } from '../api';
import { checkoutKeys } from '../domain/CheckoutKeyStore';
import type { PaymentOutcome, PaymentVerification } from '../types';

/** Waits between checks while a payment is pending, e.g. a MoMo prompt not yet approved. */
const POLL_DELAYS_MS = [0, 2000, 3000, 5000, 5000, 8000, 8000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks the backend for a payment's outcome, polling while it is pending. The
 * backend confirms it with the provider (and from its webhook); the query
 * string is never trusted. A missing reference counts as failed.
 */
export function usePaymentVerification(reference: string | null) {
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
        await wait(delay);
        if (cancelled) return;
        try {
          const verification = await parentApi.verifyPayment(reference);
          if (cancelled) return;
          setResult(verification);
          if (verification.status !== 'pending') {
            if (verification.invoiceId) checkoutKeys.clear(verification.invoiceId);
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

  const checkAgain = useCallback(() => setAttempt((a) => a + 1), []);
  const status: PaymentOutcome = !reference ? 'failed' : (result?.status ?? 'pending');

  return { status, result, checking, checkAgain };
}
