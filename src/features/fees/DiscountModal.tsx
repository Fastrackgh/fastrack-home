'use client';

import { useEffect, useState } from 'react';
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
import { errorMessage } from '@/lib/api-client';
import { termOption, type TermInYear } from '@/features/school-setup/api';
import {
  DISCOUNT_TYPES,
  existingDiscounts,
  feesApi,
  type Discount,
  type DiscountType,
  type FeeType,
} from './api';
import { discountLabel } from './DiscountsTab';
import { toPesewas } from './money';
import { StudentPicker } from './StudentPicker';

const WHOLE_BILL = 'all';
const EVERY_TERM = 'every';

/** Grants a student a discount. Rendered only while open. */
export function DiscountModal({
  feeTypes,
  terms,
  initialTermId,
  onClose,
  onSaved,
}: {
  feeTypes: FeeType[];
  terms: TermInYear[];
  initialTermId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [feeTypeId, setFeeTypeId] = useState(WHOLE_BILL);
  const [termId, setTermId] = useState(initialTermId ?? EVERY_TERM);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [value, setValue] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  // Discounts the student already has for this fee type and term: replace, or keep both (QA-043).
  const [already, setAlready] = useState<Discount[] | null>(null);
  useEffect(() => setAlready(null), [studentId, feeTypeId, termId]);

  const percentage = discountType === 'percentage';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void save();
  };

  const save = async (onExisting?: 'replace' | 'keep') => {
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
        onExisting,
      });
      notifications.show({
        title: onExisting === 'replace' ? 'Discount replaced' : 'Discount added',
        message:
          onExisting === 'keep'
            ? `${studentName}: ${(already?.length ?? 0) + 1} discounts now apply.`
            : studentName,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      const existing = existingDiscounts(err);
      if (existing) {
        setAlready(existing);
        return;
      }
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
          <StudentPicker
            label="Student"
            placeholder="Search by student name or code"
            value={studentId}
            onChange={(id, picked) => {
              setStudentId(id);
              setStudentName(picked?.label ?? '');
            }}
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
                data={[...terms.map(termOption), { value: EVERY_TERM, label: 'Every term' }]}
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
          {already ? (
            <Alert color="yellow" radius="md" title="Already has a discount" id="alert-discount-exists">
              <Stack gap="sm">
                <Text size="sm">
                  {studentName || 'This student'} already has{' '}
                  {already.map((d, i) => (
                    <span key={d.id}>
                      {i ? ' and ' : ''}
                      <b>{discountLabel(d)}</b>
                      {d.reason ? ` (${d.reason})` : ''}
                    </span>
                  ))}{' '}
                  for {feeTypeId === WHOLE_BILL ? 'the whole bill' : 'this fee'},{' '}
                  {termId === EVERY_TERM ? 'every term' : 'this term'}. Replace it, or keep both?
                  Both apply to the bill, never taking it below zero.
                </Text>
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setAlready(null)} disabled={saving} radius="md">
                    Back
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => void save('keep')}
                    loading={saving}
                    radius="md"
                    id="btn-discount-keep"
                  >
                    Keep both
                  </Button>
                  <Button
                    color="fastrackRed"
                    onClick={() => void save('replace')}
                    loading={saving}
                    radius="md"
                    id="btn-discount-replace"
                  >
                    Replace it
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
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
          )}
        </Stack>
      </form>
    </Modal>
  );
}
