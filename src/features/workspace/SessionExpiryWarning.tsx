'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@mantine/core';
import { Clock } from 'lucide-react';
import { apiClient, SESSION_STORAGE_KEYS } from '@/lib/api-client';
import { useConnectivity } from '@/lib/offline/useConnectivity';
import { useSyncStatus } from '@/lib/offline/useSyncStatus';

/** Warn from day 12 of a 14-day staff session (plan F4). */
export const SESSION_WARNING_MS = 2 * 24 * 60 * 60_000;

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
 * kept on the device clock by `apiClient`). Online, the session is simply
 * renewed and nothing shows; the warning is for a device that has been
 * offline for most of two weeks, so its queued changes aren't stranded.
 */
export function SessionExpiryWarning() {
  const { online } = useConnectivity();
  const { pending } = useSyncStatus();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const renewing = useRef<string | null>(null);

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

  // Online and close to the end: renew once per expiry while online.
  useEffect(() => {
    if (!near || !online || expiresAt === null) return;
    const attempt = `${expiresAt}`;
    if (renewing.current === attempt) return;
    renewing.current = attempt;
    void apiClient.renewSession().then(() => {
      setExpiresAt(apiClient.getSessionExpiresAt());
      setNow(Date.now());
    });
  }, [near, online, expiresAt]);

  if (!near || expiresAt === null) return null;
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
