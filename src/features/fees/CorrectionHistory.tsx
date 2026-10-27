'use client';

import { useEffect, useState } from 'react';
import { Button, Divider, Group, Loader, Stack, Text } from '@mantine/core';
import { errorMessage } from '@/lib/api-client';
import { isRole, ROLE_LABELS } from '@/lib/rbac';
import { feesApi, type Invoice, type InvoiceCorrection } from './api';
import { formatGhs } from './money';

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const amountOrNone = (amount: number | null) => (amount === null ? 'none' : formatGhs(amount));

/**
 * Who corrected the bill, when, why and what changed, newest first (QA-042).
 * Loaded on demand, and again whenever the bill changes, e.g. after a correction.
 */
export function CorrectionHistory({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<InvoiceCorrection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    setError(null);
    feesApi
      .invoiceHistory(invoice.id)
      .then((list) => current && setEntries(list))
      .catch((err) => current && setError(errorMessage(err, 'Could not load the history.')));
    return () => {
      current = false;
    };
  }, [open, invoice]);

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Divider label="Correction history" labelPosition="left" style={{ flex: 1 }} />
        <Button
          size="compact-xs"
          variant="subtle"
          onClick={() => setOpen((o) => !o)}
          id="btn-invoice-history"
        >
          {open ? 'Hide' : 'Show'}
        </Button>
      </Group>
      {open &&
        (error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : !entries ? (
          <Loader size="sm" />
        ) : entries.length === 0 ? (
          <Text size="sm" c="dimmed">
            No corrections.
          </Text>
        ) : (
          entries.map((entry) => <Correction key={entry.id} entry={entry} />)
        ))}
    </Stack>
  );
}

function Correction({ entry }: { entry: InvoiceCorrection }) {
  const role = isRole(entry.actorRole) ? ROLE_LABELS[entry.actorRole] : entry.actorRole;
  const { before, after } = entry;
  return (
    <Stack gap={2} pb="xs" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <Text size="sm" fw={600}>
        {entry.reason || 'No reason given'}
      </Text>
      <Text size="xs" c="dimmed">
        {[
          when(entry.createdAt),
          [entry.actorName ?? 'Unknown', role].filter(Boolean).join(', '),
        ].join(' · ')}
      </Text>
      {entry.lines.map((line) => (
        <Text key={line.name} size="xs">
          {line.name}: {amountOrNone(line.before)} → {amountOrNone(line.after)}
        </Text>
      ))}
      {before && after && before.discountAmount !== after.discountAmount ? (
        <Text size="xs">
          Discount: {formatGhs(before.discountAmount)} → {formatGhs(after.discountAmount)}
        </Text>
      ) : null}
      {before && after ? (
        <Text size="xs" fw={600}>
          Balance: {formatGhs(before.balance)} → {formatGhs(after.balance)}
        </Text>
      ) : null}
    </Stack>
  );
}
