'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { Info, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLeaveOnWardChange } from '../data/ActiveWardProvider';
import { parentDocuments, useInvoice } from '../data/queries';
import { formatDate } from '../domain/format';
import {
  balanceNote,
  canPayOnline,
  formatBalance,
  invoiceStatus,
  invoiceTermLabel,
  isInCredit,
  paysAtSchoolOnly,
} from '../domain/invoices';
import { parentRoutes } from '../routes';
import type { ParentInvoice, Ward } from '../types';
import { BackLink, DocumentButton, QueryView, WithWard } from '../ui';
import { InvoiceBreakdown } from './InvoiceBreakdown';
import { PayInvoiceModal } from './PayInvoiceModal';

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  useLeaveOnWardChange(parentRoutes.fees);
  return (
    <>
      <BackLink href={parentRoutes.fees}>Fees</BackLink>
      <WithWard module="fees">
        {(ward) => <WardInvoice ward={ward} invoiceId={invoiceId} />}
      </WithWard>
    </>
  );
}

function WardInvoice({ ward, invoiceId }: { ward: Ward; invoiceId: string }) {
  const query = useInvoice(ward.studentId, invoiceId);
  return (
    <QueryView query={query}>
      {(invoice) => (
        <Stack gap="md">
          <BalanceCard ward={ward} invoice={invoice} />
          <InvoiceBreakdown invoice={invoice} />
          <DocumentButton
            label="View printable bill"
            title={`Bill ${invoice.invoiceNumber}`}
            source={parentDocuments.invoice(ward.studentId, invoice.id)}
          />
        </Stack>
      )}
    </QueryView>
  );
}

/** The balance, its status, and the way to pay it. */
function BalanceCard({ ward, invoice }: { ward: Ward; invoice: ParentInvoice }) {
  const { can } = useAuth();
  const { online } = useNetwork();
  const [paying, setPaying] = useState(false);
  const status = invoiceStatus(invoice.status);
  const owing = invoice.balance > 0;

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="sm" c="dimmed">
            {invoiceTermLabel(invoice, 'Fee bill')}
          </Text>
          <Title order={2} c={isInCredit(invoice) ? 'green' : undefined}>
            {formatBalance(invoice)}
          </Title>
          <Text size="xs" c="dimmed">
            {balanceNote(invoice)}
            {owing && invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ''}
          </Text>
        </div>
        <Badge variant="light" color={status.color}>
          {status.label}
        </Badge>
      </Group>
      {canPayOnline(invoice, can('payments:make')) && (
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
      {paysAtSchoolOnly(invoice) && (
        <Alert mt="md" color="blue" radius="md" icon={<Info size={16} />}>
          This school does not take online payments yet. Pay at the school&apos;s accounts office.
        </Alert>
      )}
      {paying && (
        <PayInvoiceModal
          onClose={() => setPaying(false)}
          studentId={ward.studentId}
          invoice={invoice}
        />
      )}
    </Card>
  );
}
