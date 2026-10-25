'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import {
  setupApi,
  type AggregateRole,
  type ClassSubject,
  type SchoolClass,
  type StaffOption,
  type Subject,
} from './api';

interface Row {
  subjectId: string;
  subjectName: string;
  reportLabel: string;
  countsInAverage: boolean;
  aggregateRole: AggregateRole;
  teacherIds: string[];
}

const AGGREGATE_OPTIONS = [
  { value: 'none', label: 'Not counted' },
  { value: 'core', label: 'Always counted' },
  { value: 'pool', label: 'Best of the rest' },
];

/**
 * Edits the subjects one class takes, their order on the report and who
 * teaches them. The list stands for every term until changed again.
 */
export function ClassSubjectsModal({
  schoolClass,
  current,
  catalogue,
  staff,
  onClose,
  onSaved,
}: {
  schoolClass: SchoolClass;
  current: ClassSubject[];
  catalogue: Subject[];
  staff: StaffOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(
    current.map((c) => ({
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      reportLabel: c.reportLabel ?? '',
      countsInAverage: c.countsInAverage,
      aggregateRole: c.aggregateRole,
      teacherIds: c.teachers.map((t) => t.id),
    })),
  );
  // Report options stay out of the way unless the class already uses them.
  const [showOptions, setShowOptions] = useState(
    current.some((c) => c.reportLabel || !c.countsInAverage || c.aggregateRole !== 'none'),
  );
  const [saving, setSaving] = useState(false);

  // Subjects turned off since the class took them; the school may want to remove them.
  const inactive = new Set(catalogue.filter((s) => !s.isActive).map((s) => s.id));
  const addable = catalogue.filter((s) => s.isActive && !rows.some((r) => r.subjectId === s.id));
  // Teachers no longer on the staff list still show, so saving doesn't silently drop them.
  const teacherOptions = [
    ...staff,
    ...current.flatMap((c) => c.teachers).filter((t) => !staff.some((s) => s.id === t.id)),
  ]
    .filter((t, i, all) => all.findIndex((o) => o.id === t.id) === i)
    .map((t) => ({ value: t.id, label: t.name }));

  const update = (index: number, change: Partial<Row>) =>
    setRows((list) => list.map((row, i) => (i === index ? { ...row, ...change } : row)));
  const move = (index: number, by: -1 | 1) =>
    setRows((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await setupApi.saveClassSubjects(
        schoolClass.id,
        rows.map((row, i) => ({
          subjectId: row.subjectId,
          sequenceOrder: i + 1,
          reportLabel: row.reportLabel.trim() || null,
          countsInAverage: row.countsInAverage,
          aggregateRole: row.aggregateRole,
          teacherIds: row.teacherIds,
        })),
      );
      notifications.show({
        title: 'Subjects saved',
        message: `${schoolClass.className} takes ${rows.length} subject${rows.length === 1 ? '' : 's'}`,
        color: 'green',
      });
      onSaved();
    } catch (err) {
      notifications.show({
        title: 'Could not save the subjects',
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
      title={`Subjects for ${schoolClass.className}`}
      radius="lg"
      size="xl"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Pupils in {schoolClass.className} take these subjects every term until you change them.
          With no teacher chosen, any teacher can enter that subject&apos;s marks.
        </Text>
        <Group justify="space-between" align="flex-end">
          <Select
            label="Add a subject"
            placeholder={addable.length ? 'Choose a subject' : 'Every subject is already added'}
            data={addable.map((s) => ({ value: s.id, label: s.subjectName }))}
            value={null}
            onChange={(subjectId) => {
              const subject = catalogue.find((s) => s.id === subjectId);
              if (!subject) return;
              setRows((list) => [
                ...list,
                {
                  subjectId: subject.id,
                  subjectName: subject.subjectName,
                  reportLabel: '',
                  countsInAverage: true,
                  aggregateRole: 'none',
                  teacherIds: [],
                },
              ]);
            }}
            disabled={addable.length === 0}
            searchable
            nothingFoundMessage="No subject by that name"
            radius="md"
            w={300}
          />
          <Switch
            label="Report options"
            checked={showOptions}
            onChange={(e) => setShowOptions(e.currentTarget.checked)}
            color="fastrackRed"
          />
        </Group>

        {rows.length === 0 ? (
          <Text ta="center" c="dimmed" py="lg">
            No subjects yet. Add the ones this class takes.
          </Text>
        ) : (
          <Table verticalSpacing="xs" horizontalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={64} />
                <Table.Th>Subject</Table.Th>
                <Table.Th>Teachers</Table.Th>
                {showOptions && (
                  <>
                    <Table.Th>Name on report</Table.Th>
                    <Table.Th>In average</Table.Th>
                    <Table.Th>Aggregate</Table.Th>
                  </>
                )}
                <Table.Th w={36} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row, i) => (
                <Table.Tr key={row.subjectId}>
                  <Table.Td>
                    <Group gap={2} wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Move ${row.subjectName} up`}
                      >
                        <ArrowUp size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        disabled={i === rows.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Move ${row.subjectName} down`}
                      >
                        <ArrowDown size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {row.subjectName}
                    </Text>
                    {inactive.has(row.subjectId) && (
                      <Badge size="xs" variant="light" color="gray">
                        Not in use
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td miw={200}>
                    <MultiSelect
                      aria-label={`Teachers for ${row.subjectName}`}
                      placeholder={row.teacherIds.length ? undefined : 'Any teacher'}
                      data={teacherOptions}
                      value={row.teacherIds}
                      onChange={(teacherIds) => update(i, { teacherIds })}
                      searchable
                      nothingFoundMessage="No teacher by that name"
                      size="xs"
                      radius="md"
                    />
                  </Table.Td>
                  {showOptions && (
                    <>
                      <Table.Td>
                        <TextInput
                          aria-label={`Name on report for ${row.subjectName}`}
                          placeholder={row.subjectName}
                          value={row.reportLabel}
                          onChange={(e) => update(i, { reportLabel: e.currentTarget.value })}
                          maxLength={100}
                          size="xs"
                          radius="md"
                          miw={140}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Checkbox
                          aria-label={`Count ${row.subjectName} in the average`}
                          checked={row.countsInAverage}
                          onChange={(e) => update(i, { countsInAverage: e.currentTarget.checked })}
                          color="fastrackRed"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          aria-label={`Aggregate for ${row.subjectName}`}
                          data={AGGREGATE_OPTIONS}
                          value={row.aggregateRole}
                          onChange={(v) =>
                            update(i, { aggregateRole: (v as AggregateRole) ?? 'none' })
                          }
                          allowDeselect={false}
                          size="xs"
                          radius="md"
                          w={150}
                        />
                      </Table.Td>
                    </>
                  )}
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                      aria-label={`Remove ${row.subjectName}`}
                    >
                      <X size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        {showOptions && (
          <Text size="xs" c="dimmed">
            Aggregate is for BECE-style results: subjects marked &quot;Always counted&quot; are
            added up with the best of the rest, and a lower aggregate is better.
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
            Cancel
          </Button>
          <Button color="fastrackRed" radius="md" loading={saving} onClick={save}>
            Save subjects
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
