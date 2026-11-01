'use client';

import { Badge, Group, Text } from '@mantine/core';
import { formatGhs } from '@/features/fees/money';
import { dueNote, invoiceStatus, invoiceTermLabel, isInCredit } from '../domain/invoices';
import { parentRoutes } from '../routes';
import type { ParentInvoice } from '../types';
import { LinkCard, RowChevron } from '../ui';

export function InvoiceCard({ invoice }: { invoice: ParentInvoice }) {
  const status = invoiceStatus(invoice.status);
  return (
    <LinkCard href={parentRoutes.invoice(invoice.id)}>
      <div style={{ minWidth: 0 }}>
        <Group gap={6}>
          <Text fw={700}>{invoiceTermLabel(invoice, invoice.invoiceNumber)}</Text>
          <Badge size="sm" variant="light" color={status.color}>
            {status.label}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          {invoice.invoiceNumber}
          {dueNote(invoice)}
        </Text>
      </div>
      <Group gap={4} wrap="nowrap">
        <div style={{ textAlign: 'right' }}>
          <BalanceFigure invoice={invoice} />
        </div>
        <RowChevron />
      </Group>
    </LinkCard>
  );
}

function BalanceFigure({ invoice }: { invoice: ParentInvoice }) {
  if (isInCredit(invoice)) {
    return (
      <>
        <Text fw={700} c="green">
          {formatGhs(-invoice.balance)} credit
        </Text>
        <Text size="xs" c="dimmed">
          Nothing to pay
        </Text>
      </>
    );
  }
  return (
    <>
      <Text fw={700}>{formatGhs(invoice.balance)}</Text>
      <Text size="xs" c="dimmed">
        {invoice.feePayable > 0 ? `of ${formatGhs(invoice.feePayable)}` : 'Covered by credit'}
      </Text>
    </>
  );
}
