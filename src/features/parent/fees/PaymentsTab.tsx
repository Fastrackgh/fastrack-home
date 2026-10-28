'use client';

import { useState } from 'react';
import { Group, Stack, Text } from '@mantine/core';
import { Receipt } from 'lucide-react';
import { formatGhs } from '@/features/fees/money';
import { usePayments } from '../data/queries';
import { formatDate } from '../domain/format';
import { parentRoutes } from '../routes';
import type { ParentPayment, Ward } from '../types';
import { EmptyState, LinkCard, ListPagination, QueryView, RowChevron } from '../ui';

export function PaymentsTab({ ward }: { ward: Ward }) {
  const [page, setPage] = useState(1);
  const payments = usePayments(ward.studentId, page);
  return (
    <QueryView
      query={payments}
      empty={{
        when: (result) => result.items.length === 0,
        render: () => <EmptyState icon={<Receipt size={22} />} title="No payments yet" />,
      }}
    >
      {(result) => (
        <Stack gap="sm">
          {result.items.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
          <ListPagination total={result.total} page={page} onChange={setPage} />
        </Stack>
      )}
    </QueryView>
  );
}

function PaymentRow({ payment }: { payment: ParentPayment }) {
  return (
    <LinkCard href={parentRoutes.receipt(payment.id)}>
      <div style={{ minWidth: 0 }}>
        <Text fw={700}>{formatGhs(payment.amountPaid)}</Text>
        <Text size="xs" c="dimmed" truncate>
          {formatDate(payment.paymentDate)} · {payment.paymentMethod}
          {payment.termLabel ? ` · ${payment.termLabel}` : ''}
        </Text>
      </div>
      <Group gap={4} wrap="nowrap">
        <Text size="xs" c="dimmed">
          {payment.receiptNumber}
        </Text>
        <RowChevron />
      </Group>
    </LinkCard>
  );
}
