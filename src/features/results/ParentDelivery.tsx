'use client';

import { useEffect, useState } from 'react';
import { Alert, Progress, Stack, Text } from '@mantine/core';
import { Send } from 'lucide-react';
import { anyFailed, channelLines, finishedPercent, type DeliveryProgress } from './delivery';

const POLL_MS = 2000;

/**
 * How the messages to parents from the latest publish are going. They go out from a queue
 * after publishing, so this polls until nothing is waiting. Remount it (`key`) after a publish.
 */
export function ParentDelivery({ load }: { load: () => Promise<DeliveryProgress> }) {
  const [progress, setProgress] = useState<DeliveryProgress | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const next = await load();
        if (!active) return;
        setProgress(next);
        if (!next.done) timer = setTimeout(tick, POLL_MS);
      } catch {
        // Progress is a nicety: try again later rather than show an error.
        if (active) timer = setTimeout(tick, POLL_MS * 3);
      }
    };
    void tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  if (!progress || !progress.tracked) return null;
  const lines = channelLines(progress);
  const failed = anyFailed(progress);
  const color = !progress.done ? 'blue' : failed ? 'orange' : 'green';
  return (
    <Alert
      color={color}
      radius="md"
      mb="md"
      icon={<Send size={16} />}
      title={progress.done ? 'Messages to parents' : 'Sending to parents…'}
    >
      <Stack gap={6}>
        {lines.length ? (
          lines.map((l) => (
            <Text key={l} size="sm">
              {l}
            </Text>
          ))
        ) : (
          <Text size="sm">No message went out: no linked parent could be reached.</Text>
        )}
        {!progress.done && <Progress value={finishedPercent(progress)} size="sm" animated />}
        {progress.pupilsNotReached > 0 && (
          <Text size="xs" c="dimmed">
            {progress.pupilsNotReached}{' '}
            {progress.pupilsNotReached === 1 ? 'pupil has' : 'pupils have'} no linked parent to
            reach.
          </Text>
        )}
        {progress.done && failed && (
          <Text size="xs" c="dimmed">
            Failed messages were tried several times. Check the parents&apos; email addresses and
            phone numbers.
          </Text>
        )}
      </Stack>
    </Alert>
  );
}
