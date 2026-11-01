'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  CopyButton,
  Group,
  Loader,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Switch,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { Check, Copy, Eye, Filter, Search, ShieldCheck } from 'lucide-react';
import { LoadErrorRow } from './LoadErrorRow';
import { PAGE_SIZE, type Invoice, type InvoiceStatus } from './api';
import { formatGhs } from './money';

export const invoiceStatusColor = (status: string) =>
  ({ PAID: 'green', PARTIAL: 'orange', OVERPAID: 'cyan', CARRIED_FORWARD: 'gray' })[status] ??
  'red';

/** CARRIED_FORWARD: the remaining balance now sits on the next term's bill. */
export const invoiceStatusLabel = (status: string) =>
  status === 'CARRIED_FORWARD' ? 'MOVED TO NEXT BILL' : status;

const STATUS_FILTERS = ['All', 'UNPAID', 'PARTIAL', 'PAID'];

export interface InvoiceFilters {
  search: string;
  classId: string | null;
  status: InvoiceStatus | null;
  /** Only the bills of pupils who have left. */
  leavers: boolean;
  page: number;
}

export function InvoicesTab({
  invoices,
  total,
  loading,
  error = null,
  onRetry,
  filters,
  onFiltersChange,
  classOptions,
  onBreakdown,
}: {
  invoices: Invoice[];
  total: number;
  loading: boolean;
  /** Set when the list failed to load; shown instead of the empty state. */
  error?: string | null;
  onRetry?: () => void;
  filters: InvoiceFilters;
  onFiltersChange: (filters: InvoiceFilters) => void;
  classOptions: { value: string; label: string }[];
  onBreakdown: (invoice: Invoice) => void;
}) {
  // Any filter change returns to the first page.
  const filter = (change: Partial<InvoiceFilters>) =>
    onFiltersChange({ ...filters, ...change, page: 1 });
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm" wrap="wrap">
          <TextInput
            placeholder="Search invoice or student…"
            value={filters.search}
            onChange={(e) => filter({ search: e.currentTarget.value })}
            leftSection={<Search size={15} color="#94a3b8" />}
            radius="md"
            w={260}
            id="input-search-invoice"
          />
          <Select
            placeholder="Filter by Class"
            data={[{ value: 'all', label: 'All classes' }, ...classOptions]}
            value={filters.classId ?? 'all'}
            onChange={(v) => filter({ classId: v === 'all' ? null : v })}
            radius="md"
            w={180}
            id="select-filter-invoice-class"
          />
          <Switch
            label="Leavers"
            description="Pupils who have left; their bills are still owed"
            checked={filters.leavers}
            onChange={(e) => filter({ leavers: e.currentTarget.checked })}
            color="fastrackRed"
          />
        </Group>
        <SegmentedControl
          value={filters.status ?? 'All'}
          onChange={(v) => filter({ status: v === 'All' ? null : (v as InvoiceStatus) })}
          data={STATUS_FILTERS}
          radius="md"
          id="seg-invoice-status"
        />
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 880 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Invoice #</Table.Th>
              <Table.Th>Student</Table.Th>
              <Table.Th>Class</Table.Th>
              <Table.Th>Net Payable</Table.Th>
              <Table.Th>Amount Paid</Table.Th>
              <Table.Th>Balance</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Stack align="center" py="xl" gap="sm">
                    <Loader size="sm" color="fastrackRed" />
                    <Text size="sm" c="dimmed">
                      Loading invoices…
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : error ? (
              <LoadErrorRow colSpan={8} message={error} onRetry={onRetry} />
            ) : invoices.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Stack align="center" py="xl" gap={4}>
                    <Filter size={22} color="#94a3b8" />
                    <Text size="sm" c="dimmed">
                      No invoices match your search or filter.
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : (
              invoices.map((inv) => (
                <Table.Tr key={inv.id} id={`row-invoice-${inv.invoiceNumber}`}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Badge variant="outline" color="dark" radius="sm">
                        {inv.invoiceNumber}
                      </Badge>
                      {inv.signature ? (
                        <Tooltip label="Cryptographically Signed & Tamper-Evident" withArrow>
                          <ThemeIcon size={20} radius="xl" color="green" variant="light">
                            <ShieldCheck size={12} />
                          </ThemeIcon>
                        </Tooltip>
                      ) : null}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Box>
                      <Text fw={600} size="sm">
                        {inv.studentName || 'Unknown Student'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {inv.studentCode || '—'}
                      </Text>
                    </Box>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue" radius="sm" tt="none">
                      {inv.className || '—'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {formatGhs(inv.feePayable)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="teal.7">
                      {formatGhs(inv.totalPayment)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm" c={inv.balance > 0 ? 'red.7' : 'teal.7'}>
                      {formatGhs(inv.balance)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" radius="sm" color={invoiceStatusColor(inv.status)}>
                      {invoiceStatusLabel(inv.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Button
                        size="xs"
                        variant="subtle"
                        leftSection={<Eye size={14} />}
                        onClick={() => onBreakdown(inv)}
                      >
                        Breakdown
                      </Button>
                      {inv.viewUrl ? (
                        <CopyButton value={inv.viewUrl} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied Link!' : 'Copy Parent Link'} withArrow>
                              <ActionIcon
                                color={copied ? 'teal' : 'gray'}
                                variant="subtle"
                                onClick={copy}
                                aria-label={copied ? 'Link copied' : 'Copy the parent link'}
                              >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      ) : null}
                    </Group>
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
