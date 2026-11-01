'use client';

import { useState } from 'react';
import { Button, Group, Modal, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { fieldSetter } from '@/lib/state';
import { staffApi, type StaffCategory, type StaffMember, type StaffUpdate } from './api';

const fromMember = (m: StaffMember): StaffUpdate => ({
  firstName: m.firstName,
  lastName: m.lastName,
  phone: m.phone ?? '',
  staffCode: m.staffCode ?? '',
  position: m.position ?? '',
  department: m.department ?? '',
  staffCategory: m.staffCategory ?? null,
});

/** Edits a staff member's name, contact and job details. The email (their sign-in) stays. */
export function EditStaffModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = fromMember(member);
  // Job details exist for teachers only; the backend ignores them for other roles.
  const isTeacher = member.role === 'TEACHER';
  const [draft, setDraft] = useState<StaffUpdate>(initial);
  const setField = fieldSetter(setDraft);
  const [saving, setSaving] = useState(false);

  const changedKeys = (Object.keys(draft) as (keyof StaffUpdate)[]).filter(
    (key) => (draft[key] ?? '') !== (initial[key] ?? ''),
  );

  const text = (key: Exclude<keyof StaffUpdate, 'staffCategory'>, label: string, max: number) => (
    <TextInput
      label={label}
      value={draft[key]}
      onChange={(e) => setField(key, e.currentTarget.value)}
      maxLength={max}
      required={key === 'firstName' || key === 'lastName'}
      radius="md"
    />
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.firstName.trim() || !draft.lastName.trim() || changedKeys.length === 0) return;
    setSaving(true);
    try {
      await staffApi.update(
        member.id,
        Object.fromEntries(
          changedKeys.map((key) => [
            key,
            key === 'staffCategory' ? draft[key] : String(draft[key]).trim(),
          ]),
        ),
      );
      notifications.show({
        title: 'Staff member updated',
        message: `${draft.firstName} ${draft.lastName}`,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not update the staff member',
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
      title={`Edit ${member.firstName} ${member.lastName}`}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <SimpleGrid cols={2}>
            {text('firstName', 'First name', 100)}
            {text('lastName', 'Last name', 100)}
            {text('phone', 'Phone', 50)}
            {isTeacher && text('staffCode', 'Staff code', 30)}
            {isTeacher && text('position', 'Position', 100)}
            {isTeacher && text('department', 'Department', 100)}
          </SimpleGrid>
          {isTeacher && (
            <Select
              label="Category"
              data={[
                { value: 'Teaching', label: 'Teaching' },
                { value: 'Non-Teaching', label: 'Non-teaching' },
              ]}
              value={draft.staffCategory}
              onChange={(v) => setField('staffCategory', (v as StaffCategory) ?? null)}
              placeholder="Not set"
              radius="md"
            />
          )}
          <TextInput
            label="Email"
            description="Used to sign in; can't be changed here"
            value={member.email}
            readOnly
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
              disabled={changedKeys.length === 0}
              radius="md"
            >
              Save changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
