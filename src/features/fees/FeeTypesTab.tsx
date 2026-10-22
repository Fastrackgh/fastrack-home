'use client';

import { Badge, Button, Group, Loader, ScrollArea, Stack, Table, Text } from '@mantine/core';
import { Pencil, PlusCircle, Tags } from 'lucide-react';
import { LoadErrorRow } from './LoadErrorRow';
import type { FeeType } from './api';

export function FeeTypesTab({
  feeTypes,
  loading,
  error = null,
  onRetry,
  onAdd,
  onEdit,
  onAddDefaults,
}: {
  feeTypes: FeeType[];
  loading: boolean;
  /** Set when the list failed to load; shown instead of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  /** The three actions are absent when the user may not manage fee types. */
  onAdd?: () => void;
  onEdit?: (feeType: FeeType) => void;
  onAddDefaults?: () => void;
}) {
  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Text size="sm" c="dimmed">
          The kinds of fee this school charges. Amounts are set per class and term under Fee
          Structures.
        </Text>
        {onAdd && (
          <Button
            leftSection={<PlusCircle size={16} />}
            color="fastrackRed"
            radius="md"
            onClick={onAdd}
            id="btn-add-fee-type"
          >
            Add fee type
          </Button>
        )}
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fee type</Table.Th>
              <Table.Th>Charged</Table.Th>
              <Table.Th>Category</Table.Th>
              {onEdit && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Stack align="center" py="xl">
                    <Loader size="sm" color="fastrackRed" />
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : error ? (
              <LoadErrorRow colSpan={4} message={error} onRetry={onRetry} />
            ) : feeTypes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Stack align="center" py="xl" gap="sm">
                    <Tags size={22} color="#94a3b8" />
                    <Text size="sm" c="dimmed">
                      No fee types yet.
                    </Text>
                    {onAddDefaults && (
                      <Button
                        variant="light"
                        color="fastrackRed"
                        radius="md"
                        onClick={onAddDefaults}
                      >
                        Add the standard fee types
                      </Button>
                    )}
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : (
              feeTypes.map((ft) => (
                <Table.Tr key={ft.id}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {ft.name}
                    </Text>
                    {ft.description ? (
                      <Text size="xs" c="dimmed">
                        {ft.description}
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{ft.isRecurring ? 'Every term' : 'Once'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color={ft.isOptional ? 'orange' : 'teal'} radius="sm">
                      {ft.isOptional ? 'Optional / Elective' : 'Mandatory'}
                    </Badge>
                  </Table.Td>
                  {onEdit && (
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<Pencil size={13} />}
                        onClick={() => onEdit(ft)}
                      >
                        Edit
                      </Button>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
}
