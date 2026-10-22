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
import { Printer, Receipt } from 'lucide-react';
import { LoadErrorRow } from './LoadErrorRow';
import { PAGE_SIZE, PAYMENT_METHODS, type Payment } from './api';
import { formatGhs } from './money';

export interface PaymentFilters {
  studentId: string | null;
  paymentMethod: string | null;
  page: number;
}

export function PaymentsTab({
  payments,
  total,
  loading,
  error = null,
  onRetry,
  filters,
  onFiltersChange,
  studentOptions,
  onRecordPayment,
  onShowReceipt,
}: {
  payments: Payment[];
  total: number;
  loading: boolean;
  /** Set when the list failed to load; shown instead of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  filters: PaymentFilters;
  onFiltersChange: (filters: PaymentFilters) => void;
  studentOptions: { value: string; label: string }[];
  /** Absent when the user may not record payments. */
  onRecordPayment?: () => void;
  onShowReceipt: (payment: Payment) => void;
}) {
  // Any filter change returns to the first page.
  const filter = (change: Partial<PaymentFilters>) =>
    onFiltersChange({ ...filters, ...change, page: 1 });
  const pages = Math.ceil(total / PAGE_SIZE);
  const filtered = filters.studentId !== null || filters.paymentMethod !== null;

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <Select
            placeholder="All students"
            data={studentOptions}
            value={filters.studentId}
            onChange={(studentId) => filter({ studentId })}
            searchable
            clearable
            radius="md"
            w={300}
            id="select-filter-payment-student"
          />
          <Select
            placeholder="All methods"
            data={PAYMENT_METHODS}
            value={filters.paymentMethod}
            onChange={(paymentMethod) => filter({ paymentMethod })}
            clearable
            radius="md"
            w={170}
            id="select-filter-payment-method"
          />
        </Group>
        {onRecordPayment && (
          <Button
            leftSection={<Receipt size={16} />}
            color="teal"
            radius="md"
            onClick={onRecordPayment}
          >
            Record Payment
          </Button>
        )}
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 840 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Receipt #</Table.Th>
              <Table.Th>Student</Table.Th>
              <Table.Th>Amount Paid</Table.Th>
              <Table.Th>Method</Table.Th>
              <Table.Th>Reference</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Recorded By</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Stack align="center" py="xl">
                    <Loader size="sm" color="fastrackRed" />
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : error ? (
              <LoadErrorRow colSpan={8} message={error} onRetry={onRetry} />
            ) : payments.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Stack align="center" py="xl" gap={4}>
                    <Receipt size={22} color="#94a3b8" />
                    <Text size="sm" c="dimmed">
                      {filtered
                        ? 'No payments match your filter.'
                        : 'No payment transactions recorded yet.'}
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : (
              payments.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Badge variant="outline" color="teal" radius="sm">
                      {p.receiptNumber}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {p.studentName || 'Student'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {p.studentCode || ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm" c="teal.7">
                      {formatGhs(p.amountPaid)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray" radius="sm">
                      {p.paymentMethod}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.transactionReference || '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {p.paymentDate}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.recordedByName || 'Staff'}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<Printer size={13} />}
                      onClick={() => onShowReceipt(p)}
                    >
                      Receipt
                    </Button>
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
