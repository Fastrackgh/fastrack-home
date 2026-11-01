'use client';

import { useState } from 'react';
import { ActionIcon, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { syncNow } from '@/lib/offline/syncEngine';
import { useConnectivity } from '@/lib/offline/useConnectivity';
import { useSyncStatus } from '@/lib/offline/useSyncStatus';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Sign out, guarded (plan F4): signing out deletes this user's data from the
 * device, so while changes wait to be sent or need review it asks first,
 * offering "Sync now" or an explicit discard.
 */
export function SignOutButton() {
  const { logout } = useAuth();
  const { online } = useConnectivity();
  const { pending, review, syncing } = useSyncStatus();
  const [open, setOpen] = useState(false);
  const unsent = pending + review;

  const ask = () => (unsent > 0 ? setOpen(true) : logout());

  return (
    <>
      <ActionIcon variant="subtle" color="gray" aria-label="Sign out" onClick={ask}>
        <LogOut size={17} />
      </ActionIcon>
      <Modal opened={open} onClose={() => setOpen(false)} title="Sign out?" centered>
        {unsent === 0 ? (
          <Stack gap="md">
            <Text size="sm">All your changes have been sent.</Text>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={logout}>Sign out</Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <Text size="sm">
              {[
                pending > 0 &&
                  `${plural(pending, 'change hasn’t', 'changes haven’t')} been sent yet`,
                review > 0 && `${plural(review, 'change needs', 'changes need')} review`,
              ]
                .filter(Boolean)
                .join(', and ')}
              . Signing out deletes {unsent === 1 ? 'it' : 'them'} from this device.
            </Text>
            {pending > 0 && !online && (
              <Text size="sm" c="dimmed">
                You&apos;re offline. Stay signed in and {pending === 1 ? 'it' : 'they'}&apos;ll be
                sent when the connection is back.
              </Text>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setOpen(false)}>
                Stay signed in
              </Button>
              {pending > 0 && (
                <Button variant="light" loading={syncing} onClick={() => syncNow()}>
                  Sync now
                </Button>
              )}
              <Button color="red" onClick={logout}>
                Discard {plural(unsent, 'change', 'changes')} and sign out
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
