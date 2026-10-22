'use client';

import {
  Badge,
  Button,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { LoadErrorRow } from './LoadErrorRow';
import { PAGE_SIZE, type FeeStructure } from './api';
import { formatGhs } from './money';

export interface FeeStructureFilters {
  /** Null shows every term. */
  termId: string | null;
  classId: string | null;
  page: number;
}

const ALL = 'all';

export function StructuresTab({
  structures,
  total,
  loading,
  error = null,
  onRetry,
  filters,
  onFiltersChange,
  termOptions,
  classOptions,
  onAdd,
  onEdit,
  onRemove,
}: {
  structures: FeeStructure[];
  total: number;
  loading: boolean;
  /** Set when the list failed to load; shown instead of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  filters: FeeStructureFilters;
  onFiltersChange: (filters: FeeStructureFilters) => void;
  termOptions: { value: string; label: string }[];
  classOptions: { value: string; label: string }[];
  /** The three actions are absent when the user may not manage fee structures. */
  onAdd?: () => void;
  onEdit?: (structure: FeeStructure) => void;
  onRemove?: (structure: FeeStructure) => void;
}) {
  // Any filter change returns to the first page.
  const filter = (change: Partial<FeeStructureFilters>) =>
    onFiltersChange({ ...filters, ...change, page: 1 });
  const pages = Math.ceil(total / PAGE_SIZE);
  const manage = onEdit !== undefined && onRemove !== undefined;
  const columns = manage ? 7 : 6;

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <Select
            data={[...termOptions, { value: ALL, label: 'All terms' }]}
            value={filters.termId ?? ALL}
            onChange={(v) => filter({ termId: v === ALL ? null : v })}
            allowDeselect={false}
            radius="md"
            w={220}
            id="select-filter-structure-term"
          />
          <Select
            data={[{ value: ALL, label: 'All classes' }, ...classOptions]}
            value={filters.classId ?? ALL}
            onChange={(v) => filter({ classId: v === ALL ? null : v })}
            allowDeselect={false}
            radius="md"
            w={200}
            id="select-filter-structure-class"
          />
        </Group>
        {onAdd && (
          <Button
            leftSection={<PlusCircle size={16} />}
            color="fastrackRed"
            radius="md"
            onClick={onAdd}
            id="btn-add-structures"
          >
            Set fees
          </Button>
        )}
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fee Type</Table.Th>
              <Table.Th>Class Cohort</Table.Th>
              <Table.Th>Academic Term</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Due</Table.Th>
              <Table.Th>Category</Table.Th>
              {manage && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={columns}>
                  <Stack align="center" py="xl">
                    <Loader size="sm" color="fastrackRed" />
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : error ? (
              <LoadErrorRow colSpan={columns} message={error} onRetry={onRetry} />
            ) : structures.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns}>
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    No fee structures match this term and class.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              structures.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {s.feeTypeName}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue" radius="sm">
                      {s.className || '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {[s.yearLabel, s.termLabel].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm">
                      {formatGhs(s.amount)}
                    </Text>
                    {s.penalty > 0 ? (
                      <Text size="xs" c="dimmed">
                        {formatGhs(s.penalty)} if late
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {s.dueDate || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color={s.isOptional ? 'orange' : 'teal'} radius="sm">
                      {s.isOptional ? 'Optional / Elective' : 'Mandatory'}
                    </Badge>
                  </Table.Td>
                  {manage && (
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<Pencil size={13} />}
                          onClick={() => onEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          leftSection={<Trash2 size={13} />}
                          onClick={() => onRemove(s)}
                        >
                          Remove
                        </Button>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {pages > 1 && (
        <Group justify="flex-end" mt="md">
          <Pagination
            total={pages}
            value={filters.page}
            onChange={(page) => onFiltersChange({ ...filters, page })}
            color="fastrackRed"
            radius="md"
          />
        </Group>
      )}
    </>
  );
}
