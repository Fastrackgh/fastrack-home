'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Anchor, Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';
import { formatGhs } from '@/features/fees/money';
import { useLeaveOnWardChange } from '../ActiveWardProvider';
import { parentApi } from '../api';
import { QueryView, WithWard } from '../components';
import { DocumentModal } from '../DocumentFrame';
import { formatDate } from '../format';
import type { Ward } from '../types';
import { useParentQuery } from '../useParentQuery';

export function ReceiptView({ paymentId }: { paymentId: string }) {
  useLeaveOnWardChange('/parent/fees');
  return (
    <>
      <Anchor
        component={Link}
        href="/parent/fees"
        size="sm"
        c="dimmed"
        mb="md"
        display="inline-flex"
        style={{ alignItems: 'center', gap: 4 }}
      >
        <ArrowLeft size={14} /> Fees
      </Anchor>
      <WithWard module="fees">
        {(ward) => <WardReceipt ward={ward} paymentId={paymentId} />}
      </WithWard>
    </>
  );
}

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
  const [viewing, setViewing] = useState(false);
  const query = useParentQuery(`payment:${ward.studentId}:${paymentId}`, () =>
    parentApi.getPayment(ward.studentId, paymentId),
  );
  return (
    <QueryView query={query}>
      {(payment) => (
        <Stack gap="md">
          <Card withBorder radius="lg" padding="lg">
            <Stack align="center" gap={4} mb="lg">
              <ThemeIcon size={48} radius="xl" color="green" variant="light">
                <Receipt size={24} />
              </ThemeIcon>
              <Title order={2} style={{ fontFamily: 'var(--font-heading)' }}>
                {formatGhs(payment.amountPaid)}
              </Title>
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
              <Line label="Balance before" value={formatGhs(payment.previousBalance)} />
              <Line label="Balance after" value={formatGhs(payment.newBalance)} />
              <Line label="Received by" value={payment.recordedByName} />
            </Stack>
          </Card>
          <Button
            variant="default"
            leftSection={<FileText size={16} />}
            onClick={() => setViewing(true)}
          >
            View printable receipt
          </Button>
          <DocumentModal
            opened={viewing}
            onClose={() => setViewing(false)}
            title={`Receipt ${payment.receiptNumber}`}
            cacheKey={`receipt-doc:${ward.studentId}:${payment.id}`}
            load={() => parentApi.receiptDocument(ward.studentId, payment.id)}
          />
        </Stack>
      )}
    </QueryView>
  );
}
