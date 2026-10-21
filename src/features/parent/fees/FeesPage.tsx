'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Card,
  Group,
  Pagination,
  Paper,
  Progress,
  Select,
  Stack,
  Tabs,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { Bus, ChevronRight, Receipt, Wallet } from 'lucide-react';
import { formatGhs, sumPesewas } from '@/features/fees/money';
import { PAGE_SIZE } from '@/lib/pagination';
import { useAuth } from '@/lib/auth';
import { parentApi } from '../api';
import { EmptyState, PageTitle, QueryView, WithWard } from '../components';
import { formatDate, invoiceStatus, percent, wardName } from '../format';
import type { ParentInvoice, ParentPayment, Ward } from '../types';
import { useParentQuery } from '../useParentQuery';
import { OptionalServices } from './OptionalServices';

export function FeesPage() {
  return <WithWard>{(ward) => <WardFees key={ward.studentId} ward={ward} />}</WithWard>;
}

function WardFees({ ward }: { ward: Ward }) {
  const { can } = useAuth();
  const [tab, setTab] = useState<string | null>('bills');
  return (
    <>
      <PageTitle title="Fees" subtitle={`Bills, payments and services for ${wardName(ward)}`} />
      <Tabs value={tab} onChange={setTab} color="fastrackRed" keepMounted={false}>
        <Tabs.List grow mb="md">
          <Tabs.Tab value="bills" leftSection={<Wallet size={16} />}>
            Bills
          </Tabs.Tab>
          {can('payments:read') && (
            <Tabs.Tab value="payments" leftSection={<Receipt size={16} />}>
              Payments
            </Tabs.Tab>
          )}
          <Tabs.Tab value="services" leftSection={<Bus size={16} />}>
            Services
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="bills">
          <Bills ward={ward} />
        </Tabs.Panel>
        <Tabs.Panel value="payments">
          <Payments ward={ward} />
        </Tabs.Panel>
        <Tabs.Panel value="services">
          <OptionalServices ward={ward} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

function Bills({ ward }: { ward: Ward }) {
  const [termId, setTermId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const terms = useParentQuery(`terms:${ward.studentId}`, () =>
    parentApi.listTerms(ward.studentId),
  );
  const invoices = useParentQuery(`invoices:${ward.studentId}:${termId ?? 'all'}:${page}`, () =>
    parentApi.listInvoices(ward.studentId, { page, termId }),
  );

  return (
    <Stack gap="md">
      <Select
        aria-label="Term"
        placeholder="All terms"
        clearable
        data={(terms.data ?? []).map((term) => ({
          value: term.id,
          label: `${term.label}, ${term.yearLabel}${term.isCurrent ? ' (current)' : ''}`,
        }))}
        value={termId}
        onChange={(value) => {
          setTermId(value);
          setPage(1);
        }}
      />
      <QueryView
        query={invoices}
        empty={{
          when: (result) => result.items.length === 0,
          render: () => (
            <EmptyState
              icon={<Wallet size={22} />}
              title="No bills yet"
              message="Bills appear here once the school issues them."
            />
          ),
        }}
      >
        {(result) => (
          <>
            <OutstandingCard invoices={result.items} />
            <Stack gap="sm">
              {result.items.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </Stack>
            {result.total > PAGE_SIZE && (
              <Group justify="center">
                <Pagination
                  total={Math.ceil(result.total / PAGE_SIZE)}
                  value={page}
                  onChange={setPage}
                  color="fastrackRed"
                  size="sm"
                />
              </Group>
            )}
          </>
        )}
      </QueryView>
    </Stack>
  );
}

function OutstandingCard({ invoices }: { invoices: ParentInvoice[] }) {
  const outstanding = sumPesewas(invoices, (inv) => Math.max(inv.balance, 0));
  const payable = sumPesewas(invoices, (inv) => inv.feePayable);
  const paid = sumPesewas(invoices, (inv) => inv.totalPayment);
  return (
    <Paper
      radius="lg"
      p="lg"
      style={{ background: 'linear-gradient(135deg, #e01a2b 0%, #9f0f1c 100%)', color: 'white' }}
    >
      <Text size="sm" opacity={0.85}>
        Outstanding
      </Text>
      <Text fz={30} fw={800} style={{ fontFamily: 'var(--font-heading)' }}>
        {formatGhs(outstanding)}
      </Text>
      <Progress
        value={percent(paid, payable) ?? 0}
        color="white"
        bg="rgba(255,255,255,0.25)"
        mt="sm"
        size="sm"
      />
      <Text size="xs" mt={6} opacity={0.85}>
        {formatGhs(paid)} paid of {formatGhs(payable)}
      </Text>
    </Paper>
  );
}

function InvoiceCard({ invoice }: { invoice: ParentInvoice }) {
  return (
    <UnstyledButton component={Link} href={`/parent/fees/${invoice.id}`}>
      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" wrap="nowrap">
          <div style={{ minWidth: 0 }}>
            <Group gap={6}>
              <Text fw={700}>
                {invoice.termLabel
                  ? `${invoice.termLabel}, ${invoice.yearLabel}`
                  : invoice.invoiceNumber}
              </Text>
              <Badge size="sm" variant="light" color={invoiceStatus(invoice.status).color}>
                {invoiceStatus(invoice.status).label}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              {invoice.invoiceNumber}
              {invoice.dueDate && invoice.balance > 0
                ? ` · Due ${formatDate(invoice.dueDate)}`
                : ''}
            </Text>
          </div>
          <Group gap={4} wrap="nowrap">
            <div style={{ textAlign: 'right' }}>
              <Text fw={700}>{formatGhs(Math.max(invoice.balance, 0))}</Text>
              <Text size="xs" c="dimmed">
                of {formatGhs(invoice.feePayable)}
              </Text>
            </div>
            <ChevronRight size={18} color="var(--mantine-color-gray-5)" />
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}

function Payments({ ward }: { ward: Ward }) {
  const [page, setPage] = useState(1);
  const payments = useParentQuery(`payments:${ward.studentId}:${page}`, () =>
    parentApi.listPayments(ward.studentId, { page }),
  );
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
          {result.total > PAGE_SIZE && (
            <Group justify="center">
              <Pagination
                total={Math.ceil(result.total / PAGE_SIZE)}
                value={page}
                onChange={setPage}
                color="fastrackRed"
                size="sm"
              />
            </Group>
          )}
        </Stack>
      )}
    </QueryView>
  );
}

function PaymentRow({ payment }: { payment: ParentPayment }) {
  return (
    <UnstyledButton component={Link} href={`/parent/receipts/${payment.id}`}>
      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" wrap="nowrap">
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
            <ChevronRight size={18} color="var(--mantine-color-gray-5)" />
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
