'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Group, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { todayIso } from '@/features/calendar/dates';
import { ConfirmModal } from '@/features/fees/ConfirmModal';
import { setupApi, type SchoolClass } from '@/features/school-setup/api';
import {
  EXIT_STATUSES,
  STATUS_LABELS,
  errorMessage,
  studentsApi,
  type StudentDetail,
  type StudentStatus,
} from './api';

interface TermOption {
  value: string;
  label: string;
  isCurrent: boolean;
}

/** Class history, moving the student to another class, and recording that they left. */
export function EnrolmentTab({
  student,
  canPromote,
  canExit,
  onChanged,
}: {
  student: StudentDetail;
  canPromote: boolean;
  canExit: boolean;
  onChanged: () => void;
}) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [promoteTermId, setPromoteTermId] = useState<string | null>(null);
  const [exitTermId, setExitTermId] = useState<string | null>(null);
  const [exitDate, setExitDate] = useState(todayIso());
  const [exitStatus, setExitStatus] = useState<StudentStatus>('Graduated');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'promote' | 'exit' | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const active = student.status === 'Active';

  useEffect(() => {
    if (!canPromote && !canExit) return;
    Promise.all([setupApi.allClasses(), setupApi.listYears()])
      .then(([allClasses, years]) => {
        setClasses(allClasses);
        const options = years.flatMap((y) =>
          y.terms.map((t) => ({
            value: t.id,
            label: `${y.yearLabel} · ${t.termLabel}${t.isCurrent ? ' (current)' : ''}`,
            isCurrent: t.isCurrent,
          })),
        );
        setTerms(options);
        const current = options.find((t) => t.isCurrent)?.value ?? null;
        setPromoteTermId(current);
        setExitTermId(current);
      })
      .catch((err) =>
        notifications.show({
          title: 'Could not load classes and terms',
          message: errorMessage(err, 'Try again.'),
          color: 'red',
        }),
      );
  }, [canPromote, canExit]);

  const run = async (kind: 'promote' | 'exit', action: () => Promise<void>, done: string) => {
    setBusy(kind);
    try {
      await action();
      notifications.show({ title: done, message: student.fullName, color: 'green' });
      onChanged();
    } catch (err) {
      notifications.show({
        title: kind === 'promote' ? 'Could not move the student' : 'Could not record the exit',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p={0}>
        {student.history.length === 0 ? (
          <Text size="sm" c="dimmed" p="md">
            No class history yet.
          </Text>
        ) : (
          <Table verticalSpacing="xs" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Class</Table.Th>
                <Table.Th>Term</Table.Th>
                <Table.Th>From</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {student.history.map((e) => (
                <Table.Tr key={e.id}>
                  <Table.Td>{e.className}</Table.Td>
                  <Table.Td>{e.termLabel}</Table.Td>
                  <Table.Td>{e.enrolledOn ?? '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {canPromote && active && (
        <Card withBorder radius="md" p="md">
          <Text fw={600} mb={4}>
            Move to another class
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            For promotion or a change of class. Bills for the term follow the new class.
          </Text>
          <Group align="flex-end" grow>
            <Select
              label="New class"
              data={classes
                .filter((c) => c.id !== student.classId)
                .map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` }))}
              value={targetClassId}
              onChange={setTargetClassId}
              searchable
              radius="md"
            />
            <Select
              label="From term"
              data={terms}
              value={promoteTermId}
              onChange={setPromoteTermId}
              radius="md"
            />
            <Button
              color="fastrackRed"
              radius="md"
              disabled={!targetClassId || !promoteTermId}
              loading={busy === 'promote'}
              onClick={() =>
                run(
                  'promote',
                  () =>
                    studentsApi.promote(student.id, {
                      targetClassId: targetClassId!,
                      termId: promoteTermId!,
                    }),
                  'Class changed',
                )
              }
            >
              Move student
            </Button>
          </Group>
        </Card>
      )}

      {canExit && active && (
        <Card withBorder radius="md" p="md">
          <Text fw={600} mb={4}>
            Record that the student left
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            They stop being billed from the chosen term. Their records are kept.
          </Text>
          <Stack gap="sm">
            <Group grow align="flex-start">
              <Select
                label="Outcome"
                data={EXIT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                value={exitStatus}
                onChange={(v) => v && setExitStatus(v as StudentStatus)}
                allowDeselect={false}
                radius="md"
              />
              <Select
                label="Term"
                data={terms}
                value={exitTermId}
                onChange={setExitTermId}
                radius="md"
              />
              <TextInput
                type="date"
                label="Date left"
                value={exitDate}
                onChange={(e) => setExitDate(e.currentTarget.value)}
                radius="md"
              />
            </Group>
            <TextInput
              label="Reason"
              placeholder="Optional, e.g. relocated to Kumasi"
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              maxLength={255}
              radius="md"
            />
            <Group justify="flex-end">
              <Button
                color="red"
                variant="light"
                radius="md"
                disabled={!exitTermId || !exitDate}
                loading={busy === 'exit'}
                onClick={() => setConfirmExit(true)}
              >
                Record exit
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {confirmExit && (
        <ConfirmModal
          title={`Record that ${student.fullName} left?`}
          confirmLabel="Record exit"
          onClose={() => setConfirmExit(false)}
          onConfirm={() =>
            run(
              'exit',
              () =>
                studentsApi.recordExit(student.id, {
                  academicTermId: exitTermId!,
                  exitDate,
                  status: exitStatus,
                  ...(reason.trim() ? { reason: reason.trim() } : {}),
                }),
              'Exit recorded',
            )
          }
        >
          They will be marked {STATUS_LABELS[exitStatus].toLowerCase()} and stop being billed. This
          can&apos;t be undone here.
        </ConfirmModal>
      )}
    </Stack>
  );
}
