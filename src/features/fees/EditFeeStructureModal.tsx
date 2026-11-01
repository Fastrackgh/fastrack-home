'use client';

import { useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Info } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { feesApi, type FeeStructure } from './api';
import { toCedis, toPesewas } from './money';

/** Changes one class's fee for one term. Rendered only while open. */
export function EditFeeStructureModal({
  structure,
  onClose,
  onSaved,
}: {
  structure: FeeStructure;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<number | ''>(toCedis(structure.amount));
  const [dueDate, setDueDate] = useState(structure.dueDate ?? '');
  const [penalty, setPenalty] = useState<number | ''>(
    structure.penalty > 0 ? toCedis(structure.penalty) : '',
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (toPesewas(amount) <= 0 || !dueDate) {
      notifications.show({
        title: 'Check the form',
        message: 'Enter an amount and a due date.',
        color: 'red',
      });
      return;
    }
    setSaving(true);
    try {
      await feesApi.updateFeeStructure(structure.id, {
        amount: toPesewas(amount),
        dueDate,
        penalty: toPesewas(penalty),
      });
      notifications.show({ title: 'Fee updated', message: structure.feeTypeName, color: 'green' });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not update the fee',
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
      title={`${structure.feeTypeName} · ${structure.className ?? '—'} · ${structure.termLabel ?? ''}`}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <NumberInput
            label="Amount (GHS)"
            decimalScale={2}
            min={0}
            thousandSeparator=","
            value={amount}
            onChange={(v) => setAmount(typeof v === 'number' ? v : '')}
            required
            radius="md"
            id="input-structure-amount"
          />
          <TextInput
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.currentTarget.value)}
            required
            radius="md"
          />
          <NumberInput
            label="Late penalty (GHS)"
            placeholder="None"
            decimalScale={2}
            min={0}
            value={penalty}
            onChange={(v) => setPenalty(typeof v === 'number' ? v : '')}
            radius="md"
          />
          <Alert icon={<Info size={16} />} color="blue" radius="md">
            <Text size="xs">Invoices already generated for this term are not changed.</Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving} radius="md">
              Save changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
