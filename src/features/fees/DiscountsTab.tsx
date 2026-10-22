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
import { BadgePercent, PlusCircle, Trash2 } from 'lucide-react';
import { LoadErrorRow } from './LoadErrorRow';
import { PAGE_SIZE, type Discount } from './api';
import { formatGhs } from './money';

export interface DiscountFilters {
  studentId: string | null;
  page: number;
}

export const discountLabel = (d: Discount) =>
  d.discountType === 'percentage' ? `${d.value}%` : formatGhs(d.value);

export function DiscountsTab({
  discounts,
  total,
  loading,
  error = null,
  onRetry,
  filters,
  onFiltersChange,
  studentOptions,
  onAdd,
  onRemove,
}: {
  discounts: Discount[];
  total: number;
  loading: boolean;
  /** Set when the list failed to load; shown instead of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  filters: DiscountFilters;
  onFiltersChange: (filters: DiscountFilters) => void;
  studentOptions: { value: string; label: string }[];
  /** Both actions are absent when the user may not manage discounts. */
  onAdd?: () => void;
  onRemove?: (discount: Discount) => void;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const columns = onRemove ? 6 : 5;

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Select
          placeholder="All students"
          data={studentOptions}
          value={filters.studentId}
          onChange={(studentId) => onFiltersChange({ studentId, page: 1 })}
          searchable
          clearable
          radius="md"
          w={300}
          id="select-filter-discount-student"
        />
        {onAdd && (
          <Button
            leftSection={<PlusCircle size={16} />}
            color="fastrackRed"
            radius="md"
            onClick={onAdd}
            id="btn-add-discount"
          >
            Add discount
          </Button>
        )}
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 760 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Student</Table.Th>
              <Table.Th>Discount</Table.Th>
              <Table.Th>Applies to</Table.Th>
              <Table.Th>Term</Table.Th>
              <Table.Th>Reason</Table.Th>
              {onRemove && <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>}
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
            ) : discounts.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns}>
                  <Stack align="center" py="xl" gap={4}>
                    <BadgePercent size={22} color="#94a3b8" />
                    <Text size="sm" c="dimmed">
                      {filters.studentId ? 'This student has no discounts.' : 'No discounts yet.'}
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : (
              discounts.map((d) => (
                <Table.Tr key={d.id}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {d.studentName || 'Student'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {[d.studentCode, d.className].filter(Boolean).join(' · ')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="grape" radius="sm" tt="none">
                      {discountLabel(d)}
                      {d.discountType === 'special' ? ' · special' : ''}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{d.feeTypeName || 'Whole bill'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {d.termLabel || 'Every term'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{d.reason || '—'}</Text>
                    {d.approvedByName ? (
                      <Text size="xs" c="dimmed">
                        Approved by {d.approvedByName}
                      </Text>
                    ) : null}
                  </Table.Td>
                  {onRemove && (
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        leftSection={<Trash2 size={13} />}
                        onClick={() => onRemove(d)}
                      >
                        Remove
                      </Button>
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
