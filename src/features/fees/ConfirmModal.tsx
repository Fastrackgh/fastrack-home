'use client';

import { useState, type ReactNode } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from './notify';

/** Asks before a destructive action; shows the error and stays open if it fails. */
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [working, setWorking] = useState(false);

  const confirm = async () => {
    setWorking(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      notifications.show({ title, message: errorMessage(err, 'Try again.'), color: 'red' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={title} radius="lg" centered>
      <Stack gap="md">
        <Text size="sm">{children}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md" disabled={working}>
            Cancel
          </Button>
          <Button color="red" onClick={confirm} loading={working} radius="md" id="btn-confirm">
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
