'use client';

import { useState } from 'react';
import { Button, Group, Modal, NumberInput, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { type DatesInput } from './api';

export interface DatesValue extends DatesInput {
  termSequence?: number;
}

/**
 * Adds or edits an academic year or term: its dates, whether it is the
 * current one and, for a term, its number. Rendered only while open.
 */
export function DatesModal({
  title,
  submitLabel,
  initial,
  kind,
  withSequence = false,
  bounds,
  note,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial?: DatesValue;
  /** Terms have a number (Term 1, Term 2, …); years don't. */
  /** What is being dated; it words the 'current' switch. */
  kind: 'year' | 'term';
  withSequence?: boolean;
  /** A term must fall inside its year. */
  bounds?: { startDate: string; endDate: string };
  /** A line under the dates, e.g. what adding a year creates. */
  note?: string;
  onClose: () => void;
  onSubmit: (value: DatesValue) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [termSequence, setTermSequence] = useState<number | string>(initial?.termSequence ?? 1);
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? false);
  const [saving, setSaving] = useState(false);
  // The backend refuses to untick the current one; another must be made current.
  const alreadyCurrent = !!initial?.isCurrent;

  const invalid =
    !startDate ||
    !endDate ||
    endDate < startDate ||
    (bounds && (startDate < bounds.startDate || endDate > bounds.endDate));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await onSubmit({
        startDate,
        endDate,
        isCurrent,
        ...(withSequence ? { termSequence: Number(termSequence) } : {}),
      });
    } catch (err) {
      notifications.show({
        title: 'Could not save',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={title} radius="lg" centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          {withSequence && (
            <NumberInput
              label="Term number"
              description="Term 1, Term 2, Term 3…"
              min={1}
              max={6}
              value={termSequence}
              onChange={setTermSequence}
              required
              radius="md"
            />
          )}
          <Group grow align="flex-start">
            <TextInput
              type="date"
              label="Starts"
              value={startDate}
              min={bounds?.startDate}
              max={bounds?.endDate}
              onChange={(e) => setStartDate(e.currentTarget.value)}
              required
              radius="md"
            />
            <TextInput
              type="date"
              label="Ends"
              value={endDate}
              min={startDate || bounds?.startDate}
              max={bounds?.endDate}
              onChange={(e) => setEndDate(e.currentTarget.value)}
              error={startDate && endDate && endDate < startDate ? 'Ends before it starts' : null}
              required
              radius="md"
            />
          </Group>
          {note && (
            <Text size="sm" c="dimmed">
              {note}
            </Text>
          )}
          <Switch
            label={
              kind === 'term' ? 'This is the current term' : 'This is the current academic year'
            }
            description={
              alreadyCurrent
                ? `To change it, make another ${kind} current instead.`
                : 'Bills, attendance and the calendar open on the current one. Only one can be current.'
            }
            checked={isCurrent}
            disabled={alreadyCurrent}
            onChange={(e) => setIsCurrent(e.currentTarget.checked)}
            color="fastrackRed"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              disabled={!!invalid}
              radius="md"
            >
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
