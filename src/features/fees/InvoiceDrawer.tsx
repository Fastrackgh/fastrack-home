'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { Invoice } from './api';
import { invoiceStatusColor, invoiceStatusLabel } from './InvoicesTab';
import { formatGhs } from './money';

export function InvoiceDrawer({
  invoice,
  loading,
  onClose,
}: {
  invoice: Invoice | null;
  /** True while the line items are still loading. */
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      opened={invoice !== null}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
            Invoice Breakdown
          </Title>
          <Badge variant="outline" color="dark">
            {invoice?.invoiceNumber}
          </Badge>
        </Group>
      }
      position="right"
      size="lg"
    >
      {invoice ? (
        <Stack gap="md">
          <Card withBorder radius="md" p="md" bg="gray.0">
            <Group justify="space-between">
              <Box>
                <Text fw={700} size="md">
                  {invoice.studentName}
                </Text>
                <Text size="xs" c="dimmed">
                  Code: {invoice.studentCode || '—'} • Class: {invoice.className || '—'}
                </Text>
              </Box>
              <Badge color={invoiceStatusColor(invoice.status)} radius="sm" size="lg">
                {invoiceStatusLabel(invoice.status)}
              </Badge>
            </Group>
          </Card>

          <Divider label="Itemized Fee Schedule" labelPosition="left" />

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fee Component</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={2}>
                    <Group justify="center" py="sm">
                      <Loader size="xs" color="fastrackRed" />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ) : null}
              {invoice.lineItems?.map((item) => (
                <AmountRow key={item.id} label={item.feeTypeName} amount={formatGhs(item.amount)} />
              ))}
              {invoice.arrearsBf > 0 ? (
                <AmountRow
                  label="Arrears Brought Forward"
                  amount={formatGhs(invoice.arrearsBf)}
                  color="red.7"
                />
              ) : null}
              {invoice.arrearsBf < 0 ? (
                <AmountRow
                  label="Credit Brought Forward"
                  amount={`- ${formatGhs(-invoice.arrearsBf)}`}
                  color="teal.7"
                />
              ) : null}
            </Table.Tbody>
          </Table>

          <Divider />

          <Stack gap={6}>
            <SummaryLine label="Total Term Fees:" value={formatGhs(invoice.totalFees)} />
            {invoice.discountAmount > 0 ? (
              <SummaryLine
                label="Scholarship / Discount:"
                value={`- ${formatGhs(invoice.discountAmount)}`}
                color="teal.7"
              />
            ) : null}
            <Group justify="space-between">
              <Text size="md" fw={700}>
                Net Fee Payable:
              </Text>
              <Text size="md" fw={800}>
                {formatGhs(invoice.feePayable)}
              </Text>
            </Group>
            <SummaryLine
              label="Total Payments Received:"
              value={formatGhs(invoice.totalPayment)}
              color="teal.7"
            />
            <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid #e2e8f0' }}>
              <Text size="md" fw={800} c={invoice.balance > 0 ? 'red.7' : 'teal.7'}>
                Current Balance:
              </Text>
              <Text size="lg" fw={900} c={invoice.balance > 0 ? 'red.7' : 'teal.7'}>
                {formatGhs(invoice.balance)}
              </Text>
            </Group>
          </Stack>

          {invoice.signature ? (
            <Alert
              icon={<ShieldCheck size={18} />}
              title="Cryptographically Signed"
              color="teal"
              radius="md"
            >
              <Text size="xs">
                This bill is sealed with a digital SHA-256 HMAC signature ensuring immutability for
                parents.
              </Text>
            </Alert>
          ) : null}

          {invoice.viewUrl ? (
            <Button
              component="a"
              href={invoice.viewUrl}
              target="_blank"
              variant="light"
              color="blue"
              leftSection={<ExternalLink size={16} />}
              radius="md"
            >
              Open Parent Public Invoice Link
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Drawer>
  );
}

function AmountRow({ label, amount, color }: { label: string; amount: string; color?: string }) {
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" c={color} fw={color ? 600 : undefined}>
          {label}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text size="sm" c={color} fw={color ? 700 : 600}>
          {amount}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function SummaryLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" c={color} fw={color ? 700 : 600}>
        {value}
      </Text>
    </Group>
  );
}
