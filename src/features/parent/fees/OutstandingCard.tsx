'use client';

import { Paper, Progress, Text } from '@mantine/core';
import { formatGhs } from '@/features/fees/money';
import { summaryHeadline } from '../domain/invoices';
import type { ParentInvoiceSummary } from '../types';
import classes from './fees.module.css';

/** What is owed (or held in credit) across the bills shown, with how much is paid. */
export function OutstandingCard({ summary }: { summary: ParentInvoiceSummary }) {
  const { inCredit, amount, paidPercent, notes } = summaryHeadline(summary);
  return (
    <Paper radius="lg" p="lg" className={classes.outstanding}>
      <Text size="sm" opacity={0.85}>
        {inCredit ? 'In credit' : 'Outstanding'}
      </Text>
      <Text fz={30} fw={800} className="font-heading">
        {formatGhs(amount)}
      </Text>
      <Progress value={paidPercent} color="white" bg="rgba(255,255,255,0.25)" mt="sm" size="sm" />
      <Text size="xs" mt={6} opacity={0.85}>
        {formatGhs(summary.totalPaid)} paid of {formatGhs(summary.totalBilled)}
      </Text>
      {notes.map((note) => (
        <Text key={note} size="xs" mt={2} opacity={0.85}>
          {note}
        </Text>
      ))}
    </Paper>
  );
}
