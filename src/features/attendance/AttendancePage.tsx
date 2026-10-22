'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CheckCheck, RefreshCw, Save } from 'lucide-react';
import { addDays, formatDay, isWeekend, todayIso } from '@/features/calendar/dates';
import { ConfirmModal } from '@/features/fees/ConfirmModal';
import { errorMessage } from '@/features/fees/notify';
import { setupApi, type SchoolClass } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import {
  NO_ARRIVAL,
  STATUSES,
  attendanceApi,
  attendedRate,
  statusInfo,
  type AttendanceStatus,
  type Mark,
  type Register,
  type TermSummary,
} from './api';

type Draft = Record<string, { status: AttendanceStatus | null; arrivalTime: string; note: string }>;

const draftOf = (register: Register): Draft =>
  Object.fromEntries(
    register.students.map((s) => [
      s.studentId,
      { status: s.status, arrivalTime: s.arrivalTime ?? '', note: s.note ?? '' },
    ]),
  );

/** The latest weekday on or before `iso`, so the page opens on a markable day. */
function lastWeekday(iso: string) {
  let date = iso;
  while (isWeekend(date)) date = addDays(date, -1);
  return date;
}

function closedReason(register: Register) {
  const { reason, closureTitle } = register.schoolDay;
  if (reason === 'WEEKEND') return 'This day is a weekend.';
  if (reason === 'OUTSIDE_TERM') return 'This day is not in any academic term.';
  if (reason === 'CLOSURE')
    return `The school is closed${closureTitle ? ` (${closureTitle})` : ''}.`;
  return 'The school is closed on this day.';
}

/** Daily class registers, and each pupil's totals for the term. */
export function AttendancePage() {
  const { user, can } = useAuth();
  const today = todayIso();
  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [date, setDate] = useState(() => lastWeekday(today));
  const [view, setView] = useState<'register' | 'term'>('register');
  const [error, setError] = useState<string | null>(null);
  /** A class or date change waiting on "discard unsaved marks?". */
  const [pending, setPending] = useState<{ classId: string; date: string } | null>(null);

  const [register, setRegister] = useState<Register | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<TermSummary | null>(null);

  useEffect(() => {
    setupApi
      .allClasses()
      .then((rows) => {
        setClasses(rows);
        // A teacher starts on their own class; everyone else on the first.
        const own = rows.find((c) => c.homeroomStaffId && c.homeroomStaffId === user?.id);
        setClassId((own ?? rows[0])?.id ?? null);
      })
      .catch((err) => setError(errorMessage(err, 'Unable to load classes.')));
  }, [user?.id]);

  const loadRegister = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await attendanceApi.register(classId, date);
      setRegister(next);
      setDraft(draftOf(next));
    } catch (err) {
      setRegister(null);
      setError(errorMessage(err, 'Unable to load the register.'));
    } finally {
      setLoading(false);
    }
  }, [classId, date]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  // The term of the day on screen; the backend's "current" term may not contain today.
  const termId = register?.schoolDay.termId ?? null;
  useEffect(() => {
    if (view !== 'term' || !classId) return;
    setSummary(null);
    attendanceApi
      .summary(classId, termId)
      .then(setSummary)
      .catch((err) => setError(errorMessage(err, 'Unable to load term totals.')));
  }, [view, classId, termId]);

  const changed = useMemo<Mark[]>(() => {
    if (!register) return [];
    return register.students.flatMap((s) => {
      const d = draft[s.studentId];
      if (!d?.status) return [];
      const arrival = NO_ARRIVAL.includes(d.status) ? '' : d.arrivalTime;
      const same =
        d.status === s.status && arrival === (s.arrivalTime ?? '') && d.note === (s.note ?? '');
      if (same) return [];
      return [
        {
          studentId: s.studentId,
          status: d.status,
          ...(arrival ? { arrivalTime: arrival } : {}),
          ...(d.note.trim() ? { note: d.note.trim() } : {}),
        },
      ];
    });
  }, [register, draft]);

  const counts = useMemo(() => {
    const statuses = Object.values(draft).map((d) => d.status);
    const count = (status: AttendanceStatus) => statuses.filter((s) => s === status).length;
    return {
      present: count('Present'),
      late: count('Late'),
      halfDay: count('Half Day'),
      absent: count('Absent'),
      excused: count('Excused'),
      unmarked: statuses.filter((s) => !s).length,
    };
  }, [draft]);

  const choose = (next: { classId: string; date: string }) => {
    if (changed.length > 0) setPending(next);
    else apply(next);
  };
  const apply = (next: { classId: string; date: string }) => {
    setClassId(next.classId);
    setDate(next.date);
  };

  const update = (studentId: string, change: Partial<Draft[string]>) =>
    setDraft((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...change } }));

  const markRestPresent = () =>
    setDraft((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, d]) => [id, d.status ? d : { ...d, status: 'Present' }]),
      ),
    );

  const save = async () => {
    if (!register || changed.length === 0) return;
    setSaving(true);
    try {
      const next = await attendanceApi.mark(register.classId, register.date, changed);
      setRegister(next);
      setDraft(draftOf(next));
      notifications.show({
        title: 'Register saved',
        message: `${changed.length} ${changed.length === 1 ? 'mark' : 'marks'} saved for ${next.className}.`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Register not saved',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const editable = Boolean(register?.canMark && can('attendance:mark'));
  const needle = search.trim().toLowerCase();
  const rows = (register?.students ?? []).filter(
    (s) => !needle || `${s.name} ${s.studentCode ?? ''}`.toLowerCase().includes(needle),
  );

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Mark the daily register by class, and review each pupil's term totals."
        actions={
          <>
            <Button
              variant="default"
              leftSection={<RefreshCw size={15} />}
              onClick={loadRegister}
              disabled={!classId}
            >
              Refresh
            </Button>
            {view === 'register' && editable && (
              <Button
                color="fastrackRed"
                leftSection={<Save size={15} />}
                onClick={save}
                loading={saving}
                disabled={changed.length === 0}
              >
                Save register{changed.length > 0 ? ` (${changed.length})` : ''}
              </Button>
            )}
          </>
        }
      />

      <Card withBorder radius="lg" p="md">
        <Group gap="sm" wrap="wrap" align="flex-end">
          <Select
            label="Class"
            placeholder={classes ? 'No classes yet' : 'Loading…'}
            data={(classes ?? []).map((c) => ({ value: c.id, label: c.className }))}
            value={classId}
            onChange={(value) => value && choose({ classId: value, date })}
            searchable
            w={200}
          />
          {view === 'register' && (
            <TextInput
              label="Date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => {
                const value = e.currentTarget.value;
                if (value && classId) choose({ classId, date: value });
              }}
              w={170}
            />
          )}
          <SegmentedControl
            value={view}
            onChange={(value) => setView(value as 'register' | 'term')}
            data={[
              { label: 'Daily register', value: 'register' },
              { label: 'Term totals', value: 'term' },
            ]}
          />
        </Group>
      </Card>

      {error && (
        <Alert color="red" title="Something went wrong">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={loadRegister}>
              Try again
            </Button>
          </Stack>
        </Alert>
      )}

      {classes?.length === 0 && (
        <Alert color="blue" title="No classes yet">
          Add classes under School setup before marking attendance.
        </Alert>
      )}

      {view === 'register' && register && (
        <>
          {!register.schoolDay.open ? (
            <Alert color="gray" title={formatDay(register.date)}>
              {closedReason(register)} There is no register to mark.
            </Alert>
          ) : (
            !editable && (
              <Alert color="blue">
                You can view this register. Only the class teacher, or a school leader, can mark it.
              </Alert>
            )
          )}

          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
            {[
              { label: 'Present', value: counts.present, color: 'green' },
              { label: 'Late', value: counts.late, color: 'orange' },
              { label: 'Half day', value: counts.halfDay, color: 'yellow' },
              { label: 'Absent', value: counts.absent, color: 'red' },
              { label: 'Excused', value: counts.excused, color: 'blue' },
              { label: 'Not marked', value: counts.unmarked, color: 'gray' },
            ].map((stat) => (
              <Card key={stat.label} withBorder radius="lg" p="md">
                <Text
                  fw={800}
                  fz={24}
                  c={`${stat.color}.7`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {stat.value}
                </Text>
                <Text size="sm" c="dimmed">
                  {stat.label}
                </Text>
              </Card>
            ))}
          </SimpleGrid>

          <Card withBorder radius="lg" p="md">
            <Group justify="space-between" mb="sm" wrap="wrap">
              <div>
                <Text fw={700}>
                  {register.className} · {formatDay(register.date)}
                </Text>
                <Text size="xs" c="dimmed">
                  {register.students.length} active pupils
                </Text>
              </div>
              <Group gap="sm">
                <TextInput
                  placeholder="Search pupil…"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  w={220}
                />
                {editable && counts.unmarked > 0 && (
                  <Button
                    variant="light"
                    leftSection={<CheckCheck size={15} />}
                    onClick={markRestPresent}
                  >
                    Mark the rest present
                  </Button>
                )}
              </Group>
            </Group>
            <ScrollArea>
              <Table verticalSpacing="sm" style={{ minWidth: 860 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Pupil</Table.Th>
                    <Table.Th>Mark</Table.Th>
                    <Table.Th>Arrived</Table.Th>
                    <Table.Th>Note</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((student) => {
                    const d = draft[student.studentId];
                    const noArrival = !d?.status || NO_ARRIVAL.includes(d.status);
                    return (
                      <Table.Tr key={student.studentId}>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {student.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {student.studentCode ?? '—'}
                            {student.markedBy && ` · marked by ${student.markedBy}`}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {editable ? (
                            <SegmentedControl
                              size="xs"
                              value={d?.status ?? ''}
                              onChange={(value) =>
                                update(student.studentId, { status: value as AttendanceStatus })
                              }
                              data={STATUSES.map((s) => ({ label: s.label, value: s.value }))}
                              color={d?.status ? statusInfo(d.status).color : undefined}
                            />
                          ) : d?.status ? (
                            <Badge variant="light" color={statusInfo(d.status).color} tt="none">
                              {statusInfo(d.status).label}
                            </Badge>
                          ) : (
                            <Text size="sm" c="dimmed">
                              Not marked
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td w={120}>
                          {editable ? (
                            <TextInput
                              size="xs"
                              type="time"
                              aria-label={`Arrival time for ${student.name}`}
                              value={noArrival ? '' : (d?.arrivalTime ?? '')}
                              disabled={noArrival}
                              onChange={(e) =>
                                update(student.studentId, { arrivalTime: e.currentTarget.value })
                              }
                            />
                          ) : (
                            <Text size="sm">{student.arrivalTime ?? '—'}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {editable ? (
                            <TextInput
                              size="xs"
                              placeholder="Optional"
                              aria-label={`Note for ${student.name}`}
                              value={d?.note ?? ''}
                              maxLength={255}
                              onChange={(e) =>
                                update(student.studentId, { note: e.currentTarget.value })
                              }
                            />
                          ) : (
                            <Text size="sm">{student.note ?? '—'}</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          {register.students.length === 0
                            ? 'This class has no active pupils.'
                            : 'No pupils match your search.'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}

      {view === 'term' && classId && (
        <Card withBorder radius="lg" p="md">
          {!summary ? (
            <Group justify="center" py="xl">
              <Loader color="fastrackRed" />
            </Group>
          ) : (
            <>
              <Text fw={700}>Term totals</Text>
              <Text size="xs" c="dimmed" mb="sm">
                {summary.schoolDays} school days from {formatDay(summary.from)} to{' '}
                {formatDay(summary.to < summary.from ? summary.from : summary.to)}. Rates count
                marked days only.
              </Text>
              <ScrollArea>
                <Table verticalSpacing="xs" style={{ minWidth: 720 }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Pupil</Table.Th>
                      <Table.Th ta="right">Present</Table.Th>
                      <Table.Th ta="right">Late</Table.Th>
                      <Table.Th ta="right">Half day</Table.Th>
                      <Table.Th ta="right">Absent</Table.Th>
                      <Table.Th ta="right">Excused</Table.Th>
                      <Table.Th ta="right">Not marked</Table.Th>
                      <Table.Th ta="right">Attended</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {summary.students.map((s) => {
                      const rate = attendedRate(s);
                      return (
                        <Table.Tr key={s.studentId}>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {s.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {s.studentCode ?? '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">{s.present}</Table.Td>
                          <Table.Td ta="right">{s.late}</Table.Td>
                          <Table.Td ta="right">{s.halfDay}</Table.Td>
                          <Table.Td ta="right">{s.absent}</Table.Td>
                          <Table.Td ta="right">{s.excused}</Table.Td>
                          <Table.Td ta="right">{s.unmarked}</Table.Td>
                          <Table.Td ta="right" fw={700}>
                            {rate === null ? '—' : `${rate}%`}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                    {summary.students.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Text size="sm" c="dimmed" ta="center" py="xl">
                            This class has no active pupils.
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </>
          )}
        </Card>
      )}

      {view === 'register' && loading && !register && (
        <Group justify="center" py="xl">
          <Loader color="fastrackRed" />
        </Group>
      )}

      {pending && (
        <ConfirmModal
          title="Discard unsaved marks?"
          confirmLabel="Discard"
          onConfirm={async () => apply(pending)}
          onClose={() => setPending(null)}
        >
          You have {changed.length} unsaved {changed.length === 1 ? 'mark' : 'marks'} on this
          register. Save first if you want to keep them.
        </ConfirmModal>
      )}
    </>
  );
}
