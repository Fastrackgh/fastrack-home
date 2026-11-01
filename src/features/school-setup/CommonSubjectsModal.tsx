'use client';

import { useState } from 'react';
import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { setupApi, type Subject } from './api';
import { COMMON_SUBJECTS } from './common-subjects';

const key = (value: string) => value.trim().toLowerCase();

/**
 * Adds subjects from a starter list in one go. Subjects whose name or code the
 * school already has are left out, so it can be run again safely.
 */
export function CommonSubjectsModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: Subject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const names = new Set(existing.map((s) => key(s.subjectName)));
  const codes = new Set(existing.map((s) => key(s.subjectCode)));
  const groups = COMMON_SUBJECTS.map((g) => ({
    ...g,
    subjects: g.subjects.filter(
      (s) => !names.has(key(s.subjectName)) && !codes.has(key(s.subjectCode)),
    ),
  })).filter((g) => g.subjects.length > 0);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (code: string, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });

  const add = async () => {
    const picked = groups.flatMap((g) => g.subjects).filter((s) => chosen.has(s.subjectCode));
    setSaving(true);
    const failed: string[] = [];
    // One at a time, so a clash on one subject doesn't lose the others.
    for (const subject of picked) {
      try {
        await setupApi.createSubject(subject);
      } catch (err) {
        failed.push(`${subject.subjectName}: ${errorMessage(err, 'not added')}`);
      }
    }
    setSaving(false);
    const added = picked.length - failed.length;
    if (added > 0)
      notifications.show({
        title: `${added} subject${added === 1 ? '' : 's'} added`,
        message: 'Next, choose which classes take them.',
        color: 'green',
      });
    if (failed.length > 0)
      notifications.show({
        title: `${failed.length} not added`,
        message: failed.join('; '),
        color: 'red',
        autoClose: false,
      });
    onSaved();
  };

  return (
    <Modal opened onClose={onClose} title="Add common subjects" radius="lg" size="lg" centered>
      <Stack gap="md">
        {groups.length === 0 ? (
          <Text size="sm" c="dimmed">
            You already have every subject on these lists.
          </Text>
        ) : (
          groups.map((g) => {
            const all = g.subjects.every((s) => chosen.has(s.subjectCode));
            return (
              <Stack key={g.group} gap="xs">
                <Checkbox
                  label={<Text fw={700}>{g.group}</Text>}
                  checked={all}
                  indeterminate={!all && g.subjects.some((s) => chosen.has(s.subjectCode))}
                  onChange={(e) =>
                    g.subjects.forEach((s) => toggle(s.subjectCode, e.currentTarget.checked))
                  }
                  color="fastrackRed"
                />
                <Group gap="sm" pl="lg">
                  {g.subjects.map((s) => (
                    <Checkbox
                      key={s.subjectCode}
                      label={s.subjectName}
                      checked={chosen.has(s.subjectCode)}
                      onChange={(e) => toggle(s.subjectCode, e.currentTarget.checked)}
                      color="fastrackRed"
                      w={250}
                    />
                  ))}
                </Group>
              </Stack>
            );
          })
        )}
        <Text size="xs" c="dimmed">
          You can rename any of them afterwards.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
            Cancel
          </Button>
          <Button
            color="fastrackRed"
            radius="md"
            loading={saving}
            disabled={chosen.size === 0}
            onClick={add}
          >
            {chosen.size > 0 ? `Add ${chosen.size}` : 'Add'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
