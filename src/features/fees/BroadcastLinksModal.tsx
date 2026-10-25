'use client';

import { useState } from 'react';
import { Button, Group, Modal, SegmentedControl, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { termOption, type TermInYear } from '@/features/school-setup/api';
import { feesApi } from './api';

type Channel = 'SMS' | 'EMAIL' | 'BOTH';

/** Sends each parent the link to their child's bill for a term, by SMS, email or both. */
export function BroadcastLinksModal({
  terms,
  currentTermId,
  classOptions,
  onClose,
}: {
  terms: TermInYear[];
  currentTermId: string | null;
  classOptions: { value: string; label: string }[];
  onClose: () => void;
}) {
  const [termId, setTermId] = useState<string | null>(currentTermId);
  const [classId, setClassId] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>('BOTH');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!termId) return;
    setSending(true);
    try {
      const result = await feesApi.broadcastInvoiceLinks({
        academicTermId: termId,
        channel,
        ...(classId ? { classId } : {}),
      });
      notifications.show({
        title: 'Bill links queued',
        message: result.message || `${result.queuedCount} parents will receive their link.`,
        color: 'green',
      });
      onClose();
    } catch (err) {
      notifications.show({
        title: 'Could not send the bill links',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Send bill links to parents" radius="lg" centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Each parent on record gets a private link to their own child&apos;s bill. Nobody sees
          another family&apos;s bill.
        </Text>
        <Select
          label="Term"
          data={terms.map(termOption)}
          value={termId}
          onChange={setTermId}
          required
          radius="md"
        />
        <Select
          label="Class"
          placeholder="Every class"
          data={classOptions}
          value={classId}
          onChange={setClassId}
          searchable
          clearable
          radius="md"
        />
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Send by
          </Text>
          <SegmentedControl
            value={channel}
            onChange={(v) => setChannel(v as Channel)}
            data={[
              { value: 'BOTH', label: 'SMS and email' },
              { value: 'SMS', label: 'SMS' },
              { value: 'EMAIL', label: 'Email' },
            ]}
            radius="md"
          />
        </Stack>
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} radius="md" disabled={sending}>
            Cancel
          </Button>
          <Button
            color="fastrackRed"
            onClick={send}
            loading={sending}
            disabled={!termId}
            radius="md"
          >
            Send links
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
