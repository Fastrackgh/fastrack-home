'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@mantine/core';
import { Clock } from 'lucide-react';
import { apiClient, SESSION_STORAGE_KEYS } from '@/lib/api-client';
import { useConnectivity } from '@/lib/offline/useConnectivity';
import { useSyncStatus } from '@/lib/offline/useSyncStatus';

/** Warn from day 12 of a 14-day staff session (plan F4). */
export const SESSION_WARNING_MS = 2 * 24 * 60 * 60_000;

/**
 * At most one automatic renewal per device in this time (all tabs). A device
 * clock that is far ahead keeps every expiry "near"; without this it renewed
 * in a loop (OFF-5).
 */
const RENEW_GAP_MS = 10 * 60_000;

/** True when the session was renewed automatically in the last 10 minutes (any tab). */
function renewedRecently(now: number): boolean {
  try {
    const last = Number(localStorage.getItem(SESSION_STORAGE_KEYS.sessionRenewedAt));
    // A stamp in the future means the clock moved back: treat it as recent.
    return Boolean(last) && Math.abs(now - last) < RENEW_GAP_MS;
  } catch {
    return true;
  }
}

/** Only a renewal that reached the server is stamped; one that failed offline leaves the next try free. */
function stampRenewal(now: number) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEYS.sessionRenewedAt, String(now));
  } catch {
    // Without storage the in-tab guard still stops a loop.
  }
}

const deadline = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Warns a staff user whose sign-in is about to end (backend `refreshExpiresAt`,
 * kept on the device clock by `apiClient`). Online nothing shows: the session
 * is renewed (at most every 10 min), and while the API answers it hasn't
 * ended, whatever the device clock says. The warning is for a device that
 * has been offline for most of two weeks, so its queued changes aren't stranded.
 */
export function SessionExpiryWarning() {
  const { online } = useConnectivity();
  const { pending } = useSyncStatus();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Follow the stored expiry (this tab's or another tab's refresh) and the time.
  useEffect(() => {
    const read = () => {
      setExpiresAt(apiClient.getSessionExpiresAt());
      setNow(Date.now());
    };
    read();
    const timer = window.setInterval(read, 60_000);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SESSION_STORAGE_KEYS.sessionExpiresAt || event.key === null) read();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const near = expiresAt !== null && expiresAt - now <= SESSION_WARNING_MS;

  // Online and close to the end: renew, at most every 10 min across tabs and
  // reloads. Two tabs renewing at once refresh once (the refresh Web Lock).
  const renewing = useRef(false);
  useEffect(() => {
    if (!near || !online || renewing.current || renewedRecently(Date.now())) return;
    renewing.current = true;
    void apiClient.renewSession().then((renewed) => {
      if (renewed) stampRenewal(Date.now());
      renewing.current = false;
      setExpiresAt(apiClient.getSessionExpiresAt());
      setNow(Date.now());
    });
  }, [near, online, expiresAt]);

  if (!near || online || expiresAt === null) return null;
  const ended = expiresAt <= now;
  const waiting = pending > 0 ? plural(pending, 'change', 'changes') : null;

  return (
    <Alert
      color={ended ? 'red' : 'yellow'}
      variant="light"
      radius="md"
      mb="md"
      icon={<Clock size={18} />}
      title={
        ended
          ? 'Your sign-in has ended'
          : `Connect to the internet by ${deadline.format(expiresAt)} to stay signed in`
      }
    >
      {ended
        ? waiting
          ? `Connect and sign in again to send the ${waiting} saved on this device. They're kept until you do.`
          : 'Connect and sign in again to keep working.'
        : waiting
          ? `After that you'll need to sign in again before the ${waiting} saved on this device can be sent. They're kept until you do.`
          : "After that you'll need to sign in again."}
    </Alert>
  );
}
