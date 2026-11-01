'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { ApiError, errorMessage } from '@/lib/api-client';
import { marksApi, type Item } from './marks-api';

/** Adds a class test to a component, or renames or re-dates one. */
export function ItemModal({
  sheetId,
  rowVersion,
  componentKey,
  componentLabel,
  defaultMax,
  numeric,
  next,
  item,
  onClose,
  onSaved,
  onStale,
}: {
  sheetId: string;
  rowVersion: number;
  componentKey: string;
  componentLabel: string;
  defaultMax: number;
  numeric: boolean;
  next: number;
  item?: Item;
  onClose: () => void;
  onSaved: (res: { rowVersion: number; items: Item[] }) => void;
  onStale: () => void;
}) {
  const [label, setLabel] = useState(item?.label ?? `Test ${next}`);
  const [maxRaw, setMaxRaw] = useState<number | string>(item?.maxRaw ?? defaultMax);
  const [takenOn, setTakenOn] = useState(item?.takenOn ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || (numeric && !(Number(maxRaw) > 0))) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        rowVersion,
        label: label.trim(),
        ...(numeric ? { maxRaw: Number(maxRaw) } : {}),
        takenOn: takenOn || undefined,
      };
      const res = item
        ? await marksApi.updateItem(sheetId, item.id, body)
        : await marksApi.addItem(sheetId, { ...body, componentKey, maxRaw: Number(maxRaw) });
      onSaved(res);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        notifications.show({
          color: 'orange',
          title: 'The sheet changed',
          message: 'It was reloaded; try again.',
        });
        onStale();
        return;
      }
      setError(errorMessage(err, 'Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={item ? `Edit ${item.label}` : `Add a test to ${componentLabel}`}
      radius="lg"
      centered
    >
      <form onSubmit={save}>
        <Stack gap="md">
          {error && <Alert color="red">{error}</Alert>}
          <TextInput
            label="Name"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            maxLength={60}
            required
            radius="md"
          />
          {numeric && (
            <NumberInput
              label="Marked out of"
              value={maxRaw}
              onChange={setMaxRaw}
              min={1}
              max={1000}
              decimalScale={2}
              required
              radius="md"
            />
          )}
          <TextInput
            label="Date taken"
            description="Pupils who joined after this date don't need a mark"
            type="date"
            value={takenOn}
            onChange={(e) => setTakenOn(e.currentTarget.value)}
            radius="md"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving} radius="md">
              {item ? 'Save' : 'Add test'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/** A head sends a submitted sheet back, saying what needs changing. */
export function ReturnModal({
  onClose,
  onReturn,
}: {
  onClose: () => void;
  onReturn: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal opened onClose={onClose} title="Return to the teacher" radius="lg" centered>
      <Stack gap="md">
        <Textarea
          label="What needs changing"
          description="The teacher sees this on the sheet"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={500}
          radius="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button
            color="orange"
            radius="md"
            disabled={!reason.trim()}
            onClick={() => onReturn(reason.trim())}
          >
            Return
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
