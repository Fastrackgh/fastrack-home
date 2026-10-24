'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Switch,
  Table,
  Text,
} from '@mantine/core';
import { Layers, ListPlus, PlusCircle } from 'lucide-react';
import {
  errorMessage,
  setupApi,
  type ClassSubject,
  type Department,
  type SchoolClass,
  type StaffOption,
  type Subject,
} from './api';
import { ApplySubjectsModal } from './ApplySubjectsModal';
import { ClassSubjectsModal } from './ClassSubjectsModal';
import { CommonSubjectsModal } from './CommonSubjectsModal';
import { SubjectModal } from './SubjectModal';

function LoadError({ title, error, retry }: { title: string; error: string; retry: () => void }) {
  return (
    <Alert color="red" title={title}>
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{error}</Text>
        <Button size="xs" variant="light" color="red" onClick={retry}>
          Try again
        </Button>
      </Stack>
    </Alert>
  );
}

/**
 * The school's subject list, and which subjects each class takes. Both stand
 * from term to term; pupils take their current class's subjects.
 */
export function SubjectsPanel({
  departments,
  canManage,
}: {
  departments: Department[];
  canManage: boolean;
}) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [catalogue, setCatalogue] = useState<Subject[] | null>(null);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[] | null>(null);
  const [classError, setClassError] = useState<string | null>(null);
  // undefined: closed; null: adding; a subject: editing it.
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const [modal, setModal] = useState<'common' | 'class' | 'apply' | null>(null);

  const loadCatalogue = useCallback(async () => {
    setCatalogueError(null);
    try {
      // Inactive ones are needed for the "already added" checks too, so load them always.
      setCatalogue(await setupApi.listSubjects(true));
    } catch (err) {
      setCatalogueError(errorMessage(err, 'Could not load the subjects.'));
    }
  }, []);

  const loadClassSubjects = useCallback(async () => {
    if (!classId) return;
    setClassError(null);
    setClassSubjects(null);
    try {
      setClassSubjects(await setupApi.listClassSubjects(classId));
    } catch (err) {
      setClassError(errorMessage(err, 'Could not load the class’s subjects.'));
    }
  }, [classId]);

  useEffect(() => {
    loadCatalogue();
    setupApi
      .listActiveStaff()
      .then(setStaff)
      .catch(() => setStaff([]));
    setupApi
      .allClasses()
      .then((list) => {
        setClasses(list);
        setClassId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => setClasses([]));
  }, [loadCatalogue]);

  useEffect(() => {
    loadClassSubjects();
  }, [loadClassSubjects]);

  const afterChange = () => {
    setEditing(undefined);
    setModal(null);
    loadCatalogue();
    loadClassSubjects();
  };

  const shown = (catalogue ?? []).filter((s) => showInactive || s.isActive);
  const hiddenCount = (catalogue ?? []).filter((s) => !s.isActive).length;
  const schoolClass = classes?.find((c) => c.id === classId);

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={700}>Subject list</Text>
            <Text size="sm" c="dimmed">
              Every subject taught in the school. One subject serves every class that takes it.
            </Text>
          </div>
          {canManage && (
            <Group gap="sm">
              <Button
                variant="light"
                color="fastrackRed"
                radius="md"
                leftSection={<ListPlus size={16} />}
                onClick={() => setModal('common')}
                disabled={!catalogue}
              >
                Add common subjects
              </Button>
              <Button
                color="fastrackRed"
                radius="md"
                leftSection={<PlusCircle size={16} />}
                onClick={() => setEditing(null)}
              >
                Add subject
              </Button>
            </Group>
          )}
        </Group>

        {catalogueError ? (
          <LoadError title="Unable to load subjects" error={catalogueError} retry={loadCatalogue} />
        ) : !catalogue ? (
          <Loader />
        ) : (
          <Card withBorder radius="lg" p={0}>
            {shown.length === 0 ? (
              <Text ta="center" c="dimmed" p="xl">
                {catalogue.length === 0
                  ? 'No subjects yet. Start with the common subjects, then add your own.'
                  : 'Every subject is turned off.'}
              </Text>
            ) : (
              <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Subject</Table.Th>
                    <Table.Th>Short name</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Classes</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {shown.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Group gap={6}>
                          <Text size="sm" fw={600}>
                            {s.subjectName}
                          </Text>
                          {!s.isActive && (
                            <Badge size="xs" variant="light" color="gray">
                              Not in use
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {s.subjectCode}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={s.shortName ? undefined : 'dimmed'}>
                          {s.shortName ?? '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={s.category ? undefined : 'dimmed'}>
                          {s.category ?? '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={s.classCount ? undefined : 'dimmed'}>
                          {s.classCount || 'None yet'}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        {canManage && (
                          <Button size="compact-xs" variant="subtle" onClick={() => setEditing(s)}>
                            Edit
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        )}
        {hiddenCount > 0 && (
          <Switch
            label={`Show subjects not in use (${hiddenCount})`}
            checked={showInactive}
            onChange={(e) => setShowInactive(e.currentTarget.checked)}
            color="fastrackRed"
            size="sm"
          />
        )}
      </Stack>

      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <div>
            <Text fw={700}>Subjects by class</Text>
            <Text size="sm" c="dimmed">
              What each class takes, every term until changed. Pupils take their class&apos;s
              subjects, and move to the new class&apos;s when they move up.
            </Text>
          </div>
          {canManage && (
            <Button
              variant="light"
              color="fastrackRed"
              radius="md"
              leftSection={<Layers size={16} />}
              onClick={() => setModal('apply')}
              disabled={!catalogue?.some((s) => s.isActive) || !classes?.length}
            >
              Add to several classes
            </Button>
          )}
        </Group>

        {!classes ? (
          <Loader />
        ) : classes.length === 0 ? (
          <Text c="dimmed" size="sm">
            Add classes first, in the Classes tab.
          </Text>
        ) : (
          <>
            <Group justify="space-between" align="flex-end">
              <Select
                label="Class"
                data={classes.map((c) => ({ value: c.id, label: c.className }))}
                value={classId}
                onChange={setClassId}
                allowDeselect={false}
                searchable
                radius="md"
                w={280}
              />
              {canManage && schoolClass && classSubjects && (
                <Button
                  color="fastrackRed"
                  radius="md"
                  onClick={() => setModal('class')}
                  disabled={!catalogue}
                >
                  Edit {schoolClass.className}&apos;s subjects
                </Button>
              )}
            </Group>
            {classError ? (
              <LoadError
                title="Unable to load the class's subjects"
                error={classError}
                retry={loadClassSubjects}
              />
            ) : !classSubjects ? (
              <Loader />
            ) : (
              <Card withBorder radius="lg" p={0}>
                {classSubjects.length === 0 ? (
                  <Text ta="center" c="dimmed" p="xl">
                    {schoolClass?.className} takes no subjects yet.
                  </Text>
                ) : (
                  <Table verticalSpacing="sm" horizontalSpacing="md">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={50}>#</Table.Th>
                        <Table.Th>Subject</Table.Th>
                        <Table.Th>Teachers</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {classSubjects.map((c, i) => (
                        <Table.Tr key={c.subjectId}>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {i + 1}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {c.subjectName}
                            </Text>
                            {c.reportLabel && (
                              <Text size="xs" c="dimmed">
                                On reports: {c.reportLabel}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {c.teachers.length ? (
                              <Text size="sm">{c.teachers.map((t) => t.name).join(', ')}</Text>
                            ) : (
                              <Badge size="sm" variant="light" color="gray">
                                Any teacher can mark
                              </Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            )}
          </>
        )}
      </Stack>

      {editing !== undefined && (
        <SubjectModal
          subject={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={afterChange}
        />
      )}
      {modal === 'common' && catalogue && (
        <CommonSubjectsModal
          existing={catalogue}
          onClose={() => setModal(null)}
          onSaved={afterChange}
        />
      )}
      {modal === 'class' && schoolClass && classSubjects && catalogue && (
        <ClassSubjectsModal
          schoolClass={schoolClass}
          current={classSubjects}
          catalogue={catalogue}
          staff={staff}
          onClose={() => setModal(null)}
          onSaved={afterChange}
        />
      )}
      {modal === 'apply' && catalogue && classes && (
        <ApplySubjectsModal
          catalogue={catalogue}
          departments={departments}
          classes={classes}
          onClose={() => setModal(null)}
          onSaved={afterChange}
        />
      )}
    </Stack>
  );
}
