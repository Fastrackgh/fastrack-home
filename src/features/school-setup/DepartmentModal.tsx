'use client';

import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage, setupApi, type Department, type StaffOption } from './api';

/** Adds a department, or edits `department` when given. Rendered only while open. */
export function DepartmentModal({
  department,
  staff,
  onClose,
  onSaved,
}: {
  department?: Department;
  staff: StaffOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(department?.code ?? '');
  const [name, setName] = useState(department?.name ?? '');
  const [description, setDescription] = useState(department?.description ?? '');
  const [headStaffId, setHeadStaffId] = useState<string | null>(department?.headStaffId ?? null);
  const [sequenceOrder, setSequenceOrder] = useState<number | string>(
    department?.sequenceOrder ?? 0,
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      sequenceOrder: Number(sequenceOrder) || 0,
    };
    if (!input.code || !input.name) return;
    setSaving(true);
    try {
      if (department) await setupApi.updateDepartment(department.id, { ...input, headStaffId });
      else
        await setupApi.createDepartment({
          ...input,
          description: input.description || undefined,
          ...(headStaffId ? { headStaffId } : {}),
        });
      notifications.show({
        title: department ? 'Department updated' : 'Department added',
        message: input.name,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not save the department',
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
      title={department ? `Edit ${department.name}` : 'Add department'}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label="Code"
              placeholder="e.g. LP"
              value={code}
              onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
              maxLength={30}
              required
              radius="md"
            />
            <NumberInput
              label="Display order"
              description="Lower comes first"
              min={0}
              value={sequenceOrder}
              onChange={setSequenceOrder}
              radius="md"
            />
          </Group>
          <TextInput
            label="Name"
            placeholder="e.g. Lower Primary"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            required
            radius="md"
          />
          <Textarea
            label="Description"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            radius="md"
          />
          <Select
            label="Head of department"
            placeholder="No head yet"
            data={staff.map((s) => ({ value: s.id, label: s.name }))}
            value={headStaffId}
            onChange={setHeadStaffId}
            searchable
            clearable
            nothingFoundMessage="No teacher by that name"
            radius="md"
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving} radius="md">
              {department ? 'Save changes' : 'Add department'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
