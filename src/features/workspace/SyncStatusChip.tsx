'use client';

import { useEffect, useState } from 'react';
import { Badge, Tooltip, UnstyledButton } from '@mantine/core';
import { CloudUpload, TriangleAlert, WifiOff } from 'lucide-react';
import { formatAge } from '@/lib/format';
import { useConnectivity } from '@/lib/offline/useConnectivity';
import { useSyncStatus } from '@/lib/offline/useSyncStatus';
import { ReviewTray } from './ReviewTray';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The header's offline and sync status (docs/offline/staff-offline.md, plan F4):
 * hidden while the API answers and nothing waits. Offline it reads
 * "Offline · data from 2 hours ago", or "Offline · 3 waiting" once changes
 * are queued; online, "Syncing 3" or "3 waiting" until they land, and
 * "2 need review" while the review tray has items. With anything in the
 * tray, clicking it opens the tray.
 */
export function SyncStatusChip() {
  const { online, oldestShownAt } = useConnectivity();
  const { pending, review, forwarded, syncing, paused, lastSyncedAt } = useSyncStatus();
  const [now, setNow] = useState(() => Date.now());
  const [trayOpen, setTrayOpen] = useState(false);
  const inTray = review + forwarded;
  const visible = !online || pending > 0 || inTray > 0;

  // Keep the ages current while the chip shows.
  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return trayOpen ? <ReviewTray opened onClose={() => setTrayOpen(false)} /> : null;

  const age = oldestShownAt === null ? null : formatAge(oldestShownAt, now);
  const waiting = pending > 0 ? plural(pending, 'change', 'changes') : null;
  const synced = lastSyncedAt === null ? null : `Last synced ${formatAge(lastSyncedAt, now)}.`;

  const parts: string[] = [];
  const tips: string[] = [];
  if (!online) {
    parts.push('Offline');
    if (pending === 0 && age) parts.push(`data from ${age}`);
    tips.push(
      age
        ? `Can't reach Fastrack. You're seeing data saved ${age}; it updates when you're back online.`
        : "Can't reach Fastrack. Pages you've opened before still show their saved data.",
    );
  }
  if (pending > 0) {
    parts.push(online && syncing ? `Syncing ${pending}` : `${pending} waiting`);
    tips.push(
      paused
        ? `${waiting} saved on this device. Sign in again to send them.`
        : online
          ? `${waiting} saved on this device ${syncing ? 'and being sent now' : 'will be sent shortly'}.`
          : `${waiting} saved on this device. They'll be sent when you're back online.`,
    );
  }
  if (review > 0) {
    parts.push(`${review} need review`);
    tips.push(
      `${plural(review, 'change', 'changes')} couldn't be applied as made and need you to check them.`,
    );
  }
  if (forwarded > 0) {
    if (review === 0) parts.push(`${forwarded} sent to head teacher`);
    tips.push(`${plural(forwarded, 'change was', 'changes were')} passed to the head teacher.`);
  }
  if (synced && pending + review > 0) tips.push(synced);
  if (inTray > 0) tips.push('Click to review.');

  const color = review > 0 ? 'red' : !online ? 'orange' : 'blue';
  const Icon = review > 0 ? TriangleAlert : !online ? WifiOff : CloudUpload;

  const badge = (
    <Badge
      variant="light"
      color={color}
      radius="md"
      size="sm"
      tt="none"
      leftSection={<Icon size={12} />}
      role="status"
    >
      {parts.join(' · ')}
    </Badge>
  );

  return (
    <>
      <Tooltip label={tips.join(' ')} multiline w={280}>
        {inTray > 0 ? (
          <UnstyledButton aria-label="Open the review tray" onClick={() => setTrayOpen(true)}>
            {badge}
          </UnstyledButton>
        ) : (
          badge
        )}
      </Tooltip>
      <ReviewTray opened={trayOpen} onClose={() => setTrayOpen(false)} />
    </>
  );
}
