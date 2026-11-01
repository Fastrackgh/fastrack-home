'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  JsonInput,
  Loader,
  Modal,
  Pagination,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { formatCedis } from '@/features/fees/money';
import { formatDay } from '@/features/calendar/dates';
import { setupApi } from '@/features/school-setup/api';
import { studentsApi } from '@/features/students/api';
import { PageHeader } from '@/features/workspace';
import { errorCode, errorMessage } from '@/lib/api-client';
import { PAGE_SIZE, type Raw } from '@/lib/pagination';
import {
  ApplyRefused,
  REASONS,
  describe,
  syncReviewApi,
  type ForwardedChange,
  type ForwardedStatus,
} from './api';

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const at = (iso: string | null) => (iso ? when.format(new Date(iso)) : '');

const show = (value: unknown) =>
  value === null || value === undefined || value === ''
    ? 'blank'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

/** Body fields holding cedis, shown as money like the title ("GHS 8.90"). */
const MONEY_FIELDS = new Set(['amount']);

const showField = (key: string, value: unknown) =>
  MONEY_FIELDS.has(key) && typeof value === 'number' ? formatCedis(value) : show(value);

/** "paymentMethod" → "Payment method". */
const fieldLabel = (key: string) => {
  const words = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Body fields that name a pupil (contract: `studentId` on payments, `schoolStudentId` in sync). */
const PUPIL_FIELDS = new Set(['studentId', 'schoolStudentId']);
/** Fields for the server only: the value the device saw, the version it saw. */
const HIDDEN_FIELDS = new Set(['from', 'rowVersion']);

const pupilIdsOf = (body: Raw | null): string[] => {
  const ids: string[] = [];
  for (const [key, value] of Object.entries(body ?? {})) {
    if (PUPIL_FIELDS.has(key) && typeof value === 'string') ids.push(value);
    // A register's or mark sheet's entries each name a pupil.
    if (key === 'marks' && Array.isArray(value)) {
      for (const entry of value as Raw[]) {
        for (const field of PUPIL_FIELDS) {
          if (typeof entry?.[field] === 'string') ids.push(entry[field] as string);
        }
      }
    }
  }
  return ids;
};

/**
 * Names for the ids a page of changes holds: pupils as "Ama Mensah ·
 * BIS-001/STD/2026/009", classes by name. An id that can't be looked up
 * keeps showing as itself.
 */
async function lookupNames(changes: ForwardedChange[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const pupils = new Set(changes.flatMap((change) => pupilIdsOf(change.body)));
  const needClasses = changes.some((change) => typeof change.body?.classId === 'string');
  await Promise.all([
    ...[...pupils].map((id) =>
      studentsApi.get(id).then(
        (pupil) => void names.set(id, `${pupil.fullName} · ${pupil.studentCode}`),
        () => undefined,
      ),
    ),
    needClasses
      ? setupApi.allClasses().then(
          (classes) => classes.forEach((c) => names.set(c.id, c.className)),
          () => undefined,
        )
      : Promise.resolve(),
  ]);
  return names;
}

/** One register or mark-sheet entry's value: "Late · 08:15 · bus", "14", "ABS". */
function entryMark(entry: Raw): string {
  const status = String(entry.status ?? '');
  if (status === 'absent') return 'ABS';
  if (status === 'exempt') return 'EX';
  if (status === 'scored') return entry.rawScore != null ? String(entry.rawScore) : 'Band';
  return [status, entry.arrivalTime, entry.note].filter(Boolean).join(' · ') || 'Cleared';
}

/** A register's or mark sheet's entries as a small table: pupil, (test), mark. */
function EntriesTable({ entries, names }: { entries: Raw[]; names: Map<string, string> }) {
  const tests = entries.some((entry) => entry.componentKey !== undefined);
  return (
    <Table withRowBorders={false} verticalSpacing={0} fz="sm">
      <Table.Tbody>
        {entries.map((entry, i) => {
          const pupil = String(entry.schoolStudentId ?? entry.studentId ?? '');
          return (
            <Table.Tr key={i}>
              <Table.Td>{names.get(pupil)?.split(' · ')[0] ?? pupil}</Table.Td>
              {tests && (
                <Table.Td c="dimmed">
                  {String(entry.componentKey)} {String(entry.itemIndex)}
                </Table.Td>
              )}
              <Table.Td fw={600}>{entryMark(entry)}</Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

/** A body field for the reviewer: names for ids, a readable day, entries as a table. */
function fieldValue(key: string, value: unknown, names: Map<string, string>) {
  if (key === 'marks' && Array.isArray(value)) {
    return <EntriesTable entries={value as Raw[]} names={names} />;
  }
  if (typeof value === 'string' && names.has(value)) return names.get(value);
  if (key === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDay(value);
  }
  return showField(key, value);
}

const labelOf = (key: string) =>
  PUPIL_FIELDS.has(key)
    ? 'Pupil'
    : key === 'classId'
      ? 'Class'
      : key === 'marks'
        ? 'Entries'
        : fieldLabel(key);

/** Why an apply was refused, in words for the reviewer. */
function applyError(err: unknown): string {
  if (errorCode(err) === 'CONFLICT') {
    return 'This record changed after the change was made, so it wasn’t applied. Check the record, then edit and apply, or dismiss.';
  }
  return errorMessage(err, 'The change could not be applied.');
}

function ChangeCard({
  change,
  pupils,
  onDone,
}: {
  change: ForwardedChange;
  pupils: Map<string, string>;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [note, setNote] = useState('');
  /** The row as last seen: an apply can find it resolved meanwhile (another tab or reviewer). */
  const [row, setRow] = useState(change);
  const open = row.status === 'open';
  // An applied change shows what was really saved, with any edit beside what was sent (OFF-6).
  const edits = row.status === 'applied' && row.appliedWithEdits && row.appliedBody;
  const shown = (edits ? row.appliedBody : change.body) ?? {};
  const fields = Object.entries(shown).filter(([key]) => !HIDDEN_FIELDS.has(key));

  const apply = async (body: Raw | null) => {
    setBusy(true);
    setError(null);
    try {
      const { conflicts } = await syncReviewApi.apply(change, body);
      notifications.show({
        color: conflicts.length ? 'yellow' : 'green',
        title: 'Change applied',
        message: conflicts.length
          ? `${conflicts.length} of the entries had changed since and were left as they are now.`
          : `${describe(change, pupils)} is now saved.`,
      });
      onDone();
    } catch (err) {
      setError(applyError(err));
      if (err instanceof ApplyRefused && err.current) {
        setRow(err.current);
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const applyEdited = () => {
    let body: Raw;
    try {
      body = JSON.parse(draft) as Raw;
    } catch {
      setError('The edited change isn’t valid. Check the brackets and quotes.');
      return;
    }
    void apply(body);
  };

  const dismiss = async () => {
    setBusy(true);
    try {
      await syncReviewApi.dismiss(change, note);
      setDismissing(false);
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'The change could not be dismissed.'));
      if (err instanceof ApplyRefused && err.current) {
        setRow(err.current);
        setDismissing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={600}>{describe(row, pupils)}</Text>
            <Text size="sm" c="dimmed">
              {change.sentBy?.name ?? 'Unknown'} · made {at(change.recordedAt)}
            </Text>
          </div>
          <Badge variant="light" color="gray" tt="none">
            {REASONS[change.code] ?? change.message}
          </Badge>
        </Group>

        {editing ? (
          <JsonInput
            label="Edit the change before applying"
            autosize
            minRows={4}
            value={draft}
            onChange={setDraft}
          />
        ) : (
          fields.length > 0 && (
            <Table withRowBorders={false} verticalSpacing={2} fz="sm">
              <Table.Tbody>
                {fields.map(([key, value]) => (
                  <Table.Tr key={key}>
                    <Table.Td c="dimmed" w="35%">
                      {labelOf(key)}
                    </Table.Td>
                    <Table.Td style={{ wordBreak: 'break-word' }}>
                      {fieldValue(key, value, pupils)}
                      {edits &&
                        show(value) !== show(change.body?.[key]) &&
                        (Array.isArray(value) ? (
                          <Text size="xs" c="dimmed">
                            (edited)
                          </Text>
                        ) : (
                          <Text span size="xs" c="dimmed">
                            {' '}
                            (sent as {fieldValue(key, change.body?.[key], pupils)})
                          </Text>
                        ))}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )
        )}

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        {open ? (
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              color="gray"
              disabled={busy}
              onClick={() => setDismissing(true)}
            >
              Dismiss
            </Button>
            {editing ? (
              <>
                <Button variant="default" disabled={busy} onClick={() => setEditing(false)}>
                  Cancel edit
                </Button>
                <Button loading={busy} onClick={applyEdited}>
                  Apply edited change
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => {
                    setDraft(JSON.stringify(change.body ?? {}, null, 2));
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
                <Button loading={busy} onClick={() => apply(change.body)}>
                  Apply
                </Button>
              </>
            )}
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {row.status === 'applied'
              ? row.appliedWithEdits
                ? 'Applied with edits'
                : 'Applied'
              : 'Dismissed'}{' '}
            by {row.resolvedBy?.name ?? 'Unknown'} · {at(row.resolvedAt)}
            {row.note ? ` · “${row.note}”` : ''}
          </Text>
        )}
      </Stack>

      <Modal
        opened={dismissing}
        onClose={() => setDismissing(false)}
        title="Dismiss this change?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {describe(change, pupils)} from {change.sentBy?.name ?? 'Unknown'} won&apos;t be saved.
          </Text>
          <Textarea
            label="Note (optional)"
            placeholder="e.g. Pupil moved to another class"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDismissing(false)}>
              Cancel
            </Button>
            <Button color="red" loading={busy} onClick={dismiss}>
              Dismiss change
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

/**
 * Changes staff made offline that they could no longer save themselves
 * (contract §6.2): the head or academic head applies each one as themselves,
 * optionally edited, or dismisses it with a note.
 */
export function SyncReviewPage() {
  const [status, setStatus] = useState<ForwardedStatus>('open');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ForwardedChange[]>([]);
  const [pupils, setPupils] = useState<Map<string, string>>(new Map());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    syncReviewApi
      .list(status, page)
      .then(async (result) => {
        setPupils(await lookupNames(result.items));
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => setLoadError(errorMessage(err, 'Could not load the changes.')))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(load, [load]);

  return (
    <Stack gap="md">
      <PageHeader
        title="Changes to review"
        subtitle="Changes staff made offline that they could no longer save themselves. Apply them as yourself, or dismiss them."
      />
      <SegmentedControl
        w="fit-content"
        value={status}
        onChange={(value) => {
          setStatus(value as ForwardedStatus);
          setPage(1);
        }}
        data={[
          { value: 'open', label: 'To review' },
          { value: 'applied', label: 'Applied' },
          { value: 'dismissed', label: 'Dismissed' },
        ]}
      />
      {loadError ? (
        <Alert color="red" variant="light" title="Couldn’t load the changes">
          <Group justify="space-between">
            <Text size="sm">{loadError}</Text>
            <Button size="compact-sm" variant="light" onClick={load}>
              Retry
            </Button>
          </Group>
        </Alert>
      ) : loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : items.length === 0 ? (
        <Text c="dimmed" size="sm">
          {status === 'open' ? 'Nothing to review.' : `No ${status} changes yet.`}
        </Text>
      ) : (
        <Stack gap="sm">
          {items.map((change) => (
            <ChangeCard key={change.id} change={change} pupils={pupils} onDone={load} />
          ))}
          {total > PAGE_SIZE && (
            <Pagination
              total={Math.ceil(total / PAGE_SIZE)}
              value={page}
              onChange={setPage}
              size="sm"
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
