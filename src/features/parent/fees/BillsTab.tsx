'use client';

import { useState } from 'react';
import { Select, Stack } from '@mantine/core';
import { Wallet } from 'lucide-react';
import { useInvoiceSummary, useInvoices, useTerms } from '../data/queries';
import type { AcademicTerm, Ward } from '../types';
import { EmptyState, ErrorAlert, ListPagination, QueryView, RetryButton } from '../ui';
import { InvoiceCard } from './InvoiceCard';
import { OutstandingCard } from './OutstandingCard';

const termOption = (term: AcademicTerm) => ({
  value: term.id,
  label: `${term.label}, ${term.yearLabel}${term.isCurrent ? ' (current)' : ''}`,
});

export function BillsTab({ ward }: { ward: Ward }) {
  const [termId, setTermId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const terms = useTerms(ward.studentId);
  const invoices = useInvoices(ward.studentId, { page, termId });
  // Totals come from the backend, not the visible page: a sum of bills counts
  // carried-over balances twice and misses other pages (QA-222).
  const summary = useInvoiceSummary(ward.studentId, termId);

  const chooseTerm = (value: string | null) => {
    setTermId(value);
    setPage(1);
  };

  return (
    <Stack gap="md">
      <Select
        aria-label="Term"
        placeholder="All terms"
        clearable
        data={(terms.data ?? []).map(termOption)}
        value={termId}
        onChange={chooseTerm}
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
              <ErrorAlert title="Could not load the totals">
                <RetryButton onClick={summary.reload} />
              </ErrorAlert>
            ) : null}
            <Stack gap="sm">
              {result.items.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </Stack>
            <ListPagination total={result.total} page={page} onChange={setPage} />
          </>
        )}
      </QueryView>
    </Stack>
  );
}
