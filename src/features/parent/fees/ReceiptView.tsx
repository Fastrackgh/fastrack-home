'use client';

import React from 'react';
import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { Receipt } from 'lucide-react';
import { formatGhs } from '@/features/fees/money';
import { useLeaveOnWardChange } from '../data/ActiveWardProvider';
import { parentDocuments, usePayment } from '../data/queries';
import { formatDate } from '../domain/format';
import { formatOwed } from '../domain/invoices';
import { parentRoutes } from '../routes';
import type { Ward } from '../types';
import { BackLink, DocumentButton, QueryView, WithWard } from '../ui';

export function ReceiptView({ paymentId }: { paymentId: string }) {
  useLeaveOnWardChange(parentRoutes.fees);
  return (
    <>
      <BackLink href={parentRoutes.fees}>Fees</BackLink>
      <WithWard module="fees">
        {(ward) => <WardReceipt ward={ward} paymentId={paymentId} />}
      </WithWard>
    </>
  );
}

/** One line of the receipt; nothing when the value is missing. */
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500} ta="right">
        {value}
      </Text>
    </Group>
  );
}

function WardReceipt({ ward, paymentId }: { ward: Ward; paymentId: string }) {
  const query = usePayment(ward.studentId, paymentId);
  return (
    <QueryView query={query}>
      {(payment) => {
        // Same labels as the printable receipt when the balance covers the whole account.
        const balance = payment.balanceScope === 'STUDENT_ACCOUNT' ? 'Account balance' : 'Balance';
        return (
          <Stack gap="md">
            <Card withBorder radius="lg" padding="lg">
              <Stack align="center" gap={4} mb="lg">
                <ThemeIcon size={48} radius="xl" color="green" variant="light">
                  <Receipt size={24} />
                </ThemeIcon>
                <Title order={2}>{formatGhs(payment.amountPaid)}</Title>
                <Text size="sm" c="dimmed">
                  Receipt {payment.receiptNumber}
                </Text>
              </Stack>
              <Stack gap={8}>
                <Line label="Date" value={formatDate(payment.paymentDate)} />
                <Line label="Student" value={payment.studentName} />
                <Line label="Class" value={payment.className} />
                <Line label="Bill" value={payment.invoiceNumber} />
                <Line label="Term" value={payment.termLabel} />
                <Line label="Paid with" value={payment.paymentMethod} />
                <Line label="Reference" value={payment.reference ?? payment.transactionReference} />
                <Line label={`${balance} before`} value={formatOwed(payment.previousBalance)} />
                <Line label={`${balance} after`} value={formatOwed(payment.newBalance)} />
                <Line label="Received by" value={payment.recordedByName} />
              </Stack>
            </Card>
            <DocumentButton
              label="View printable receipt"
              title={`Receipt ${payment.receiptNumber}`}
              source={parentDocuments.receipt(ward.studentId, payment.id)}
            />
          </Stack>
        );
      }}
    </QueryView>
  );
}
