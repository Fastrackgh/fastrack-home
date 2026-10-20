'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Grid,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Info, PlusCircle, Trash2 } from 'lucide-react';
import { feesApi, type AcademicContext, type FeeType } from './api';
import { toPesewas } from './money';
import { errorMessage } from './notify';

interface Row {
  key: number;
  feeTypeId: string | null;
  /** Cedis, as typed. */
  amount: number | '';
  dueDate: string;
  penalty: number | '';
}

let nextKey = 0;
const emptyRow = (dueDate = ''): Row => ({
  key: nextKey++,
  feeTypeId: null,
  amount: '',
  dueDate,
  penalty: '',
});

/**
 * Sets one or more fees for the chosen classes in one term. Rendered only
 * while open, so every use starts from an empty form.
 */
export function FeeStructureModal({
  terms,
  initialTermId,
  classOptions,
  feeTypes,
  onClose,
  onSaved,
}: {
  terms: AcademicContext[];
  initialTermId: string | null;
  classOptions: { value: string; label: string }[];
  feeTypes: FeeType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [termId, setTermId] = useState(initialTermId);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [saving, setSaving] = useState(false);

  const term = terms.find((t) => t.termId === termId) ?? null;
  const update = (key: number, change: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const problem = (): string | null => {
    if (!term) return 'Choose a term.';
    if (classIds.length === 0) return 'Choose at least one class.';
    const ids = rows.map((row) => row.feeTypeId);
    if (ids.some((id) => !id)) return 'Choose a fee type on every line.';
    if (new Set(ids).size !== ids.length) return 'Each fee type can appear only once.';
    if (rows.some((row) => toPesewas(row.amount) <= 0)) return 'Enter an amount on every line.';
    if (rows.some((row) => !row.dueDate)) return 'Enter a due date on every line.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = problem();
    if (message || !term) {
      notifications.show({ title: 'Check the form', message, color: 'red' });
      return;
    }
    setSaving(true);
    try {
      const saved = await feesApi.createFeeStructures({
        term,
        classIds,
        items: rows.map((row) => ({
          feeTypeId: row.feeTypeId!,
          amount: toPesewas(row.amount),
          dueDate: row.dueDate,
          penalty: toPesewas(row.penalty),
        })),
      });
      notifications.show({
        title: 'Fees saved',
        message: `${saved.length} fee ${saved.length === 1 ? 'entry' : 'entries'} set for ${term.yearLabel} · ${term.termLabel}.`,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not save the fees',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Set fees for classes" size="xl" radius="lg" centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Select
                label="Term"
                data={terms.map((t) => ({
                  value: t.termId,
                  label: `${t.yearLabel} · ${t.termLabel}`,
                }))}
                value={termId}
                onChange={setTermId}
                allowDeselect={false}
                required
                radius="md"
                id="select-structure-term"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <MultiSelect
                label="Classes"
                placeholder={classIds.length ? undefined : 'Choose classes'}
                data={classOptions}
                value={classIds}
                onChange={setClassIds}
                searchable
                required
                radius="md"
                id="select-structure-classes"
              />
              <Button
                variant="subtle"
                size="compact-xs"
                mt={4}
                onClick={() => setClassIds(classOptions.map((c) => c.value))}
              >
                Select all classes
              </Button>
            </Grid.Col>
          </Grid>

          <Stack gap="xs">
            {rows.map((row, index) => (
              <Grid key={row.key} gutter="sm" align="flex-end">
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    label={index === 0 ? 'Fee type' : undefined}
                    placeholder="Choose a fee type"
                    data={feeTypes.map((ft) => ({
                      value: ft.id,
                      label: ft.isOptional ? `${ft.name} (optional)` : ft.name,
                    }))}
                    value={row.feeTypeId}
                    onChange={(feeTypeId) => update(row.key, { feeTypeId })}
                    searchable
                    radius="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 2.5 }}>
                  <NumberInput
                    label={index === 0 ? 'Amount (GHS)' : undefined}
                    placeholder="0.00"
                    decimalScale={2}
                    min={0}
                    thousandSeparator=","
                    value={row.amount}
                    onChange={(v) => update(row.key, { amount: typeof v === 'number' ? v : '' })}
                    radius="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 6, sm: 2.5 }}>
                  <TextInput
                    label={index === 0 ? 'Due date' : undefined}
                    type="date"
                    value={row.dueDate}
                    onChange={(e) => update(row.key, { dueDate: e.currentTarget.value })}
                    radius="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 10, sm: 2.25 }}>
                  <NumberInput
                    label={index === 0 ? 'Late penalty (GHS)' : undefined}
                    placeholder="None"
                    decimalScale={2}
                    min={0}
                    value={row.penalty}
                    onChange={(v) => update(row.key, { penalty: typeof v === 'number' ? v : '' })}
                    radius="md"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 2, sm: 0.75 }}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="lg"
                    aria-label="Remove this fee"
                    disabled={rows.length === 1}
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Grid.Col>
              </Grid>
            ))}
            <Group>
              <Button
                variant="light"
                size="xs"
                leftSection={<PlusCircle size={14} />}
                onClick={() =>
                  setRows((current) => [...current, emptyRow(current.at(-1)?.dueDate)])
                }
              >
                Add another fee
              </Button>
            </Group>
          </Stack>

          <Alert icon={<Info size={16} />} color="blue" radius="md">
            <Text size="xs">
              If a class already has one of these fees for the term, its amount is replaced.
              Invoices already generated for the term are not changed.
            </Text>
          </Alert>

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              radius="md"
              id="btn-save-structures"
            >
              Save fees
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
