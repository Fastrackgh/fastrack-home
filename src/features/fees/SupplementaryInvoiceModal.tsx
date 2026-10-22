'use client';

import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { feesApi, type AcademicContext, type FeeType } from './api';
import { toPesewas } from './money';
import { errorMessage } from './notify';

type Target = 'school' | 'class' | 'student';

/**
 * A one-off bill outside the term's fee structure, such as a mock exam fee or
 * an excursion, for the whole school, one class or one student.
 */
export function SupplementaryInvoiceModal({
  terms,
  currentTermId,
  feeTypes,
  classOptions,
  studentOptions,
  onClose,
  onGenerated,
}: {
  terms: AcademicContext[];
  currentTermId: string | null;
  feeTypes: FeeType[];
  classOptions: { value: string; label: string }[];
  studentOptions: { value: string; label: string }[];
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [termId, setTermId] = useState<string | null>(currentTermId);
  const [title, setTitle] = useState('');
  const [feeTypeId, setFeeTypeId] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('class');
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const ready =
    termId &&
    title.trim() &&
    feeTypeId &&
    (target === 'school' || (target === 'class' ? classId : studentId));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    try {
      const result = await feesApi.generateSupplementary({
        academicTermId: termId!,
        title: title.trim(),
        feeTypeId: feeTypeId!,
        ...(target === 'class' && classId ? { classId } : {}),
        ...(target === 'student' && studentId ? { studentId } : {}),
        ...(amount !== '' ? { amount: toPesewas(amount) } : {}),
        ...(dueDate ? { dueDate } : {}),
      });
      notifications.show({
        title: result.generatedCount > 0 ? 'Bills generated' : 'No bills generated',
        message:
          result.message || `Generated ${result.generatedCount}, skipped ${result.skippedCount}.`,
        color: result.generatedCount > 0 ? 'green' : 'yellow',
      });
      onGenerated();
    } catch (err) {
      notifications.show({
        title: 'Could not generate the bills',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Extra bill" radius="lg" centered size="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            A bill outside the term&apos;s fees, such as a mock exam fee or an excursion. Parents
            see it alongside the term bill.
          </Text>
          <Group grow align="flex-start">
            <Select
              label="Term"
              data={terms.map((t) => ({
                value: t.termId,
                label: `${t.yearLabel} · ${t.termLabel}`,
              }))}
              value={termId}
              onChange={setTermId}
              required
              radius="md"
            />
            <Select
              label="Fee type"
              data={feeTypes.map((t) => ({ value: t.id, label: t.name }))}
              value={feeTypeId}
              onChange={setFeeTypeId}
              searchable
              required
              radius="md"
            />
          </Group>
          <TextInput
            label="Title"
            placeholder="e.g. Mock Examination Fee"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            radius="md"
          />
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Bill
            </Text>
            <SegmentedControl
              value={target}
              onChange={(v) => setTarget(v as Target)}
              data={[
                { value: 'class', label: 'One class' },
                { value: 'student', label: 'One student' },
                { value: 'school', label: 'Whole school' },
              ]}
              radius="md"
            />
          </Stack>
          {target === 'class' && (
            <Select
              label="Class"
              data={classOptions}
              value={classId}
              onChange={setClassId}
              searchable
              required
              radius="md"
            />
          )}
          {target === 'student' && (
            <Select
              label="Student"
              data={studentOptions}
              value={studentId}
              onChange={setStudentId}
              searchable
              required
              radius="md"
            />
          )}
          <Group grow align="flex-start">
            <NumberInput
              label="Amount (GHS)"
              description="Leave empty to use the class's fee structure"
              min={0.01}
              decimalScale={2}
              value={amount}
              onChange={setAmount}
              radius="md"
            />
            <TextInput
              type="date"
              label="Due date"
              description="Optional"
              value={dueDate}
              onChange={(e) => setDueDate(e.currentTarget.value)}
              radius="md"
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              disabled={!ready}
              radius="md"
            >
              Generate bills
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
