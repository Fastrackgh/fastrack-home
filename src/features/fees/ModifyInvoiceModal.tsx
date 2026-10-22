'use client';

import { useState } from 'react';
import { Button, Group, Modal, NumberInput, Stack, Table, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { feesApi, type Invoice } from './api';
import { formatGhs, sumPesewas, toCedis, toPesewas } from './money';
import { errorMessage } from './notify';

/**
 * Corrects the amounts on an issued bill. The Principal must give a reason,
 * which the backend keeps in the audit log; payments already made stay.
 */
export function ModifyInvoiceModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: (invoice: Invoice) => void;
}) {
  const items = invoice.lineItems ?? [];
  const [amounts, setAmounts] = useState<Record<string, number | string>>(
    Object.fromEntries(items.map((item) => [item.id, toCedis(item.amount)])),
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const pesewas = (id: string) => toPesewas(amounts[id] === '' ? 0 : amounts[id]);
  const total = sumPesewas(items, (item) => pesewas(item.id));
  const changed = items.some((item) => pesewas(item.id) !== item.amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed || !reason.trim()) return;
    setSaving(true);
    try {
      const updated = await feesApi.modifyInvoice(invoice.id, {
        reason: reason.trim(),
        lineItems: items.map((item) => ({
          feeTypeId: item.feeTypeId,
          amount: pesewas(item.id),
          description: item.feeTypeName,
        })),
      });
      notifications.show({
        title: 'Bill corrected',
        message: invoice.invoiceNumber,
        color: 'green',
      });
      onSaved(updated);
    } catch (err) {
      notifications.show({
        title: 'Could not correct the bill',
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
      title={`Correct bill ${invoice.invoiceNumber}`}
      radius="lg"
      centered
      size="lg"
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {invoice.studentName} · Payments already recorded stay on the bill.
          </Text>
          <Table verticalSpacing="xs">
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text size="sm">{item.feeTypeName}</Text>
                    <Text size="xs" c="dimmed">
                      Was {formatGhs(item.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td w={180}>
                    <NumberInput
                      aria-label={`${item.feeTypeName} amount in GHS`}
                      min={0}
                      decimalScale={2}
                      value={amounts[item.id]}
                      onChange={(v) => setAmounts({ ...amounts, [item.id]: v })}
                      prefix="GHS "
                      radius="md"
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              New fees total
            </Text>
            <Text size="sm" fw={700}>
              {formatGhs(total)}
            </Text>
          </Group>
          <Textarea
            label="Reason"
            description="Kept in the audit log"
            placeholder="e.g. Feeding charged in error; student brings lunch"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            required
            autosize
            minRows={2}
            radius="md"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              disabled={!changed || !reason.trim()}
              radius="md"
            >
              Save correction
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
