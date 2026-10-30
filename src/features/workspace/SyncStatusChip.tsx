'use client';

import { useEffect, useState } from 'react';
import { Badge, Tooltip } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import { formatAge } from '@/lib/format';
import { useConnectivity } from '@/lib/offline/useConnectivity';

/**
 * The header's offline status (docs/offline/sync-contract.md, plan F4):
 * hidden while the API answers; "Offline · data from 2 hours ago" when the
 * screens are showing saved copies. Waiting changes join it with the outbox.
 */
export function SyncStatusChip() {
  const { online, oldestShownAt } = useConnectivity();
  const [now, setNow] = useState(() => Date.now());

  // Keep the age current while offline.
  useEffect(() => {
    if (online) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [online]);

  if (online) return null;
  const age = oldestShownAt === null ? null : formatAge(oldestShownAt, now);
  return (
    <Tooltip
      label={
        age
          ? `Can't reach Fastrack. You're seeing data saved ${age}; it updates when you're back online.`
          : "Can't reach Fastrack. Pages you've opened before still show their saved data."
      }
      multiline
      w={260}
    >
      <Badge
        variant="light"
        color="orange"
        radius="md"
        size="sm"
        tt="none"
        leftSection={<WifiOff size={12} />}
        role="status"
      >
        {age ? `Offline · data from ${age}` : 'Offline'}
      </Badge>
    </Tooltip>
  );
}
