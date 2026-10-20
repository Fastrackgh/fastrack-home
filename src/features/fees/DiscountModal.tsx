'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Info } from 'lucide-react';
import {
  DISCOUNT_TYPES,
  feesApi,
  type AcademicContext,
  type DiscountType,
  type FeeType,
} from './api';
import { toPesewas } from './money';
import { errorMessage } from './notify';

const WHOLE_BILL = 'all';
const EVERY_TERM = 'every';

/** Grants a student a discount. Rendered only while open. */
export function DiscountModal({
  studentOptions,
  feeTypes,
  terms,
  initialTermId,
  onClose,
  onSaved,
}: {
  studentOptions: { value: string; label: string }[];
  feeTypes: FeeType[];
  terms: AcademicContext[];
  initialTermId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [feeTypeId, setFeeTypeId] = useState(WHOLE_BILL);
  const [termId, setTermId] = useState(initialTermId ?? EVERY_TERM);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [value, setValue] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const percentage = discountType === 'percentage';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = percentage ? Number(value) : toPesewas(value);
    const problem = !studentId
      ? 'Choose a student.'
      : value === '' || amount <= 0
        ? 'Enter the discount.'
        : percentage && amount > 100
          ? 'A percentage discount cannot be more than 100%.'
          : null;
    if (problem || !studentId) {
      notifications.show({ title: 'Check the form', message: problem, color: 'red' });
      return;
    }
    setSaving(true);
    try {
      await feesApi.createDiscount({
        studentId,
        feeTypeId: feeTypeId === WHOLE_BILL ? undefined : feeTypeId,
        termId: termId === EVERY_TERM ? undefined : termId,
        discountType,
        value: amount,
        reason: reason.trim() || undefined,
      });
      notifications.show({
        title: 'Discount added',
        message: studentOptions.find((o) => o.value === studentId)?.label ?? '',
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not add the discount',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Add a student discount" size="lg" radius="lg" centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Select
            label="Student"
            placeholder="Search by student name or code"
            data={studentOptions}
            value={studentId}
            onChange={setStudentId}
            searchable
            required
            radius="md"
            id="select-discount-student"
          />
          <Grid gutter="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Applies to"
                data={[
                  { value: WHOLE_BILL, label: 'The whole bill' },
                  ...feeTypes.map((ft) => ({ value: ft.id, label: ft.name })),
                ]}
                value={feeTypeId}
                onChange={(v) => setFeeTypeId(v ?? WHOLE_BILL)}
                allowDeselect={false}
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Term"
                data={[
                  ...terms.map((t) => ({
                    value: t.termId,
                    label: `${t.yearLabel} · ${t.termLabel}`,
                  })),
                  { value: EVERY_TERM, label: 'Every term' },
                ]}
                value={termId}
                onChange={(v) => setTermId(v ?? EVERY_TERM)}
                allowDeselect={false}
                radius="md"
                id="select-discount-term"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Discount type"
                data={DISCOUNT_TYPES}
                value={discountType}
                onChange={(v) => v && setDiscountType(v as DiscountType)}
                allowDeselect={false}
                radius="md"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label={percentage ? 'Discount (%)' : 'Discount (GHS)'}
                placeholder={percentage ? 'e.g. 10' : '0.00'}
                decimalScale={2}
                min={0}
                max={percentage ? 100 : undefined}
                value={value}
                onChange={(v) => setValue(typeof v === 'number' ? v : '')}
                required
                radius="md"
                id="input-discount-value"
              />
            </Grid.Col>
          </Grid>
          <TextInput
            label="Reason"
            placeholder="e.g. Sibling discount"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            maxLength={255}
            radius="md"
          />
          <Alert icon={<Info size={16} />} color="blue" radius="md">
            <Text size="xs">
              The discount is applied when the student&apos;s invoice is generated. It never takes a
              fee below zero, and invoices already generated are not changed.
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
              id="btn-save-discount"
            >
              Add discount
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
