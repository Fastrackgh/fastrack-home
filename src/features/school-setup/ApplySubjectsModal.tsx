'use client';

import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  MultiSelect,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage, setupApi, type Department, type SchoolClass, type Subject } from './api';

/**
 * Adds subjects to many classes at once, e.g. English for every class in
 * Lower Primary. Classes that already take a subject keep their settings.
 */
export function ApplySubjectsModal({
  catalogue,
  departments,
  classes,
  onClose,
  onSaved,
}: {
  catalogue: Subject[];
  departments: Department[];
  classes: SchoolClass[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [target, setTarget] = useState<'department' | 'classes'>(
    departments.length ? 'department' : 'classes',
  );
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const ready =
    subjectIds.length > 0 && (target === 'department' ? !!departmentId : classIds.length > 0);

  const apply = async () => {
    setSaving(true);
    try {
      const result = await setupApi.applySubjects(
        target === 'department'
          ? { subjectIds, departmentId: departmentId! }
          : { subjectIds, classIds },
      );
      notifications.show({
        title: result?.added ? 'Subjects added' : 'Nothing new to add',
        message:
          `${result?.added ?? 0} added` +
          (result?.alreadyThere
            ? `; ${result.alreadyThere} ${result.alreadyThere === 1 ? 'was' : 'were'} already there`
            : ''),
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not add the subjects',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Add subjects to several classes" radius="lg" centered>
      <Stack gap="md">
        <MultiSelect
          label="Subjects"
          placeholder={subjectIds.length ? undefined : 'Choose subjects'}
          data={catalogue
            .filter((s) => s.isActive)
            .map((s) => ({ value: s.id, label: s.subjectName }))}
          value={subjectIds}
          onChange={setSubjectIds}
          searchable
          radius="md"
        />
        {departments.length > 0 && (
          <SegmentedControl
            value={target}
            onChange={(v) => setTarget(v as typeof target)}
            data={[
              { value: 'department', label: 'A whole department' },
              { value: 'classes', label: 'Chosen classes' },
            ]}
            color="fastrackRed"
            radius="md"
          />
        )}
        {target === 'department' ? (
          <Select
            label="Department"
            placeholder="Choose a department"
            data={departments.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.classCount} class${d.classCount === 1 ? '' : 'es'})`,
            }))}
            value={departmentId}
            onChange={setDepartmentId}
            radius="md"
          />
        ) : (
          <MultiSelect
            label="Classes"
            placeholder={classIds.length ? undefined : 'Choose classes'}
            data={classes.map((c) => ({ value: c.id, label: c.className }))}
            value={classIds}
            onChange={setClassIds}
            searchable
            radius="md"
          />
        )}
        <Text size="xs" c="dimmed">
          Teachers can be chosen per class afterwards. Until then any teacher can enter the marks.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
            Cancel
          </Button>
          <Button
            color="fastrackRed"
            radius="md"
            loading={saving}
            disabled={!ready}
            onClick={apply}
          >
            Add subjects
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
