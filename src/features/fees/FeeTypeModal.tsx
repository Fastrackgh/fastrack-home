'use client';

import { useState } from 'react';
import { Button, Group, Modal, Stack, Switch, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { feesApi, type FeeType } from './api';

/** Creates a fee type, or edits `feeType` when given. Rendered only while open. */
export function FeeTypeModal({
  feeType,
  onClose,
  onSaved,
}: {
  feeType?: FeeType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(feeType?.name ?? '');
  const [description, setDescription] = useState(feeType?.description ?? '');
  const [isRecurring, setIsRecurring] = useState(feeType?.isRecurring ?? true);
  const [isOptional, setIsOptional] = useState(feeType?.isOptional ?? false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      isRecurring,
      isOptional,
    };
    if (!input.name) return;
    setSaving(true);
    try {
      if (feeType) await feesApi.updateFeeType(feeType.id, input);
      else await feesApi.createFeeType(input);
      notifications.show({
        title: feeType ? 'Fee type updated' : 'Fee type added',
        message: input.name,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not save the fee type',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={feeType ? 'Edit fee type' : 'Add fee type'}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g. Tuition Fee"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            required
            radius="md"
            id="input-fee-type-name"
          />
          <Textarea
            label="Description"
            placeholder="What the fee covers (optional)"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            radius="md"
          />
          <Switch
            label="Charged every term"
            description="Turn off for a one-off fee, such as an admission fee."
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.currentTarget.checked)}
            color="fastrackRed"
          />
          <Switch
            label="Optional"
            description="Billed only to students who opt in, such as bus transport."
            checked={isOptional}
            onChange={(e) => setIsOptional(e.currentTarget.checked)}
            color="fastrackRed"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving} radius="md">
              {feeType ? 'Save changes' : 'Add fee type'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
