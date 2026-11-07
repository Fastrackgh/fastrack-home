import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Access to the Business Guide at /guide: anyone with the link who knows the code.
 * The code is the server-only setting BUSINESS_GUIDE_CODE (never NEXT_PUBLIC_), read at
 * request time, so changing it needs a restart, not a rebuild, and signs everyone out.
 * With no code set, the guide stays locked.
 */
export const GUIDE_COOKIE = 'fastrack_guide';
export const GUIDE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export function guideCode(): string | null {
  const code = process.env.BUSINESS_GUIDE_CODE?.trim();
  return code ? code : null;
}

/** The cookie proves the code was entered, without storing the code itself. */
export function passFor(code: string): string {
  return createHmac('sha256', code).update('fastrack-business-guide').digest('hex');
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hasPass(cookie: string | undefined): boolean {
  const code = guideCode();
  return Boolean(code && cookie && same(cookie, passFor(code)));
}

export function codeMatches(entered: string): boolean {
  const code = guideCode();
  return Boolean(code && same(entered.trim(), code));
}

/** Wrong codes per address: 10 every 15 minutes, kept in this server's memory. */
const tries = new Map<string, { count: number; resetAt: number }>();

export function tooManyTries(address: string, now = Date.now()): boolean {
  const entry = tries.get(address);
  return Boolean(entry && entry.resetAt > now && entry.count >= ATTEMPTS);
}

export function recordWrongCode(address: string, now = Date.now()): void {
  const entry = tries.get(address);
  if (!entry || entry.resetAt <= now) {
    tries.set(address, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
  if (tries.size > 10_000) {
    for (const [key, value] of tries) if (value.resetAt <= now) tries.delete(key);
  }
}
