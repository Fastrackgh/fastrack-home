'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { PlusCircle, Search } from 'lucide-react';
import { PAGE_SIZE, type Page } from '@/lib/pagination';
import { errorMessage, setupApi, type Department, type SchoolClass, type StaffOption } from './api';
import { ClassModal } from './ClassModal';

/** The school's classes, a page at a time, with search by code or name. */
export function ClassesPanel({
  departments,
  staff,
  canManage,
  onChanged,
}: {
  departments: Department[];
  staff: StaffOption[];
  canManage: boolean;
  /** Class counts on departments change when a class moves. */
  onChanged: () => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search, 300);
  const [result, setResult] = useState<Page<SchoolClass> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // undefined: closed; null: adding; a class: editing it.
  const [editing, setEditing] = useState<SchoolClass | null | undefined>(undefined);

  const load = useCallback(async () => {
    setError(null);
    try {
      setResult(await setupApi.listClasses(page, query));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the classes.'));
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [query]);

  const teacher = (staffId: string | null) => staff.find((s) => s.id === staffId)?.name;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Search by code or name"
          leftSection={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          radius="md"
          w={280}
        />
        {canManage && (
          <Button
            color="fastrackRed"
            radius="md"
            leftSection={<PlusCircle size={16} />}
            onClick={() => setEditing(null)}
          >
            Add class
          </Button>
        )}
      </Group>

      {error ? (
        <Alert color="red" title="Unable to load classes">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !result ? (
        <Loader />
      ) : (
        <Card withBorder radius="lg" p={0}>
          {result.items.length === 0 ? (
            <Text ta="center" c="dimmed" p="xl">
              {query ? 'No class matches that search.' : 'No classes yet.'}
            </Text>
          ) : (
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={70}>Order</Table.Th>
                  <Table.Th>Class</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Class teacher</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {result.items.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {c.sequenceOrder}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {c.className}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {c.classCode}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={c.departmentName ? undefined : 'dimmed'}>
                        {c.departmentName ?? 'None'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={c.homeroomStaffId ? undefined : 'dimmed'}>
                        {c.homeroomStaffId
                          ? (teacher(c.homeroomStaffId) ?? 'Assigned')
                          : 'Not assigned'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      {canManage && (
                        <Button size="compact-xs" variant="subtle" onClick={() => setEditing(c)}>
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

      {result && result.total > PAGE_SIZE && (
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {result.total} classes
          </Text>
          <Pagination
            total={Math.ceil(result.total / PAGE_SIZE)}
            value={page}
            onChange={setPage}
            color="fastrackRed"
          />
        </Group>
      )}

      {editing !== undefined && (
        <ClassModal
          schoolClass={editing ?? undefined}
          departments={departments}
          staff={staff}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
            onChanged();
          }}
        />
      )}
    </Stack>
  );
}
