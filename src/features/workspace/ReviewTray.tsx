'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Drawer, Group, Stack, Table, Text } from '@mantine/core';
import { registerAttendanceResolver } from '@/features/attendance/sync';
import { itemNameKey, registerMarksResolver } from '@/features/results/marks-sync';
import { formatAge } from '@/lib/format';
import type { ReviewItem } from '@/lib/offline/outbox';
import {
  canResend,
  resendLabel,
  reviewExplanation,
  dismissReviewItem,
  listReviewItems,
  resendReviewItem,
} from '@/lib/offline/syncEngine';
import { useSyncStatus } from '@/lib/offline/useSyncStatus';

// "Keep mine" for each feature that queues writes; the tray can open on any page.
registerAttendanceResolver();
registerMarksResolver();

/** Fields that describe a write, not its value. */
const META_FIELDS = new Set(['updatedBy', 'updatedAt', 'rowVersion', 'version', 'id']);

/** `arrivalTime` → "Arrival time". */
const fieldLabel = (key: string) => {
  // "descriptorBandId" → "Descriptor band": the id itself shows as a name.
  const words = key
    .replace(/Id$/, '')
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const show = (value: unknown) =>
  value === null || value === undefined || value === ''
    ? 'blank'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** What the device sent for each field: `changes[f].to`, or the plain body (contract §3). */
function sentValues(item: ReviewItem): Record<string, unknown> {
  let body: Record<string, unknown> = {};
  try {
    body = asRecord(item.op.body ? JSON.parse(item.op.body) : {});
  } catch {
    // An unreadable body shows no values.
  }
  const changes = asRecord(body.changes);
  return Object.keys(changes).length
    ? Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, asRecord(v).to]))
    : body;
}

/** Rows of "field: on the server / yours" for a clash. */
function clashRows(item: ReviewItem): { field: string; theirs: unknown; mine: unknown }[] {
  if (item.kind === 'cell' && item.cell) {
    const { current, mine } = item.cell;
    const fields = [...new Set([...Object.keys(mine), ...Object.keys(current)])].filter(
      (f) => !META_FIELDS.has(f),
    );
    return fields
      .map((field) => ({ field, theirs: current[field], mine: mine[field] }))
      .filter((row) => show(row.theirs) !== show(row.mine));
  }
  if (item.kind === 'conflict') {
    const current = asRecord(item.error?.current);
    const mine = sentValues(item);
    const fields = item.error?.conflictingFields?.length
      ? item.error.conflictingFields
      : Object.keys(mine).filter((f) => !META_FIELDS.has(f));
    return fields.map((field) => ({ field, theirs: current[field], mine: mine[field] }));
  }
  return [];
}

const KIND_BADGE: Record<ReviewItem['kind'], { label: string; color: string }> = {
  conflict: { label: 'Changed by someone else', color: 'orange' },
  cell: { label: 'Changed by someone else', color: 'orange' },
  rejected: { label: 'Not accepted', color: 'red' },
  forwarded: { label: 'Sent to the head teacher', color: 'blue' },
};

function ReviewCard({ item, onDone }: { item: ReviewItem; onDone: () => void }) {
  const [busy, setBusy] = useState<'dismiss' | 'resend' | null>(null);
  const rows = clashRows(item);
  const current = item.kind === 'cell' ? item.cell?.current : asRecord(item.error?.current);
  const by = typeof current?.updatedBy === 'string' ? current.updatedBy : null;
  const badge = KIND_BADGE[item.kind];
  const clash = item.kind === 'conflict' || item.kind === 'cell';
  // Names kept on the op for the cell: its pupil, and (marks) its test.
  const names = item.op.names ?? {};
  /** An id the op has a name for (a pupil, a band) shows as that name. */
  const named = (value: unknown) =>
    typeof value === 'string' && names[value] ? names[value] : show(value);
  const cell = item.cell?.cell ?? {};
  const pupil = [
    names[String(cell.schoolStudentId)],
    cell.componentKey !== undefined
      ? names[itemNameKey(String(cell.componentKey), Number(cell.itemIndex))]
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  const act = async (action: 'dismiss' | 'resend') => {
    setBusy(action);
    try {
      if (action === 'dismiss') await dismissReviewItem(item.id);
      else await resendReviewItem(item.id);
    } finally {
      setBusy(null);
      onDone();
    }
  };

  return (
    <Card withBorder radius="md" padding="sm">
      <Stack gap={6}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text size="sm" fw={600}>
            {item.op.label}
            {pupil ? ` · ${pupil}` : ''}
          </Text>
          {item.kind !== 'forwarded' && (
            <Badge
              size="xs"
              variant="light"
              color={badge.color}
              tt="none"
              style={{ flexShrink: 0, overflow: 'visible' }}
            >
              {badge.label}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          Made {formatAge(item.op.createdAt)}
          {by ? ` · changed by ${by}` : ''}
        </Text>
        {item.kind === 'forwarded' ? (
          <Text size="sm">
            You no longer have access to this, so it was passed to the head teacher or an admin, who
            can apply or dismiss it.
          </Text>
        ) : (
          item.error?.message &&
          !(clash && rows.length) && (
            <Text size="sm">
              {reviewExplanation(item) ??
                (item.error.status === 403
                  ? 'You no longer have permission to make this change, so it wasn’t saved. Ask the head teacher or an admin if it’s still needed.'
                  : item.error.message)}
            </Text>
          )
        )}
        {rows.length > 0 && (
          <Table withRowBorders={false} verticalSpacing={2} fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th />
                <Table.Th>Now</Table.Th>
                <Table.Th>Yours</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.field}>
                  <Table.Td c="dimmed">{fieldLabel(row.field)}</Table.Td>
                  <Table.Td>{named(row.theirs)}</Table.Td>
                  <Table.Td fw={600}>{named(row.mine)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        <Group justify="flex-end" gap="xs">
          {item.kind === 'forwarded' ? (
            <Button
              size="compact-sm"
              variant="default"
              loading={busy === 'dismiss'}
              onClick={() => act('dismiss')}
            >
              OK
            </Button>
          ) : (
            <>
              <Button
                size="compact-sm"
                variant="default"
                loading={busy === 'dismiss'}
                disabled={busy !== null}
                onClick={() => act('dismiss')}
              >
                {clash ? 'Keep theirs' : 'Discard my change'}
              </Button>
              {canResend(item) && (
                <Button
                  size="compact-sm"
                  loading={busy === 'resend'}
                  disabled={busy !== null}
                  onClick={() => act('resend')}
                >
                  {clash ? 'Keep mine' : (resendLabel(item) ?? 'Send again')}
                </Button>
              )}
            </>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

/**
 * The Needs review tray (plan F4): changes the server couldn't apply as made.
 * A clash shows the value now on the server beside the device's; the user
 * keeps theirs (dismiss) or keeps mine (a new op from the feature's resolver,
 * `registerReviewResolver`). Changes passed to the head teacher (§6.2) are
 * listed for information.
 */
export function ReviewTray({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { review, forwarded } = useSyncStatus();
  const [items, setItems] = useState<ReviewItem[]>([]);

  const load = useCallback(() => {
    listReviewItems().then(setItems, () => setItems([]));
  }, []);

  // Reload when opened and whenever the counts change (another tab, a new conflict).
  useEffect(() => {
    if (opened) load();
  }, [opened, load, review, forwarded]);

  const needs = items.filter((item) => item.kind !== 'forwarded');
  const passed = items.filter((item) => item.kind === 'forwarded');

  return (
    <Drawer opened={opened} onClose={onClose} position="right" title="Needs review" size="md">
      <Stack gap="md">
        {items.length === 0 && (
          <Text size="sm" c="dimmed">
            Nothing to review. Every change you made has been applied.
          </Text>
        )}
        {needs.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              These changes couldn&apos;t be applied as you made them. Choose what to keep.
            </Text>
            {needs.map((item) => (
              <ReviewCard key={item.id} item={item} onDone={load} />
            ))}
          </Stack>
        )}
        {passed.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Sent to the head teacher
            </Text>
            {passed.map((item) => (
              <ReviewCard key={item.id} item={item} onDone={load} />
            ))}
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
