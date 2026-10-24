'use client';

import { useState } from 'react';
import { Autocomplete, Button, Group, Modal, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ApiError } from '@/lib/api-client';
import { errorMessage, setupApi, type Subject } from './api';
import { SUBJECT_CATEGORIES } from './common-subjects';

// The backend's rule; it upper-cases the code itself.
const CODE_PATTERN = /^[A-Za-z0-9-]{2,20}$/;
const CODE_RULE = 'Use 2–20 letters, digits or hyphens.';

/** Adds a subject to the catalogue, or edits `subject` when given. Rendered only while open. */
export function SubjectModal({
  subject,
  onClose,
  onSaved,
}: {
  subject?: Subject;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subjectCode, setSubjectCode] = useState(subject?.subjectCode ?? '');
  const [subjectName, setSubjectName] = useState(subject?.subjectName ?? '');
  const [shortName, setShortName] = useState(subject?.shortName ?? '');
  const [category, setCategory] = useState(subject?.category ?? '');
  const [isActive, setIsActive] = useState(subject?.isActive ?? true);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      shortName: shortName.trim() || null,
      category: category.trim() || null,
      ...(subject ? { isActive } : {}),
    };
    if (!input.subjectCode || !input.subjectName) return;
    if (!CODE_PATTERN.test(input.subjectCode)) {
      setCodeError(CODE_RULE);
      return;
    }
    setCodeError(null);
    setNameError(null);
    setSaving(true);
    try {
      if (subject) await setupApi.updateSubject(subject.id, input);
      else await setupApi.createSubject(input);
      notifications.show({
        title: subject ? 'Subject updated' : 'Subject added',
        message: input.subjectName,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      // Codes and names are unique in the school; show which one clashed by its field.
      if (err instanceof ApiError && err.statusCode === 400 && /code/i.test(err.message)) {
        setCodeError(err.message);
        return;
      }
      if (err instanceof ApiError && err.statusCode === 409) {
        if (/name/i.test(err.message)) setNameError(err.message);
        else setCodeError(err.message);
        return;
      }
      notifications.show({
        title: 'Could not save the subject',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!subject) return;
    setRemoving(true);
    try {
      await setupApi.deleteSubject(subject.id);
      notifications.show({
        title: 'Subject removed',
        message: subject.subjectName,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not remove the subject',
        message:
          err instanceof ApiError && err.statusCode === 409
            ? 'Classes or marks use it. Turn off "In use" instead, which keeps its history.'
            : errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={subject ? `Edit ${subject.subjectName}` : 'Add subject'}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <TextInput
            label="Name"
            description="One subject serves every class that takes it"
            placeholder="e.g. English Language"
            value={subjectName}
            onChange={(e) => {
              setSubjectName(e.currentTarget.value);
              setNameError(null);
            }}
            error={nameError}
            maxLength={100}
            required
            radius="md"
          />
          <Group grow align="flex-start">
            <TextInput
              label="Code"
              placeholder="e.g. ENG"
              value={subjectCode}
              onChange={(e) => {
                setSubjectCode(e.currentTarget.value);
                setCodeError(null);
              }}
              error={codeError}
              description="2–20 letters, digits or hyphens"
              maxLength={20}
              required
              radius="md"
            />
            <TextInput
              label="Short name"
              description="For narrow report columns"
              placeholder="e.g. English"
              value={shortName}
              onChange={(e) => setShortName(e.currentTarget.value)}
              maxLength={20}
              radius="md"
            />
          </Group>
          <Autocomplete
            label="Category"
            placeholder="Optional"
            data={SUBJECT_CATEGORIES}
            value={category}
            onChange={setCategory}
            maxLength={50}
            radius="md"
          />
          {subject && (
            <Switch
              label="In use"
              description="Turned off, it can't be added to classes; past reports keep it"
              checked={isActive}
              onChange={(e) => setIsActive(e.currentTarget.checked)}
              color="fastrackRed"
            />
          )}
          <Group justify="space-between" mt="sm">
            {subject && subject.classCount === 0 ? (
              <Button
                variant="subtle"
                color="red"
                radius="md"
                loading={removing}
                disabled={saving}
                onClick={remove}
              >
                Remove
              </Button>
            ) : (
              <Text size="xs" c="dimmed">
                {subject
                  ? `Taken by ${subject.classCount} class${subject.classCount === 1 ? '' : 'es'}`
                  : ''}
              </Text>
            )}
            <Group gap="sm">
              <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" color="fastrackRed" loading={saving} radius="md">
                {subject ? 'Save changes' : 'Add subject'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
