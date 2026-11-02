'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  ArrowUpCircle,
  CloudOff,
  Filter,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { setupApi, type CurrentTerm } from '@/features/school-setup/api';
import { type StudentRow } from '@/features/students/api';
import { activeStudents, studentsPage } from '@/features/students/offline-list';
import { offlineClassesFor } from '@/features/attendance/sync';
import { isUnreachable } from '@/lib/api-client';
import { AdmitStudentModal } from '@/features/students/AdmitStudentModal';
import {
  ADMISSIONS_COLLECTION,
  pendingAdmissions,
  pendingRow,
} from '@/features/students/admissions-sync';
import { onSyncApplied } from '@/lib/offline/syncEngine';
import { useSyncStatus } from '@/lib/offline/useSyncStatus';
import { StudentDrawer } from '@/features/students/StudentDrawer';
import { PAGE_SIZE } from '@/lib/pagination';
import { PageHeader } from '@/features/workspace';
import { notifyLoadError } from '@/features/fees/notify';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES, canAccessRoute, dataScopeOf } from '@/lib/rbac';

interface SchoolClass {
  id: string;
  classCode: string;
  className: string;
}

export default function StudentsPage() {
  const { user, can } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  /** Pupils admitted on this device and not yet synced: listed first, with no code yet (sync §9.2). */
  const [admittedHere, setAdmittedHere] = useState<(StudentRow & { pending?: true })[]>([]);
  const { pending: queued } = useSyncStatus();
  useEffect(() => {
    pendingAdmissions().then(
      (list) => setAdmittedHere(list.map(pendingRow)),
      () => setAdmittedHere([]),
    );
  }, [queued]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicContext, setAcademicContext] = useState<CurrentTerm | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState('');
  // One request once typing pauses, not one per keystroke (QA-038, QA-264).
  const [search] = useDebouncedValue(query.trim(), 300);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const filtered = !!search || (!!gradeFilter && gradeFilter !== 'all') || statusFilter !== 'All';
  // A teacher sees only the pupils of classes they teach (QA-016).
  const isTeacher = !!user && dataScopeOf(user.role) === 'assigned_classes';
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listOffline, setListOffline] = useState(false);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);

  const [admitOpened, { open: openAdmit, close: closeAdmit }] = useDisclosure(false);
  // A new key per opening, so each admission starts from an empty form.
  const [admission, setAdmission] = useState(0);

  // Fetch initial classes and academic context
  useEffect(() => {
    async function loadPrerequisites() {
      // Each part shows on its own; a failure of either is reported, not swallowed.
      if (!user) return;
      const [classesRes, currentRes] = await Promise.allSettled([
        // Offline on a device that never loaded the classes: the synced ones (OFF-18).
        setupApi.classesFor(user).catch((err) => {
          if (!isUnreachable(err)) throw err;
          return offlineClassesFor(user).then((rows) => (rows.length ? rows : Promise.reject(err)));
        }),
        setupApi.currentTerm(),
      ]);
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value);
      if (currentRes.status === 'fulfilled' && currentRes.value)
        setAcademicContext(currentRes.value);
      const failed = [classesRes, currentRes].find((r) => r.status === 'rejected');
      if (failed?.status === 'rejected')
        notifyLoadError('the classes and current term', failed.reason);
    }
    loadPrerequisites();
  }, [user]);

  // Fetch students with filtering & pagination
  const latestList = useRef(0);
  const fetchStudents = useCallback(async () => {
    const request = ++latestList.current;
    setIsLoading(true);
    setListError(null);
    try {
      const result = await studentsPage(page, {
        search,
        classId: gradeFilter && gradeFilter !== 'all' ? gradeFilter : null,
        status: statusFilter && statusFilter !== 'All' ? statusFilter : null,
      });
      // A slower, older response must not replace a newer one.
      if (request !== latestList.current) return;
      setStudents(result.page.items);
      setTotal(result.page.total);
      setListOffline(result.offline);
    } catch (err: unknown) {
      if (request !== latestList.current) return;
      setListError(err instanceof Error ? err.message : 'Could not load the students.');
    } finally {
      if (request === latestList.current) setIsLoading(false);
    }
  }, [page, search, gradeFilter, statusFilter]);

  // The active count is school-wide, so paging and filters don't reload it.
  const fetchActiveCount = useCallback(async () => {
    try {
      setActiveCount(await activeStudents());
    } catch {
      // A hint on a card; the list shows its own error.
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchActiveCount();
  }, [fetchActiveCount]);

  /** After a change: the list and the count. */
  // Pupils admitted here and not yet synced, on the first page, filtered on the device.
  const shownPending =
    page === 1
      ? admittedHere.filter(
          (p) =>
            (!gradeFilter || gradeFilter === 'all' || p.classId === gradeFilter) &&
            (statusFilter === 'All' || statusFilter === 'Active') &&
            (!search || p.fullName.toLowerCase().includes(search.toLowerCase())),
        )
      : [];

  // An admission landed (any tab): the list now has the pupil with their code.
  useEffect(
    () =>
      onSyncApplied((op) => {
        if (op.collection === ADMISSIONS_COLLECTION) void fetchStudents();
      }),
    [fetchStudents],
  );

  const refreshAll = useCallback(() => {
    fetchStudents();
    fetchActiveCount();
  }, [fetchStudents, fetchActiveCount]);

  const classSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All classes' },
      ...classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` })),
    ];
  }, [classes]);

  // Derived stats
  const totalStudents = total;

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Student registrations, personal dossiers, guardians and class cohorts."
        actions={
          <>
            <Button
              leftSection={<RefreshCw size={16} />}
              variant="default"
              radius="md"
              onClick={refreshAll}
              loading={isLoading}
            >
              Refresh
            </Button>
            {canAccessRoute(user, 'promotions') && (
              <Button
                component={Link}
                href={APP_ROUTES.promotions.path}
                leftSection={<ArrowUpCircle size={16} />}
                variant="default"
                radius="md"
              >
                Move classes up
              </Button>
            )}
            {can('students:create') && (
              <Button
                leftSection={<UserPlus size={16} />}
                color="fastrackRed"
                radius="md"
                onClick={() => {
                  setAdmission((n) => n + 1);
                  openAdmit();
                }}
                id="btn-admit-student"
              >
                Admit New Student
              </Button>
            )}
          </>
        }
      />

      {/* Metric Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Total Enrolled
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(224, 26, 43, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color="#e01a2b" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {totalStudents}
          </Text>
          <Text size="sm" c="dimmed">
            Across {classes.length} classroom cohorts
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Active Students
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} color="#10b981" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {activeCount}
          </Text>
          <Text size="sm" c="teal.7">
            Currently attending classes
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Academic Year
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} color="#3b82f6" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {academicContext?.yearLabel || '2026/2027'}
          </Text>
          <Text size="sm" c="dimmed">
            Active School Year
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Current Term
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(224, 26, 43, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserX size={20} color="#e01a2b" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {academicContext?.termLabel ?? '—'}
          </Text>
          <Text size="sm" c="dimmed">
            Active Term Session
          </Text>
        </Card>
      </SimpleGrid>

      {/* Main Table Card */}
      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="Search by student name or code…"
              value={query}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setPage(1);
              }}
              radius="md"
              w={280}
              id="input-search-student"
            />
            <Select
              placeholder="Filter by Class"
              data={classSelectOptions}
              value={gradeFilter || 'all'}
              onChange={(v) => {
                setGradeFilter(v === 'all' || !v ? null : v);
                setPage(1);
              }}
              radius="md"
              w={180}
              id="select-filter-class"
            />
          </Group>
          <SegmentedControl
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            data={['All', 'Active', 'Inactive']}
            radius="md"
          />
        </Group>

        {listOffline && (
          <Group gap={6} mb="sm">
            <CloudOff size={14} color="var(--mantine-color-yellow-7)" />
            <Text size="xs" c="dimmed">
              Offline: showing the pupils synced to this device.
            </Text>
          </Group>
        )}

        <ScrollArea>
          <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 840 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Student</Table.Th>
                <Table.Th>Student Code</Table.Th>
                <Table.Th>Class</Table.Th>
                <Table.Th>Gender</Table.Th>
                <Table.Th>Guardian</Table.Th>
                <Table.Th>Guardian Contact</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Stack align="center" py="xl" gap="sm">
                      <Loader size="sm" color="fastrackRed" />
                      <Text size="sm" c="dimmed">
                        Loading student records from server…
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : listError ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Alert color="red" title="Unable to load students" my="md">
                      <Stack gap="xs" align="flex-start">
                        <Text size="sm">{listError}</Text>
                        <Button size="xs" variant="light" color="red" onClick={fetchStudents}>
                          Try again
                        </Button>
                      </Stack>
                    </Alert>
                  </Table.Td>
                </Table.Tr>
              ) : students.length === 0 && shownPending.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Stack align="center" py="xl" gap={4}>
                      <Filter size={22} color="#94a3b8" />
                      <Text size="sm" c="dimmed">
                        {filtered
                          ? 'No students match your filter criteria.'
                          : isTeacher
                            ? 'No pupils yet: you’ll see the pupils of the classes you teach.'
                            : 'No students yet.'}
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                [...shownPending, ...students].map((student) => {
                  const initials =
                    `${student.firstName?.[0] || ''}${student.surname?.[0] || ''}`.toUpperCase();
                  const waiting = 'pending' in student && student.pending === true;
                  return (
                    <Table.Tr
                      key={waiting ? `pending:${student.id}` : student.id}
                      id={
                        waiting ? `row-pending-${student.id}` : `row-student-${student.studentCode}`
                      }
                      // The server doesn't know a pupil admitted offline yet: nothing to open.
                      onClick={waiting ? undefined : () => setOpenStudentId(student.id)}
                      style={{ cursor: waiting ? 'default' : 'pointer' }}
                    >
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar radius="xl" size={32} color="fastrackRed">
                            {initials}
                          </Avatar>
                          <Box>
                            <Text fw={600} size="sm">
                              {student.fullName}
                            </Text>
                            {student.nationalId ? (
                              <Text size="xs" c="dimmed">
                                ID: {student.nationalId}
                              </Text>
                            ) : null}
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {waiting ? (
                          <Badge variant="light" color="yellow" radius="sm" tt="none">
                            Code pending · waiting to sync
                          </Badge>
                        ) : (
                          <Badge variant="outline" color="dark" radius="sm" tt="none">
                            {student.studentCode}
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="blue" radius="sm" tt="none">
                          {student.className || student.classCode}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={student.gender?.toLowerCase() === 'female' ? 'pink' : 'blue'}
                          radius="sm"
                          tt="none"
                        >
                          {student.gender || '—'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{student.guardianName || '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {student.guardianContact || '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Badge
                            variant="light"
                            radius="sm"
                            color={student.status?.toLowerCase() === 'active' ? 'green' : 'red'}
                          >
                            {student.status}
                          </Badge>
                          {student.boardingStatus && student.boardingStatus !== 'Day' ? (
                            <Badge variant="outline" color="orange" radius="sm" size="xs">
                              {student.boardingStatus}
                            </Badge>
                          ) : null}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Group justify="space-between" mt="md" wrap="wrap">
          <Text size="sm" c="dimmed">
            Showing {students.length} of {total} registered students
          </Text>
          <Pagination
            total={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            value={page}
            onChange={setPage}
            color="fastrackRed"
            radius="md"
          />
        </Group>
      </Card>

      <StudentDrawer
        studentId={openStudentId}
        onClose={() => setOpenStudentId(null)}
        onChanged={refreshAll}
      />

      <AdmitStudentModal
        key={admission}
        opened={admitOpened}
        onClose={closeAdmit}
        classes={classes}
        academicContext={academicContext}
        onAdmitted={refreshAll}
      />
    </>
  );
}
