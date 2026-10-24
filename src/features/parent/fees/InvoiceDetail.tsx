'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { ArrowLeft, FileText, Info, Wallet } from 'lucide-react';
import { formatGhs, type Pesewas } from '@/features/fees/money';
import { useAuth } from '@/lib/auth';
import { useLeaveOnWardChange } from '../ActiveWardProvider';
import { parentApi } from '../api';
import { QueryView, WithWard } from '../components';
import { DocumentModal } from '../DocumentFrame';
import { formatDate, invoiceStatus } from '../format';
import type { ParentInvoice, Ward } from '../types';
import { useParentQuery } from '../useParentQuery';
import { PayInvoiceModal } from './PayInvoiceModal';

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
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
      <WithWard>{(ward) => <WardInvoice ward={ward} invoiceId={invoiceId} />}</WithWard>
    </>
  );
}

function Row({
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

function WardInvoice({ ward, invoiceId }: { ward: Ward; invoiceId: string }) {
  const { can } = useAuth();
  const { online } = useNetwork();
  const [paying, setPaying] = useState(false);
  const [viewing, setViewing] = useState(false);
  const query = useParentQuery(`invoice:${ward.studentId}:${invoiceId}`, () =>
    parentApi.getInvoice(ward.studentId, invoiceId),
  );

  return (
    <QueryView query={query}>
      {(invoice: ParentInvoice) => {
        const owing = invoice.balance > 0;
        const payable = owing && invoice.canPayOnline !== false && can('payments:make');
        return (
          <Stack gap="md">
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div>
                  <Text size="sm" c="dimmed">
                    {invoice.termLabel ? `${invoice.termLabel}, ${invoice.yearLabel}` : 'Fee bill'}
                  </Text>
                  <Title
                    order={2}
                    c={invoice.balance < 0 ? 'green' : undefined}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {invoice.balance < 0
                      ? `${formatGhs(-invoice.balance)} credit`
                      : formatGhs(invoice.balance)}
                  </Title>
                  <Text size="xs" c="dimmed">
                    {owing
                      ? 'Balance to pay'
                      : invoice.balance < 0
                        ? 'Nothing to pay on this bill'
                        : invoice.status === 'CARRIED_FORWARD'
                          ? `${formatGhs(invoice.carriedForwardAmount ?? 0)} moved to ${invoice.carriedForwardToInvoiceNumber ?? 'the next bill'}`
                          : invoice.feePayable <= 0
                            ? 'Covered by credit'
                            : 'Fully paid'}
                    {owing && invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ''}
                  </Text>
                </div>
                <Badge variant="light" color={invoiceStatus(invoice.status).color}>
                  {invoiceStatus(invoice.status).label}
                </Badge>
              </Group>
              {payable && (
                <>
                  <Button
                    mt="lg"
                    size="md"
                    fullWidth
                    color="fastrackRed"
                    leftSection={<Wallet size={18} />}
                    disabled={!online}
                    onClick={() => setPaying(true)}
                  >
                    Pay now
                  </Button>
                  {!online && (
                    <Text size="xs" c="dimmed" ta="center" mt={6}>
                      Connect to the internet to pay.
                    </Text>
                  )}
                </>
              )}
              {owing && invoice.canPayOnline === false && (
                <Alert mt="md" color="blue" radius="md" icon={<Info size={16} />}>
                  This school does not take online payments yet. Pay at the school&apos;s accounts
                  office.
                </Alert>
              )}
            </Card>

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
                {invoice.arrearsBf !== 0 && (
                  <Row
                    label={
                      invoice.arrearsBf > 0 ? 'Arrears from last term' : 'Credit from last term'
                    }
                    value={invoice.arrearsBf}
                  />
                )}
                <Row label="Total fees" value={invoice.totalFees} />
                {invoice.discountAmount > 0 && (
                  <Row label="Discount" value={-invoice.discountAmount} />
                )}
                {/* A credit bigger than the fees is shown as credit, not a negative amount (QA-244). */}
                {invoice.feePayable < 0 ? (
                  <Row label="Credit after fees" value={-invoice.feePayable} strong credit />
                ) : (
                  <Row label="Amount payable" value={invoice.feePayable} strong />
                )}
                <Row label="Paid so far" value={invoice.totalPayment} />
                {invoice.balance < 0 ? (
                  <Row label="Credit" value={-invoice.balance} strong credit />
                ) : (
                  <Row label="Balance" value={invoice.balance} strong />
                )}
              </Stack>
            </Card>

            <Button
              variant="default"
              leftSection={<FileText size={16} />}
              onClick={() => setViewing(true)}
            >
              View printable bill
            </Button>

            {paying && (
              <PayInvoiceModal
                opened
                onClose={() => setPaying(false)}
                studentId={ward.studentId}
                invoice={invoice}
              />
            )}
            <DocumentModal
              opened={viewing}
              onClose={() => setViewing(false)}
              title={`Bill ${invoice.invoiceNumber}`}
              cacheKey={`invoice-doc:${ward.studentId}:${invoice.id}`}
              load={() => parentApi.invoiceDocument(ward.studentId, invoice.id)}
            />
          </Stack>
        );
      }}
    </QueryView>
  );
}
