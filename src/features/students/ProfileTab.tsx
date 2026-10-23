'use client';

import { useState } from 'react';
import {
  Button,
  Divider,
  Group,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PROFILE_FIELDS, errorMessage, studentsApi, type Profile, type StudentDetail } from './api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC'];

/** The student's personal and health details; editable with `students:update`. Contacts live in the Guardians tab. */
export function ProfileTab({
  student,
  canEdit,
  onSaved,
}: {
  student: StudentDetail;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Profile>(student.profile);
  const [saving, setSaving] = useState(false);

  const changed = PROFILE_FIELDS.filter((f) => draft[f].trim() !== student.profile[f]);

  const text = (field: keyof Profile, label: string, extra: object = {}) => (
    <TextInput
      label={label}
      value={draft[field]}
      onChange={(e) => setDraft({ ...draft, [field]: e.currentTarget.value })}
      readOnly={!canEdit}
      radius="md"
      {...extra}
    />
  );
  const choice = (field: keyof Profile, label: string, data: string[]) => (
    <Select
      label={label}
      data={data}
      value={draft[field] || null}
      onChange={(v) => setDraft({ ...draft, [field]: v ?? '' })}
      readOnly={!canEdit}
      clearable={field !== 'gender'}
      placeholder="Not recorded"
      radius="md"
    />
  );

  const save = async () => {
    if (!draft.firstName.trim() || !draft.surname.trim()) return;
    setSaving(true);
    try {
      await studentsApi.update(
        student.id,
        Object.fromEntries(changed.map((f) => [f, draft[f]])) as Partial<Profile>,
      );
      notifications.show({ title: 'Student updated', message: student.fullName, color: 'green' });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not update the student',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {text('firstName', 'First name', { required: true, maxLength: 100 })}
        {text('otherName', 'Other name', { maxLength: 100 })}
        {text('surname', 'Surname', { required: true, maxLength: 100 })}
        {choice('gender', 'Gender', ['Male', 'Female'])}
        {text('birthDate', 'Date of birth', { type: 'date' })}
        {text('nationalId', 'National ID / birth cert. no.', { maxLength: 50 })}
        {text('nationality', 'Nationality', { maxLength: 100 })}
        {text('religion', 'Religion', { maxLength: 100 })}
        {text('digitalAddress', 'Digital address', { maxLength: 50 })}
      </SimpleGrid>
      {text('residence', 'Residence')}

      <Divider label="Health" labelPosition="left" />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {choice('bloodGroup', 'Blood group', BLOOD_GROUPS)}
        {choice('genotype', 'Genotype', GENOTYPES)}
      </SimpleGrid>
      <Textarea
        label="Allergies and medical notes"
        value={draft.allergiesMedicalNotes}
        onChange={(e) => setDraft({ ...draft, allergiesMedicalNotes: e.currentTarget.value })}
        readOnly={!canEdit}
        autosize
        minRows={2}
        radius="md"
      />

      {canEdit && (
        <Group justify="flex-end">
          <Button
            variant="default"
            radius="md"
            disabled={saving || changed.length === 0}
            onClick={() => setDraft(student.profile)}
          >
            Undo changes
          </Button>
          <Button
            color="fastrackRed"
            radius="md"
            loading={saving}
            disabled={changed.length === 0 || !draft.firstName.trim() || !draft.surname.trim()}
            onClick={save}
          >
            Save changes
          </Button>
        </Group>
      )}
    </Stack>
  );
}
