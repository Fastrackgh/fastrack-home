'use client';

import type { ReactNode } from 'react';
import { Box, Card, Group, SimpleGrid, Text } from '@mantine/core';
import { DollarSign, FileText, TrendingUp, Wallet } from 'lucide-react';
import type { Invoice } from './api';
import { formatGhs, sumPesewas } from './money';

/** Totals of the invoices currently listed (one page), not of the whole school. */
export function FeeMetrics({ invoices }: { invoices: Invoice[] }) {
  const billed = sumPesewas(invoices, (inv) => inv.feePayable);
  const collected = sumPesewas(invoices, (inv) => inv.totalPayment);
  const outstanding = sumPesewas(invoices, (inv) => inv.balance);
  const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
      <MetricCard
        label="Total Invoiced"
        icon={<FileText size={20} color="#3b82f6" />}
        tint="rgba(59, 130, 246, 0.1)"
        value={formatGhs(billed)}
        note={`Across the ${invoices.length} invoices shown`}
      />
      <MetricCard
        label="Total Collected"
        icon={<DollarSign size={20} color="#10b981" />}
        tint="rgba(16, 185, 129, 0.1)"
        value={formatGhs(collected)}
        valueColor="teal.7"
        note={`${rate}% revenue realized`}
        noteColor="teal.7"
      />
      <MetricCard
        label="Outstanding Arrears"
        icon={<Wallet size={20} color="#e01a2b" />}
        tint="rgba(224, 26, 43, 0.1)"
        value={formatGhs(outstanding)}
        valueColor="red.7"
        note="Pending student fee balances"
      />
      <MetricCard
        label="Collection Efficiency"
        icon={<TrendingUp size={20} color="#a855f7" />}
        tint="rgba(168, 85, 247, 0.1)"
        value={`${rate}%`}
        note="Of the invoices shown"
      />
    </SimpleGrid>
  );
}

function MetricCard({
  label,
  icon,
  tint,
  value,
  valueColor,
  note,
  noteColor = 'dimmed',
}: {
  label: string;
  icon: ReactNode;
  tint: string;
  value: string;
  valueColor?: string;
  note: string;
  noteColor?: string;
}) {
  return (
    <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
      <Group justify="space-between" align="flex-start">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {label}
        </Text>
        <Box
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Group>
      <Text
        fw={800}
        size="1.6rem"
        mt="md"
        c={valueColor}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {value}
      </Text>
      <Text size="sm" c={noteColor}>
        {note}
      </Text>
    </Card>
  );
}
