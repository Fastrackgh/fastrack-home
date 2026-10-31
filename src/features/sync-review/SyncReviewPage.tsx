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

/** The pupils a page of changes names, as "Ama Mensah · BIS-001/STD/2026/009". */
async function pupilNames(changes: ForwardedChange[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const change of changes) {
    for (const [key, value] of Object.entries(change.body ?? {})) {
      if (PUPIL_FIELDS.has(key) && typeof value === 'string') ids.add(value);
    }
  }
  const names = new Map<string, string>();
  await Promise.all(
    [...ids].map((id) =>
      studentsApi.get(id).then(
        (pupil) => names.set(id, `${pupil.fullName} · ${pupil.studentCode}`),
        // An unknown pupil keeps showing its id.
        () => undefined,
      ),
    ),
  );
  return names;
}

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
  const fields = Object.entries(shown);

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
          : `${describe(change)} is now saved.`,
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
            <Text fw={600}>{describe(row)}</Text>
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
                      {PUPIL_FIELDS.has(key) ? 'Pupil' : fieldLabel(key)}
                    </Table.Td>
                    <Table.Td style={{ wordBreak: 'break-word' }}>
                      {(PUPIL_FIELDS.has(key) && pupils.get(String(value))) ||
                        showField(key, value)}
                      {edits && show(value) !== show(change.body?.[key]) && (
                        <Text span size="xs" c="dimmed">
                          {' '}
                          (sent as {showField(key, change.body?.[key])})
                        </Text>
                      )}
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
            {describe(change)} from {change.sentBy?.name ?? 'Unknown'} won&apos;t be saved.
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
        setPupils(await pupilNames(result.items));
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
