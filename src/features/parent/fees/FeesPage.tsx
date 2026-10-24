'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
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
import { formatGhs } from '@/features/fees/money';
import { PAGE_SIZE } from '@/lib/pagination';
import { useAuth } from '@/lib/auth';
import { parentApi } from '../api';
import { EmptyState, PageTitle, QueryView, WithWard } from '../components';
import { formatDate, invoiceStatus, percent, wardName } from '../format';
import type { ParentInvoice, ParentInvoiceSummary, ParentPayment, Ward } from '../types';
import { useParentQuery } from '../useParentQuery';
import { OptionalServices } from './OptionalServices';

export function FeesPage() {
  return (
    <WithWard module="fees">{(ward) => <WardFees key={ward.studentId} ward={ward} />}</WithWard>
  );
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
  // Totals come from the backend, not the visible page: a sum of bills counts
  // carried-over balances twice and misses other pages (QA-222).
  const summary = useParentQuery(`invoice-summary:${ward.studentId}:${termId ?? 'all'}`, () =>
    parentApi.invoiceSummary(ward.studentId, termId),
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
            {summary.data ? (
              <OutstandingCard summary={summary.data} />
            ) : summary.error ? (
              <Alert color="red" radius="md" title="Could not load the totals">
                <Button size="xs" variant="light" color="red" onClick={summary.reload}>
                  Try again
                </Button>
              </Alert>
            ) : null}
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

function OutstandingCard({ summary }: { summary: ParentInvoiceSummary }) {
  const { totalBilled, totalPaid, outstanding, overpaid, broughtForward, carriedForward } = summary;
  // A bill can hold a credit while another still owes (QA-243), so the headline
  // nets the two and the notes explain what was netted.
  const net = outstanding - overpaid;
  const inCredit = net < 0;
  const notes = [
    broughtForward > 0 &&
      `Includes ${formatGhs(broughtForward)} brought forward from earlier bills`,
    carriedForward > 0 && `${formatGhs(carriedForward)} moved to a later bill`,
    overpaid > 0 &&
      outstanding > 0 &&
      (inCredit
        ? `After ${formatGhs(outstanding)} still owed on another bill`
        : `After ${formatGhs(overpaid)} credit from an earlier bill`),
  ].filter((note): note is string => Boolean(note));
  return (
    <Paper
      radius="lg"
      p="lg"
      style={{ background: 'linear-gradient(135deg, #e01a2b 0%, #9f0f1c 100%)', color: 'white' }}
    >
      <Text size="sm" opacity={0.85}>
        {inCredit ? 'In credit' : 'Outstanding'}
      </Text>
      <Text fz={30} fw={800} style={{ fontFamily: 'var(--font-heading)' }}>
        {formatGhs(Math.abs(net))}
      </Text>
      <Progress
        value={Math.min(percent(totalPaid, totalBilled) ?? 0, 100)}
        color="white"
        bg="rgba(255,255,255,0.25)"
        mt="sm"
        size="sm"
      />
      <Text size="xs" mt={6} opacity={0.85}>
        {formatGhs(totalPaid)} paid of {formatGhs(totalBilled)}
      </Text>
      {notes.map((note) => (
        <Text key={note} size="xs" mt={2} opacity={0.85}>
          {note}
        </Text>
      ))}
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
              {/* A credit bigger than the fees leaves a negative balance (QA-244). */}
              {invoice.balance < 0 ? (
                <>
                  <Text fw={700} c="green">
                    {formatGhs(-invoice.balance)} credit
                  </Text>
                  <Text size="xs" c="dimmed">
                    Nothing to pay
                  </Text>
                </>
              ) : (
                <>
                  <Text fw={700}>{formatGhs(invoice.balance)}</Text>
                  <Text size="xs" c="dimmed">
                    {invoice.feePayable > 0
                      ? `of ${formatGhs(invoice.feePayable)}`
                      : 'Covered by credit'}
                  </Text>
                </>
              )}
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
