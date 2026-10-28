'use client';

import { useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { parentApi } from '../api';
import { wardName } from '../domain/wards';
import type { Ward } from '../types';

/** Confirms removing a child from the parent's account. Open while `ward` is set. */
export function UnlinkWardModal({
  ward,
  onClose,
  onUnlinked,
}: {
  ward: Ward | null;
  onClose: () => void;
  onUnlinked: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const unlink = async () => {
    if (!ward) return;
    setBusy(true);
    try {
      await parentApi.unlinkWard(ward.studentId);
      notifications.show({
        color: 'green',
        message: `${wardName(ward)} was removed from your account.`,
      });
      onUnlinked();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Could not remove',
        message: errorMessage(err, 'Try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened={ward !== null} onClose={onClose} title="Remove child?" radius="lg" centered>
      <Text size="sm">
        You will no longer see {ward ? wardName(ward) : ''}&apos;s fees, reports or attendance. You
        can link them again later with their student code.
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" loading={busy} onClick={unlink}>
          Remove
        </Button>
      </Group>
    </Modal>
  );
}
