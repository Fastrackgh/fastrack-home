'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Printer } from 'lucide-react';
import { cachedSchoolLogo } from '@/lib/offline/syncEngine';
import type { Payment } from './api';
import { formatGhs } from './money';
import { warningText } from './payments-sync';

interface ReceiptSchool {
  name?: string;
  code?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

/**
 * The school's logo: the copy kept on the device when it's the same logo
 * (so an offline print shows the crest), else the live URL.
 */
function useLogo(url: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(url ?? null);
  useEffect(() => {
    let objectUrl: string | null = null;
    let current = true;
    setSrc(url ?? null);
    cachedSchoolLogo()
      .then((cached) => {
        if (!current || !cached || (url && cached.url !== url)) return;
        objectUrl = URL.createObjectURL(cached.blob);
        setSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return src;
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
  const logo = useLogo(school?.logoUrl);
  const provisional = payment?.pending === true;
  // The number first printed, when the payment was taken offline and has synced since.
  const wasProvisional = !provisional ? (payment?.printedRef ?? payment?.provisionalRef) : null;
  return (
    <Modal
      opened={payment !== null}
      onClose={onClose}
      title={
        <Text fw={700}>
          {provisional ? 'Provisional Payment Receipt' : 'Official Payment Receipt'}
        </Text>
      }
      size="md"
      radius="lg"
      centered
    >
      {payment ? (
        <Stack gap="md" p="xs" id="printable-receipt">
          <Box ta="center" pb="sm" style={{ borderBottom: '2px solid #e2e8f0' }}>
            {logo ? (
              <Image
                src={logo}
                alt=""
                fit="contain"
                mx="auto"
                mb={4}
                style={{ height: 56, maxHeight: 56, width: 'auto' }}
                id="receipt-logo"
              />
            ) : null}
            <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
              {school?.name}
            </Title>
            <Text size="xs" c="dimmed">
              {[school?.code && `School Code: ${school.code}`, school?.address]
                .filter(Boolean)
                .join(' • ')}
            </Text>
            {provisional ? (
              <Badge color="yellow" variant="filled" size="lg" mt="xs" id="receipt-provisional">
                PROVISIONAL — PENDING SYNC
              </Badge>
            ) : (
              <Badge color="teal" variant="light" size="lg" mt="xs">
                OFFICIAL RECEIPT — PAID & VERIFIED
              </Badge>
            )}
          </Box>

          {provisional ? (
            <Text size="xs" c="dimmed" ta="center">
              Taken on this device while offline. It gets an official RCT number when the device
              syncs; keep this receipt until then.
            </Text>
          ) : wasProvisional ? (
            <Text size="xs" ta="center" id="receipt-was-provisional">
              Provisional receipt <b>{wasProvisional}</b>
              {payment.printedRef && payment.provisionalRef !== payment.printedRef
                ? ` (renumbered ${payment.provisionalRef})`
                : ''}{' '}
              is now <b>{payment.receiptNumber}</b>.
            </Text>
          ) : null}

          <SimpleGrid cols={2} spacing="xs">
            <Field label={provisional ? 'Provisional Number:' : 'Receipt Number:'}>
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

          {payment.warnings?.length ? (
            <Stack gap={4} id="receipt-warnings">
              {payment.warnings.map((warning, i) => (
                <Alert
                  key={i}
                  color={warning.code === 'POSSIBLE_DOUBLE_PAYMENT' ? 'red' : 'yellow'}
                  radius="md"
                  p="xs"
                >
                  <Text size="xs">{warningText(warning)}</Text>
                </Alert>
              ))}
            </Stack>
          ) : null}

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
