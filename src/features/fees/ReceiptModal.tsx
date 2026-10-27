'use client';

import type { ReactNode } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Printer } from 'lucide-react';
import type { Payment } from './api';
import { formatGhs } from './money';

interface ReceiptSchool {
  name?: string;
  code?: string | null;
  address?: string | null;
}

export function ReceiptModal({
  payment,
  school,
  onClose,
}: {
  payment: Payment | null;
  school: ReceiptSchool | null;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={payment !== null}
      onClose={onClose}
      title={<Text fw={700}>Official Payment Receipt</Text>}
      size="md"
      radius="lg"
      centered
    >
      {payment ? (
        <Stack gap="md" p="xs" id="printable-receipt">
          <Box ta="center" pb="sm" style={{ borderBottom: '2px solid #e2e8f0' }}>
            <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
              {school?.name}
            </Title>
            <Text size="xs" c="dimmed">
              {[school?.code && `School Code: ${school.code}`, school?.address]
                .filter(Boolean)
                .join(' • ')}
            </Text>
            <Badge color="teal" variant="light" size="lg" mt="xs">
              OFFICIAL RECEIPT — PAID & VERIFIED
            </Badge>
          </Box>

          <SimpleGrid cols={2} spacing="xs">
            <Field label="Receipt Number:">
              <Text size="sm" fw={700}>
                {payment.receiptNumber}
              </Text>
            </Field>
            <Field label="Payment Date:" right>
              <Text size="sm" fw={600}>
                {payment.paymentDate}
              </Text>
            </Field>
            <Field label="Student Name:">
              <Text size="sm" fw={700}>
                {payment.studentName || 'Student'}
              </Text>
              <Text size="xs" c="dimmed">
                {payment.studentCode || ''}
              </Text>
            </Field>
            <Field label="Class Cohort:" right>
              <Text size="sm" fw={600}>
                {payment.className || '—'}
              </Text>
            </Field>
            {payment.invoiceNumber ? (
              <Field label="Bill Paid:">
                <Text size="sm" fw={600}>
                  {payment.invoiceNumber}
                </Text>
              </Field>
            ) : null}
          </SimpleGrid>

          <Divider />

          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Payment Method:
              </Text>
              <Badge variant="light" color="dark">
                {[payment.paymentMethod, payment.bankType].filter(Boolean).join(' • ')}
              </Badge>
            </Group>
            {payment.transactionReference ? (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Transaction Reference:
                </Text>
                <Text size="sm" fw={600}>
                  {payment.transactionReference}
                </Text>
              </Group>
            ) : null}
            {payment.sharedTransfer?.payments.length ? (
              <Text size="xs" c="dimmed" ta="right" id="receipt-shared-transfer">
                Part of transfer {payment.sharedTransfer.reference} · also covers{' '}
                {payment.sharedTransfer.payments
                  .map((p) => `${p.studentName} (${p.receiptNumber})`)
                  .join(', ')}
              </Text>
            ) : null}
            <Group
              justify="space-between"
              py="xs"
              style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}
            >
              <Text size="md" fw={700}>
                Amount Paid:
              </Text>
              <Text size="lg" fw={800} c="teal.7">
                {formatGhs(payment.amountPaid)}
              </Text>
            </Group>
            {payment.balancesRecorded === false ? (
              <>
                <BalanceLine label="Account balance before:" value="—" />
                <BalanceLine label="Account balance after:" value="—" />
                <Text size="xs" c="dimmed">
                  Balances weren&apos;t recorded for payments made before 27 Oct 2026.
                </Text>
              </>
            ) : (
              <>
                <BalanceLine
                  label="Account balance before:"
                  value={accountBalance(payment.previousBalance)}
                />
                <BalanceLine
                  label={payment.newBalance < 0 ? 'Credit on account:' : 'Account balance after:'}
                  value={formatGhs(Math.abs(payment.newBalance))}
                  color={payment.newBalance > 0 ? 'red.7' : 'teal.7'}
                  strong
                />
              </>
            )}
          </Stack>

          <Box ta="center" pt="md" style={{ borderTop: '1px dashed #cbd5e1' }}>
            <Text size="xs" c="dimmed">
              Issued by {payment.recordedByName || 'Finance Cashier'} • Fastrack Cloud ERP
            </Text>
          </Box>

          <Group justify="space-between" mt="sm">
            <Button variant="default" onClick={onClose} radius="md">
              Close
            </Button>
            <Button
              leftSection={<Printer size={16} />}
              color="fastrackRed"
              radius="md"
              onClick={() => window.print()}
              id="btn-print-receipt"
            >
              Print Receipt
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}

/** A negative balance is money the school holds for the student (QA-277). */
const accountBalance = (balance: number) =>
  balance < 0 ? `${formatGhs(-balance)} credit` : formatGhs(balance);

function BalanceLine({
  label,
  value,
  color,
  strong = false,
}: {
  label: string;
  value: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <Group justify="space-between">
      <Text size="sm" c={strong ? undefined : 'dimmed'} fw={strong ? 700 : undefined}>
        {label}
      </Text>
      <Text size="sm" fw={strong ? 800 : undefined} c={color}>
        {value}
      </Text>
    </Group>
  );
}

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: boolean;
  children: ReactNode;
}) {
  return (
    <Box ta={right ? 'right' : undefined}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {children}
    </Box>
  );
}
