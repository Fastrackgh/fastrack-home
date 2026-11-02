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
import { CloudOff, Printer, Receipt } from 'lucide-react';
import { LoadErrorRow } from './LoadErrorRow';
import { PAGE_SIZE, PAYMENT_METHODS, PAYMENT_WARNING_LABELS, type Payment } from './api';
import { formatGhs } from './money';
import { StudentPicker } from './StudentPicker';

export interface PaymentFilters {
  studentId: string | null;
  paymentMethod: string | null;
  /** Sync warnings to show only, comma-separated (sync §9.1). */
  warning: string | null;
  page: number;
}

const ANY_WARNING = Object.keys(PAYMENT_WARNING_LABELS).join(',');

const WARNING_FILTERS = [
  { value: ANY_WARNING, label: 'Needs checking (any)' },
  ...Object.entries(PAYMENT_WARNING_LABELS).map(([value, label]) => ({ value, label })),
];

/** A payment's sync warnings as badges; a possible double payment in red. */
function WarningBadges({ payment }: { payment: Payment }) {
  if (!payment.warnings?.length) return null;
  return (
    <Group gap={4} mt={2}>
      {payment.warnings.map((w, i) => (
        <Badge
          key={i}
          size="xs"
          radius="sm"
          variant="light"
          color={w.code === 'POSSIBLE_DOUBLE_PAYMENT' ? 'red' : 'yellow'}
          tt="none"
        >
          {PAYMENT_WARNING_LABELS[w.code] ?? w.code}
        </Badge>
      ))}
    </Group>
  );
}

/** A queued payment matches the list's filters (they're applied on the device). */
const matches = (p: Payment, filters: PaymentFilters) =>
  (!filters.paymentMethod || p.paymentMethod === filters.paymentMethod) &&
  !filters.warning &&
  (!filters.studentId || p.schoolStudentId === filters.studentId);

export function PaymentsTab({
  pendingPayments = [],
  offline = false,
  payments,
  total,
  loading,
  error = null,
  onRetry,
  filters,
  onFiltersChange,
  onRecordPayment,
  onShowReceipt,
}: {
  /** Taken on this device and not yet synced, newest first: shown above the list on page 1. */
  pendingPayments?: Payment[];
  /** The list is this device's synced copy, because the server was out of reach. */
  offline?: boolean;
  payments: Payment[];
  total: number;
  loading: boolean;
  /** Set when the list failed to load; shown instead of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  filters: PaymentFilters;
  onFiltersChange: (filters: PaymentFilters) => void;
  /** Absent when the user may not record payments. */
  onRecordPayment?: () => void;
  onShowReceipt: (payment: Payment) => void;
}) {
  // Any filter change returns to the first page.
  const filter = (change: Partial<PaymentFilters>) =>
    onFiltersChange({ ...filters, ...change, page: 1 });
  const pages = Math.ceil(total / PAGE_SIZE);
  const filtered =
    filters.studentId !== null || filters.paymentMethod !== null || filters.warning !== null;
  const waiting = filters.page === 1 ? pendingPayments.filter((p) => matches(p, filters)) : [];
  const rows = [...waiting, ...payments];

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <StudentPicker
            placeholder="All students"
            value={filters.studentId}
            onChange={(studentId) => filter({ studentId })}
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
          <Select
            placeholder="All payments"
            data={WARNING_FILTERS}
            value={filters.warning}
            onChange={(warning) => filter({ warning })}
            clearable
            radius="md"
            w={210}
            id="select-filter-payment-warning"
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

      {offline && (
        <Group gap={6} mb="sm">
          <CloudOff size={14} color="var(--mantine-color-yellow-7)" />
          <Text size="xs" c="dimmed">
            Offline: showing the payments synced to this device.
          </Text>
        </Group>
      )}

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
            ) : rows.length === 0 ? (
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
              rows.map((p) => (
                <Table.Tr key={`${p.pending ? 'pending' : 'row'}:${p.id}`}>
                  <Table.Td>
                    <Badge variant="outline" color={p.pending ? 'yellow' : 'teal'} radius="sm">
                      {p.receiptNumber}
                    </Badge>
                    {p.pending ? (
                      <Badge
                        size="xs"
                        variant="light"
                        color="yellow"
                        radius="sm"
                        tt="none"
                        mt={2}
                        display="block"
                        w="fit-content"
                      >
                        Provisional · waiting to sync
                      </Badge>
                    ) : p.provisionalRef ? (
                      <Text size="xs" c="dimmed">
                        was {p.printedRef ?? p.provisionalRef}
                      </Text>
                    ) : null}
                    <WarningBadges payment={p} />
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
                    {p.sharedTransfer?.payments.length ? (
                      <Text size="xs" c="dimmed">
                        Shared with{' '}
                        {p.sharedTransfer.payments.map((other) => other.studentName).join(', ')}
                      </Text>
                    ) : null}
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
