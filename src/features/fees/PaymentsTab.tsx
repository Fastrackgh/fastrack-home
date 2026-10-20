'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { Printer, Receipt, Search } from 'lucide-react';
import type { Payment } from './api';
import { formatGhs } from './money';

export function PaymentsTab({
  payments,
  loading,
  onRecordPayment,
  onShowReceipt,
}: {
  payments: Payment[];
  loading: boolean;
  /** Absent when the user may not record payments. */
  onRecordPayment?: () => void;
  onShowReceipt: (payment: Payment) => void;
}) {
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((p) =>
      [p.studentName, p.studentCode, p.receiptNumber, p.transactionReference].some((v) =>
        v?.toLowerCase().includes(term),
      ),
    );
  }, [payments, filter]);

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <TextInput
          placeholder="Filter by student, receipt or reference…"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          leftSection={<Search size={15} color="#94a3b8" />}
          radius="md"
          w={280}
        />
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
            ) : visible.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Stack align="center" py="xl" gap={4}>
                    <Receipt size={22} color="#94a3b8" />
                    <Text size="sm" c="dimmed">
                      {payments.length === 0
                        ? 'No payment transactions recorded yet.'
                        : 'No payments match your filter.'}
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : (
              visible.map((p) => (
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
    </>
  );
}
