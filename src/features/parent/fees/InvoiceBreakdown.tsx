'use client';

import { Card, Divider, Group, Stack, Text } from '@mantine/core';
import { formatGhs, type Pesewas } from '@/features/fees/money';
import { broughtForward } from '../domain/invoices';
import type { ParentInvoice } from '../types';

function AmountRow({
  label,
  value,
  strong,
  credit,
}: {
  label: string;
  value: Pesewas;
  strong?: boolean;
  credit?: boolean;
}) {
  return (
    <Group justify="space-between">
      <Text size="sm" fw={strong ? 700 : 400} c={strong ? undefined : 'dimmed'}>
        {label}
      </Text>
      <Text size="sm" fw={strong ? 700 : 500} c={credit ? 'green' : undefined}>
        {formatGhs(value)}
      </Text>
    </Group>
  );
}

/** A bill's lines and how they add up to the balance. */
export function InvoiceBreakdown({ invoice }: { invoice: ParentInvoice }) {
  const { sameTermBills, earlierTerms } = broughtForward(invoice);
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>Breakdown</Text>
        <Text size="xs" c="dimmed">
          {invoice.invoiceNumber}
        </Text>
      </Group>
      <Stack gap={8}>
        {(invoice.lineItems ?? []).map((item) => (
          <Group key={item.id} justify="space-between">
            <Text size="sm">
              {item.feeTypeName}
              {item.isOptional && (
                <Text span size="xs" c="dimmed">
                  {' '}
                  (optional)
                </Text>
              )}
            </Text>
            <Text size="sm">{formatGhs(item.amount)}</Text>
          </Group>
        ))}
        <Divider my={4} />
        {/* Extra bills from this same term are named, not called arrears (QA-219). */}
        {sameTermBills.map((bill) => (
          <AmountRow
            key={bill.invoiceNumber}
            label={`${bill.title} (${bill.invoiceNumber})`}
            value={bill.amount}
          />
        ))}
        {earlierTerms !== 0 && (
          <AmountRow
            label={earlierTerms > 0 ? 'Arrears from earlier terms' : 'Credit from earlier terms'}
            value={earlierTerms}
          />
        )}
        <AmountRow label="Total fees" value={invoice.totalFees} />
        {invoice.discountAmount > 0 && (
          <AmountRow label="Discount" value={-invoice.discountAmount} />
        )}
        {/* A credit bigger than the fees is shown as credit, not a negative amount (QA-244). */}
        {invoice.feePayable < 0 ? (
          <AmountRow label="Credit after fees" value={-invoice.feePayable} strong credit />
        ) : (
          <AmountRow label="Amount payable" value={invoice.feePayable} strong />
        )}
        <AmountRow label="Paid so far" value={invoice.totalPayment} />
        {invoice.balance < 0 ? (
          <AmountRow label="Credit" value={-invoice.balance} strong credit />
        ) : (
          <AmountRow label="Balance" value={invoice.balance} strong />
        )}
      </Stack>
    </Card>
  );
}
