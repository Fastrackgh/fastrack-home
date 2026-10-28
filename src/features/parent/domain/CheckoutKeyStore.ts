import type { PaymentChannel } from '../types';

/**
 * Idempotency keys for online checkouts, one per bill, amount and channel,
 * kept in sessionStorage until the payment resolves. A second tap, a reload
 * or a retry after a dropped connection repeats the same checkout instead of
 * starting a new charge (QA-004).
 */
export class CheckoutKeyStore {
  constructor(private readonly prefix = 'fastrack_parent_checkout:') {}

  private billPrefix(invoiceId: string) {
    return `${this.prefix}${invoiceId}:`;
  }

  /** The key for this checkout, the same one each time until `clear`. */
  keyFor(invoiceId: string, amount: number, channel: PaymentChannel): string {
    const storageKey = `${this.billPrefix(invoiceId)}${amount}:${channel}`;
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

  /** Forgets a bill's keys once its payment has resolved. */
  clear(invoiceId: string) {
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(this.billPrefix(invoiceId)))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {
      // Nothing stored.
    }
  }
}

export const checkoutKeys = new CheckoutKeyStore();
