'use client';

import { useState } from 'react';
import { Button, Modal, Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { parentApi } from '../api';
import { actionLabel, requestOutcome } from '../domain/optionalServices';
import { useAsyncAction } from '../hooks/useAsyncAction';
import type { OptionalFeeRequestAction, OptionalService } from '../types';
import { ErrorAlert } from '../ui';

/** Asks the school to start or stop a service, with an optional note. */
export function RequestServiceModal({
  studentId,
  service,
  action,
  onClose,
  onSent,
}: {
  studentId: string;
  service: OptionalService;
  action: OptionalFeeRequestAction;
  onClose: () => void;
  onSent: () => void;
}) {
  const [note, setNote] = useState('');
  const { busy, error, run } = useAsyncAction();

  const send = async () => {
    const sent = await run(
      () =>
        parentApi.requestOptionalService(studentId, {
          feeTypeId: service.feeTypeId,
          action,
          note: note.trim() || undefined,
        }),
      { failure: (err) => errorMessage(err, 'Could not send the request. Try again.') },
    );
    if (!sent) return;
    notifications.show({ message: 'Request sent. The school will review it.', color: 'green' });
    onSent();
  };

  return (
    <Modal opened onClose={onClose} title={actionLabel(action, service.name)} radius="lg" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          {requestOutcome(service, action)}
        </Text>
        <ErrorAlert>{error}</ErrorAlert>
        <Textarea
          label="Note for the school (optional)"
          placeholder={
            action === 'OPT_IN' ? 'For example, the pick-up area' : 'For example, the reason'
          }
          maxLength={500}
          autosize
          minRows={2}
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
        />
        <Button color="fastrackRed" loading={busy} onClick={send}>
          Send request
        </Button>
      </Stack>
    </Modal>
  );
}
