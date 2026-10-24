'use client';

import { useState } from 'react';
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage, setupApi, type Department, type SchoolClass, type StaffOption } from './api';

/** Adds a class, or edits `schoolClass` when given. Rendered only while open. */
export function ClassModal({
  schoolClass,
  departments,
  staff,
  onClose,
  onSaved,
}: {
  schoolClass?: SchoolClass;
  departments: Department[];
  staff: StaffOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [classCode, setClassCode] = useState(schoolClass?.classCode ?? '');
  const [className, setClassName] = useState(schoolClass?.className ?? '');
  const [departmentId, setDepartmentId] = useState<string | null>(
    schoolClass?.departmentId ?? null,
  );
  const [homeroomStaffId, setHomeroomStaffId] = useState<string | null>(
    schoolClass?.homeroomStaffId ?? null,
  );
  // Empty on a new class: the backend puts it after the last one.
  const [sequenceOrder, setSequenceOrder] = useState<number | string>(
    schoolClass?.sequenceOrder ?? '',
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      classCode: classCode.trim(),
      className: className.trim(),
      departmentId,
      homeroomStaffId,
      sequenceOrder: sequenceOrder === '' ? undefined : Number(sequenceOrder),
    };
    if (!input.classCode || !input.className) return;
    setSaving(true);
    try {
      if (schoolClass) await setupApi.updateClass(schoolClass.id, input);
      else await setupApi.createClass(input);
      notifications.show({
        title: schoolClass ? 'Class updated' : 'Class added',
        message: input.className,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not save the class',
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
      title={schoolClass ? `Edit ${schoolClass.className}` : 'Add class'}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Group grow align="flex-start">
            <TextInput
              label="Code"
              description="Used in student IDs and bills"
              placeholder="e.g. B4"
              value={classCode}
              onChange={(e) => setClassCode(e.currentTarget.value)}
              maxLength={20}
              required
              radius="md"
            />
            <TextInput
              label="Name"
              description="As parents see it"
              placeholder="e.g. Basic 4"
              value={className}
              onChange={(e) => setClassName(e.currentTarget.value)}
              maxLength={100}
              required
              radius="md"
            />
          </Group>
          <NumberInput
            label="Order"
            description="Promotion moves pupils to the class with the next number. Leave empty to put a new class last."
            placeholder="After the last class"
            min={0}
            allowDecimal={false}
            value={sequenceOrder}
            onChange={setSequenceOrder}
            radius="md"
          />
          <Select
            label="Department"
            placeholder="None"
            data={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={departmentId}
            onChange={setDepartmentId}
            clearable
            radius="md"
          />
          <Select
            label="Class teacher"
            placeholder="Not assigned"
            data={staff.map((s) => ({ value: s.id, label: s.name }))}
            value={homeroomStaffId}
            onChange={setHomeroomStaffId}
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
              {schoolClass ? 'Save changes' : 'Add class'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
