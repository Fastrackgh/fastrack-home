'use client';

import {
  Badge,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core';
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
  filters,
  onFiltersChange,
  termOptions,
  classOptions,
}: {
  structures: FeeStructure[];
  total: number;
  loading: boolean;
  filters: FeeStructureFilters;
  onFiltersChange: (filters: FeeStructureFilters) => void;
  termOptions: { value: string; label: string }[];
  classOptions: { value: string; label: string }[];
}) {
  // Any filter change returns to the first page.
  const filter = (change: Partial<FeeStructureFilters>) =>
    onFiltersChange({ ...filters, ...change, page: 1 });
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Group gap="sm" mb="md" wrap="wrap">
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

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fee Type</Table.Th>
              <Table.Th>Class Cohort</Table.Th>
              <Table.Th>Academic Term</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Category</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Stack align="center" py="xl">
                    <Loader size="sm" color="fastrackRed" />
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : structures.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
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
                      {s.className || 'All School'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {s.termLabel || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm">
                      {formatGhs(s.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color={s.isOptional ? 'orange' : 'teal'} radius="sm">
                      {s.isOptional ? 'Optional / Elective' : 'Mandatory'}
                    </Badge>
                  </Table.Td>
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
