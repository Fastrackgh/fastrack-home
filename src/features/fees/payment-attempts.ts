/**
 * Idempotency keys for payments not yet confirmed (QA-086). The same payment
 * (student, amount, method and reference) keeps its key until the server
 * confirms it, so re-submitting after a timeout, a closed modal or a reload
 * is refused with 409 instead of recorded twice. Kept in sessionStorage: the
 * tab's own attempts, surviving a reload.
 */

const STORAGE_KEY = 'fastrack_payment_attempts';
/** An unconfirmed attempt older than this is forgotten. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Attempts = Record<string, { key: string; at: number }>;

export interface PaymentSignature {
  studentId: string;
  amount: number;
  method: string;
  reference: string;
}

const signatureOf = ({ studentId, amount, method, reference }: PaymentSignature) =>
  [studentId, amount, method, reference.trim().toLowerCase()].join('|');

function read(): Attempts {
  try {
    const attempts = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Attempts;
    const now = Date.now();
    return Object.fromEntries(Object.entries(attempts).filter(([, a]) => now - a.at < MAX_AGE_MS));
  } catch {
    return {};
  }
}

function write(attempts: Attempts) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch {
    // Without storage the key still lives for this page; only a reload loses it.
  }
}

const inMemory: Attempts = {};

/** The key for this payment: the earlier attempt's, if it was never confirmed. */
export function attemptKeyFor(payment: PaymentSignature): string {
  const signature = signatureOf(payment);
  const attempts = { ...inMemory, ...read() };
  const key = attempts[signature]?.key ?? crypto.randomUUID();
  attempts[signature] = { key, at: attempts[signature]?.at ?? Date.now() };
  inMemory[signature] = attempts[signature];
  write(attempts);
  return key;
}

/** Forgets the key once the server has the payment, so a later identical payment is new. */
export function settleAttempt(payment: PaymentSignature) {
  const signature = signatureOf(payment);
  const attempts = read();
  delete attempts[signature];
  delete inMemory[signature];
  write(attempts);
}
