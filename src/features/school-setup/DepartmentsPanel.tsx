'use client';

import { useState } from 'react';
import { Alert, Button, Card, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PlusCircle, Sparkles } from 'lucide-react';
import { ConfirmModal } from '@/features/fees/ConfirmModal';
import { errorMessage, setupApi, type Department, type StaffOption } from './api';
import { DepartmentModal } from './DepartmentModal';

/**
 * Departments group classes (Pre-School, Lower Primary, …). The setup page
 * owns the list, since the class form needs it too.
 */
export function DepartmentsPanel({
  departments,
  error,
  staff,
  canManage,
  onChanged,
}: {
  departments: Department[] | null;
  error: string | null;
  staff: StaffOption[];
  canManage: boolean;
  onChanged: () => void;
}) {
  // undefined: closed; null: adding; a department: editing it.
  const [editing, setEditing] = useState<Department | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Department | null>(null);
  const [seeding, setSeeding] = useState(false);

  const addDefaults = async () => {
    setSeeding(true);
    try {
      await setupApi.addDefaultDepartments();
      onChanged();
    } catch (err) {
      notifications.show({
        title: 'Could not add the standard departments',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSeeding(false);
    }
  };

  if (error)
    return (
      <Alert color="red" title="Unable to load departments">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" color="red" onClick={onChanged}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  if (!departments) return <Loader />;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Departments group your classes and can each have a head.
        </Text>
        {canManage && (
          <Group gap="xs">
            <Button
              variant="default"
              radius="md"
              leftSection={<Sparkles size={16} />}
              loading={seeding}
              onClick={addDefaults}
            >
              Add standard departments
            </Button>
            <Button
              color="fastrackRed"
              radius="md"
              leftSection={<PlusCircle size={16} />}
              onClick={() => setEditing(null)}
            >
              Add department
            </Button>
          </Group>
        )}
      </Group>

      <Card withBorder radius="lg" p={0}>
        {departments.length === 0 ? (
          <Text ta="center" c="dimmed" p="xl">
            No departments yet.
            {canManage && ' Add the standard ones (Pre-School to JHS) or your own.'}
          </Text>
        ) : (
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Department</Table.Th>
                <Table.Th>Head</Table.Th>
                <Table.Th>Classes</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {departments.map((d) => (
                <Table.Tr key={d.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {d.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {d.code}
                      {d.description ? ` · ${d.description}` : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={d.headStaffName ? undefined : 'dimmed'}>
                      {d.headStaffName ?? 'Not set'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{d.classCount}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    {canManage && (
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Button size="compact-xs" variant="subtle" onClick={() => setEditing(d)}>
                          Edit
                        </Button>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="red"
                          onClick={() => setRemoving(d)}
                        >
                          Delete
                        </Button>
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {editing !== undefined && (
        <DepartmentModal
          department={editing ?? undefined}
          staff={staff}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onChanged();
          }}
        />
      )}
      {removing && (
        <ConfirmModal
          title={`Delete ${removing.name}?`}
          confirmLabel="Delete department"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await setupApi.deleteDepartment(removing.id);
            notifications.show({
              title: 'Department deleted',
              message: removing.name,
              color: 'green',
            });
            onChanged();
          }}
        >
          {removing.classCount > 0
            ? `Its ${removing.classCount} class${removing.classCount === 1 ? '' : 'es'} will stay, without a department.`
            : 'It has no classes.'}
        </ConfirmModal>
      )}
    </Stack>
  );
}
