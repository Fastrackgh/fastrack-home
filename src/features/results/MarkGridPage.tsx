'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, MoreVertical, Plus } from 'lucide-react';
import { errorMessage } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import {
  marksApi,
  type CellError,
  type Item,
  type MarkChange,
  type OpenSheet,
  type RosterRow,
} from './marks-api';
import {
  cellKey,
  emptyComponents,
  localPreview,
  missingFor,
  otherTotal,
  parseCell,
  rebase,
  showMark,
  withChanges,
} from './marks-model';
import { STATUS } from './MarkSheetsPage';

const SAVE_DELAY = 700;

interface Pending {
  change: MarkChange;
  /** What the cell showed before this edit, to spot someone else's change on a 409. */
  base: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * One class's marks for one subject this term. Teachers type marks, "a" or
 * "x"; changes save on their own a moment later. The total and grade beside
 * each pupil are worked out with the school's own settings.
 */
export function MarkGridPage() {
  const params = useSearchParams();
  const termId = params.get('termId') ?? '';
  const classId = params.get('classId') ?? '';
  const subjectId = params.get('subjectId') ?? '';
  const { can } = useAuth();
  const isHead = can('reports:approve');

  const [data, setData] = useState<OpenSheet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [itemModal, setItemModal] = useState<{ componentKey: string; item?: Item } | null>(null);
  const [returning, setReturning] = useState(false);
  const pending = useRef<Map<string, Pending>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<OpenSheet | null>(null);
  dataRef.current = data;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const fresh = await marksApi.open(termId, classId, subjectId);
      setData(fresh);
      return fresh;
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not open the mark sheet.'));
      return null;
    }
  }, [termId, classId, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Unsaved marks would be lost on leaving.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const sheet = data?.sheet ?? null;
  const editable =
    !!data?.canEdit && !!sheet && (sheet.status === 'draft' || (isHead && !sheet.notAssessed));
  const items = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (a, b) =>
          (data?.scheme.components.findIndex((c) => c.key === a.componentKey) ?? 0) -
            (data?.scheme.components.findIndex((c) => c.key === b.componentKey) ?? 0) ||
          a.itemIndex - b.itemIndex,
      ),
    [data],
  );
  const descriptor = data?.scheme.mode === 'descriptor';
  // Descriptor marks are saved by band id; without ids the picker can't save anything.
  const bandsUsable = !descriptor || !!data?.scale.bands.every((b) => b.id);

  const flush = useCallback(async () => {
    timer.current = null;
    const current = dataRef.current;
    if (!current?.sheet || pending.current.size === 0) return;
    const batch = [...pending.current.values()];
    setSaving(true);
    try {
      const res = await marksApi.saveMarks(
        current.sheet.id,
        current.sheet.rowVersion,
        batch.map((p) => p.change),
      );
      // Only clear what was sent and hasn't been typed over since.
      for (const p of batch) {
        const key = cellKey(p.change.schoolStudentId, p.change.componentKey, p.change.itemIndex);
        if (pending.current.get(key) === p) pending.current.delete(key);
      }
      setData((d) =>
        d && d.sheet
          ? {
              ...d,
              sheet: { ...d.sheet, rowVersion: res.rowVersion },
              roster: d.roster.map(
                (r) => res.rows.find((n) => n.schoolStudentId === r.schoolStudentId) ?? r,
              ),
            }
          : d,
      );
      setDrafts((all) => {
        const next = { ...all };
        for (const p of batch) {
          const key = cellKey(p.change.schoolStudentId, p.change.componentKey, p.change.itemIndex);
          if (!pending.current.has(key)) delete next[key];
        }
        return next;
      });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        // Someone else saved first: reload, then re-apply what nobody else touched.
        const fresh = await load();
        if (fresh) {
          const { keep, conflicts: clashed } = rebase(batch, fresh.roster, fresh.items);
          for (const p of batch) {
            const key = cellKey(
              p.change.schoolStudentId,
              p.change.componentKey,
              p.change.itemIndex,
            );
            if (pending.current.get(key) === p && !keep.includes(p)) pending.current.delete(key);
          }
          if (clashed.length) {
            setConflicts((s) => new Set([...s, ...clashed]));
            setDrafts((all) =>
              Object.fromEntries(Object.entries(all).filter(([k]) => !clashed.includes(k))),
            );
            notifications.show({
              color: 'orange',
              title: 'Someone else changed this sheet',
              message: `${clashed.length} of your marks clashed with theirs and were not saved. They're outlined in orange.`,
            });
          }
          if (pending.current.size) timer.current = setTimeout(flush, 0);
        }
      } else if (err instanceof ApiError && err.statusCode === 422) {
        const cells = ((err.details as { cells?: CellError[] })?.cells ?? []).map((c) => ({
          key: cellKey(c.schoolStudentId, c.componentKey, c.itemIndex),
          message: c.message,
        }));
        setCellErrors((all) => ({
          ...all,
          ...Object.fromEntries(cells.map((c) => [c.key, c.message])),
        }));
        // Nothing was saved: drop the refused cells and send the rest again.
        for (const c of cells) pending.current.delete(c.key);
        if (cells.length && pending.current.size) timer.current = setTimeout(flush, 0);
        if (!cells.length)
          notifications.show({ color: 'red', title: 'Marks not saved', message: err.message });
      } else {
        notifications.show({
          color: 'red',
          title: 'Marks not saved',
          message: errorMessage(err, 'Check your connection; your marks will be sent again.'),
        });
        timer.current = setTimeout(flush, 5000);
      }
    } finally {
      setSaving(false);
    }
  }, [load]);

  const queue = (change: MarkChange, base: string) => {
    const key = cellKey(change.schoolStudentId, change.componentKey, change.itemIndex);
    pending.current.set(key, { change, base });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  const shown = (row: RosterRow, item: Item) => {
    const key = cellKey(row.schoolStudentId, item.componentKey, item.itemIndex);
    if (key in drafts) return drafts[key];
    return showMark(
      row.marks.find((m) => m.componentKey === item.componentKey && m.itemIndex === item.itemIndex),
      item.maxRaw,
    );
  };

  const carriedHint = (row: RosterRow, item: Item) => {
    const mark = row.marks.find(
      (m) => m.componentKey === item.componentKey && m.itemIndex === item.itemIndex,
    );
    if (!otherTotal(mark, item.maxRaw)) return '';
    const from = row.flags.movedFrom ? ` in ${row.flags.movedFrom.className}` : ' in another class';
    return `Marked out of ${mark!.maxRaw}${from}; it counts as ${mark!.rawScore} of ${mark!.maxRaw}. Type a new mark to replace it.`;
  };

  const commit = (row: RosterRow, item: Item, text: string) => {
    const key = cellKey(row.schoolStudentId, item.componentKey, item.itemIndex);
    const base = showMark(
      row.marks.find((m) => m.componentKey === item.componentKey && m.itemIndex === item.itemIndex),
      item.maxRaw,
    );
    setConflicts((s) => {
      if (!s.has(key)) return s;
      const next = new Set(s);
      next.delete(key);
      return next;
    });
    // Leaving a cell as it was never re-saves it, even a carried "40/50".
    if (text.trim() === base) {
      setCellErrors((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)));
      return;
    }
    const parsed = parseCell(text, item.maxRaw);
    if ('error' in parsed) {
      setCellErrors((all) => ({ ...all, [key]: parsed.error }));
      return;
    }
    setCellErrors((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== key)));
    queue(
      {
        schoolStudentId: row.schoolStudentId,
        componentKey: item.componentKey,
        itemIndex: item.itemIndex,
        ...parsed.change,
      },
      base,
    );
  };

  const changesFor = (row: RosterRow): MarkChange[] =>
    [...pending.current.values()]
      .filter((p) => p.change.schoolStudentId === row.schoolStudentId)
      .map((p) => p.change);

  // Rows as the teacher sees them: saved marks plus anything still on its way.
  const rows = useMemo(
    () => (data ? data.roster.map((r) => withChanges(r, items, changesFor(r))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, items, drafts],
  );
  const missing = rows.reduce((n, r) => n + missingFor(r, items), 0);
  const noItems = data ? emptyComponents({ scheme: data.scheme, items }) : [];

  const focusCell = (row: number, col: number) => {
    const el = document.querySelector<HTMLInputElement>(`[data-cell="${row}:${col}"]`);
    el?.focus();
    el?.select();
  };

  const onPaste = (
    rowIndex: number,
    colIndex: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    // Rows go down, tab-separated values go across, as copied from a spreadsheet.
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    const nextDrafts: Record<string, string> = {};
    lines.forEach((line, i) =>
      line.split('\t').forEach((value, j) => {
        const row = rows[rowIndex + i];
        const item = items[colIndex + j];
        if (!row || !item) return;
        nextDrafts[cellKey(row.schoolStudentId, item.componentKey, item.itemIndex)] = value.trim();
        commit(row, item, value);
      }),
    );
    setDrafts((all) => ({ ...all, ...nextDrafts }));
  };

  const submit = async () => {
    if (!sheet) return;
    if (pending.current.size) await flush();
    try {
      await marksApi.submit(sheet.id, dataRef.current?.sheet?.rowVersion ?? sheet.rowVersion);
      notifications.show({
        color: 'green',
        title: 'Marks submitted',
        message: 'A head reviews them next.',
      });
      setConflicts(new Set());
      load();
    } catch (err) {
      const list =
        (err instanceof ApiError &&
          (err.details as { missing?: { fullName: string; missing: number }[] })?.missing) ||
        [];
      notifications.show({
        color: 'red',
        title: 'Not submitted',
        message: list.length
          ? `Marks still missing for ${list.map((m) => `${m.fullName} (${m.missing})`).join(', ')}.`
          : errorMessage(err, 'Try again.'),
        autoClose: false,
      });
    }
  };

  const setNotAssessed = async (on: boolean) => {
    if (!sheet) return;
    try {
      await marksApi.setNotAssessed(sheet.id, sheet.rowVersion, on);
      load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not changed',
        message: errorMessage(err, 'Try again.'),
      });
    }
  };

  const removeItem = async (item: Item) => {
    if (!sheet) return;
    const marked = rows.some((r) =>
      r.marks.some((m) => m.componentKey === item.componentKey && m.itemIndex === item.itemIndex),
    );
    try {
      const res = await marksApi.deleteItem(sheet.id, item.id, sheet.rowVersion, marked && isHead);
      setData((d) =>
        d && d.sheet
          ? { ...d, items: res.items, sheet: { ...d.sheet, rowVersion: res.rowVersion } }
          : d,
      );
      if (marked) load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: `Could not remove ${item.label}`,
        message: errorMessage(err, 'Try again.'),
      });
      if (err instanceof ApiError && err.statusCode === 409) load();
    }
  };

  const back = (
    <Button
      component={Link}
      href={APP_ROUTES.marks.path}
      variant="subtle"
      leftSection={<ArrowLeft size={16} />}
      px={0}
      mb="xs"
    >
      Mark sheets
    </Button>
  );

  if (loadError)
    return (
      <>
        {back}
        <Alert color="red" title="Unable to open the mark sheet">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{loadError}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      </>
    );
  if (!data) return <Loader />;

  const status = sheet ? STATUS[sheet.status] : STATUS.not_started;
  const componentOf = (key: string) => data.scheme.components.find((c) => c.key === key);

  return (
    <>
      {back}
      <PageHeader
        title={
          data.context ? `${data.context.subjectName}, ${data.context.className}` : 'Mark sheet'
        }
        subtitle={[
          data.context && `${data.context.termLabel}, ${data.context.yearLabel}`,
          `${data.scheme.name} · grades: ${data.scale.name}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Badge variant="light" color={status.color}>
            {status.label}
          </Badge>
          {sheet?.notAssessed && (
            <Badge variant="light" color="gray">
              Not assessed this term
            </Badge>
          )}
          <Text size="sm" c={saving || pending.current.size ? 'blue' : 'dimmed'}>
            {saving ? 'Saving…' : pending.current.size ? 'Unsaved changes' : 'All changes saved'}
          </Text>
        </Group>
        {isHead && sheet && (
          <Group gap="sm">
            <Switch
              label="Not assessed this term"
              checked={sheet.notAssessed}
              onChange={(e) => setNotAssessed(e.currentTarget.checked)}
              color="fastrackRed"
            />
            {sheet.status === 'submitted' && (
              <Button variant="light" color="orange" radius="md" onClick={() => setReturning(true)}>
                Return to teacher
              </Button>
            )}
          </Group>
        )}
      </Group>

      {!sheet ? (
        <Alert color="gray" mb="md" title="View only">
          You can see this class&apos;s marks; only its subject teachers and heads can enter them.
        </Alert>
      ) : sheet.returnReason && sheet.status === 'draft' ? (
        <Alert color="orange" mb="md" title="Returned by a head">
          {sheet.returnReason}
        </Alert>
      ) : sheet.status !== 'draft' && !isHead ? (
        <Alert color="gray" mb="md" title={`${status.label}`}>
          Ask a head to return the sheet if a mark needs changing.
        </Alert>
      ) : sheet.status !== 'draft' && isHead ? (
        <Alert color="yellow" mb="md" title={`${status.label}: changing marks as a head`}>
          Your changes are recorded against your name.
          {sheet.status === 'approved'
            ? ' A published report changes only after it is reopened and published again.'
            : ''}
        </Alert>
      ) : null}

      {!bandsUsable && (
        <Alert color="red" mb="md" title="This sheet can't be marked yet">
          Its descriptors arrived without the ids needed to save a choice. This has been reported;
          try again later.
        </Alert>
      )}

      {noItems.length > 0 && editable && (
        <Alert color="blue" mb="md" title="Add the first class test">
          {noItems.map((c) => c.label).join(', ')} {noItems.length === 1 ? 'has' : 'have'} no tests
          yet, so no pupil can be complete.{' '}
          {noItems.map((c) => (
            <Button
              key={c.key}
              size="compact-xs"
              variant="light"
              ml={6}
              onClick={() => setItemModal({ componentKey: c.key })}
            >
              Add to {c.label}
            </Button>
          ))}
        </Alert>
      )}

      <Card withBorder radius="lg" p={0}>
        <ScrollArea>
          <Table verticalSpacing={4} horizontalSpacing="xs" stickyHeader miw={500}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th rowSpan={2} miw={200}>
                  Pupil
                </Table.Th>
                {data.scheme.components.map((c) => {
                  const own = items.filter((i) => i.componentKey === c.key);
                  return (
                    <Table.Th
                      key={c.key}
                      colSpan={Math.max(own.length, 1) + (c.entry === 'items' && editable ? 1 : 0)}
                      ta="center"
                    >
                      {c.label}
                      {!descriptor && (
                        <Text span size="xs" c="dimmed">
                          {' '}
                          ({c.weight}%{c.bestOf ? `, best ${c.bestOf}` : ''})
                        </Text>
                      )}
                    </Table.Th>
                  );
                })}
                {!descriptor && (
                  <>
                    <Table.Th rowSpan={2} ta="right">
                      Total
                    </Table.Th>
                    <Table.Th rowSpan={2}>Grade</Table.Th>
                  </>
                )}
              </Table.Tr>
              <Table.Tr>
                {data.scheme.components.map((c) => {
                  const own = items.filter((i) => i.componentKey === c.key);
                  return [
                    ...(own.length
                      ? own.map((item) => (
                          <Table.Th key={item.id} miw={76}>
                            <Group gap={2} wrap="nowrap" justify="center">
                              <Text size="xs" fw={600}>
                                {item.label}
                                {item.maxRaw != null && (
                                  <Text span c="dimmed" size="xs">
                                    {' '}
                                    /{item.maxRaw}
                                  </Text>
                                )}
                              </Text>
                              {editable && (
                                <Menu position="bottom-end" withinPortal>
                                  <Menu.Target>
                                    <ActionIcon
                                      size="xs"
                                      variant="subtle"
                                      color="gray"
                                      aria-label={`${item.label} options`}
                                    >
                                      <MoreVertical size={12} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item
                                      onClick={() => setItemModal({ componentKey: c.key, item })}
                                    >
                                      Edit
                                    </Menu.Item>
                                    {c.entry === 'items' && (
                                      <Menu.Item color="red" onClick={() => removeItem(item)}>
                                        Remove
                                      </Menu.Item>
                                    )}
                                  </Menu.Dropdown>
                                </Menu>
                              )}
                            </Group>
                            {item.takenOn && (
                              <Text size="xs" c="dimmed" ta="center">
                                {formatDate(item.takenOn)}
                              </Text>
                            )}
                          </Table.Th>
                        ))
                      : [
                          <Table.Th key={`${c.key}-none`}>
                            <Text size="xs" c="dimmed" ta="center">
                              No tests
                            </Text>
                          </Table.Th>,
                        ]),
                    ...(c.entry === 'items' && editable
                      ? [
                          <Table.Th key={`${c.key}-add`} w={36}>
                            <Tooltip label={`Add a test to ${c.label}`}>
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="fastrackRed"
                                onClick={() => setItemModal({ componentKey: c.key })}
                                aria-label={`Add a test to ${c.label}`}
                              >
                                <Plus size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Th>,
                        ]
                      : []),
                  ];
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row, rowIndex) => {
                const preview =
                  pending.current.size || Object.keys(drafts).length
                    ? localPreview(
                        row,
                        { scheme: data.scheme, scale: data.scale, items },
                        data.settings,
                      )
                    : row.preview;
                let col = -1;
                return (
                  <Table.Tr key={row.schoolStudentId} opacity={row.flags.leftOn ? 0.7 : 1}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {row.fullName}
                      </Text>
                      <Group gap={4}>
                        <Text size="xs" c="dimmed">
                          {row.studentCode}
                        </Text>
                        {row.flags.joinedOn && (
                          <Badge size="xs" variant="light" color="blue">
                            Joined {formatDate(row.flags.joinedOn)}
                          </Badge>
                        )}
                        {row.flags.movedFrom && (
                          <Tooltip
                            label={`Marks from ${row.flags.movedFrom.className} came with them`}
                          >
                            <Badge size="xs" variant="light" color="grape">
                              From {row.flags.movedFrom.className}
                            </Badge>
                          </Tooltip>
                        )}
                        {row.flags.leftOn && (
                          <Badge size="xs" variant="light" color="gray">
                            Left {formatDate(row.flags.leftOn)}
                          </Badge>
                        )}
                        {row.carried.length > 0 && (
                          <Tooltip
                            label={`${row.carried.length} mark${row.carried.length === 1 ? '' : 's'} from ${row.carried[0].fromClass.className} with no matching test here; kept, not counted`}
                          >
                            <Badge size="xs" variant="outline" color="gray">
                              +{row.carried.length} kept
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    {data.scheme.components.map((c) => {
                      const own = items.filter((i) => i.componentKey === c.key);
                      return [
                        ...(own.length
                          ? own.map((item) => {
                              col++;
                              const myCol = col;
                              const key = cellKey(
                                row.schoolStudentId,
                                item.componentKey,
                                item.itemIndex,
                              );
                              const notRequired = row.notRequired.some(
                                (n) =>
                                  n.componentKey === item.componentKey &&
                                  n.itemIndex === item.itemIndex,
                              );
                              const err = cellErrors[key];
                              if (descriptor && !bandsUsable) return <Table.Td key={item.id} />;
                              if (descriptor)
                                return (
                                  <Table.Td key={item.id}>
                                    <Select
                                      aria-label={`${item.label} for ${row.fullName}`}
                                      data={[
                                        ...data.scale.bands.map((b) => ({
                                          value: b.id,
                                          label: b.label,
                                        })),
                                        { value: 'absent', label: 'Absent' },
                                        { value: 'exempt', label: 'Exempt' },
                                      ]}
                                      value={(() => {
                                        const m = row.marks.find(
                                          (x) =>
                                            x.componentKey === item.componentKey &&
                                            x.itemIndex === item.itemIndex,
                                        );
                                        return m
                                          ? m.status === 'scored'
                                            ? m.descriptorBandId
                                            : m.status
                                          : null;
                                      })()}
                                      onChange={(v) => {
                                        const m = row.marks.find(
                                          (x) =>
                                            x.componentKey === item.componentKey &&
                                            x.itemIndex === item.itemIndex,
                                        );
                                        const base = m
                                          ? m.status === 'scored'
                                            ? (m.descriptorBandId ?? '')
                                            : m.status
                                          : '';
                                        queue(
                                          {
                                            schoolStudentId: row.schoolStudentId,
                                            componentKey: item.componentKey,
                                            itemIndex: item.itemIndex,
                                            status: !v
                                              ? null
                                              : v === 'absent' || v === 'exempt'
                                                ? v
                                                : 'scored',
                                            descriptorBandId:
                                              v && v !== 'absent' && v !== 'exempt' ? v : null,
                                          },
                                          base,
                                        );
                                        setDrafts((all) => ({ ...all, [key]: v ?? '' }));
                                      }}
                                      placeholder={notRequired ? 'Not required' : '—'}
                                      readOnly={!editable}
                                      variant={editable ? 'default' : 'filled'}
                                      clearable
                                      size="xs"
                                      w={130}
                                      comboboxProps={{ withinPortal: true }}
                                    />
                                  </Table.Td>
                                );
                              return (
                                <Table.Td key={item.id}>
                                  <Tooltip
                                    label={
                                      err ??
                                      (conflicts.has(key)
                                        ? 'Changed by someone else; check it'
                                        : carriedHint(row, item))
                                    }
                                    disabled={
                                      !err && !conflicts.has(key) && !carriedHint(row, item)
                                    }
                                    color={err ? 'red' : 'orange'}
                                  >
                                    <TextInput
                                      data-cell={`${rowIndex}:${myCol}`}
                                      aria-label={`${item.label} for ${row.fullName}`}
                                      value={shown(row, item)}
                                      placeholder={notRequired ? 'n/a' : ''}
                                      onChange={(e) => {
                                        const value = e.currentTarget.value;
                                        setDrafts((all) => ({ ...all, [key]: value }));
                                      }}
                                      onBlur={(e) => commit(row, item, e.currentTarget.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                          e.preventDefault();
                                          commit(row, item, e.currentTarget.value);
                                          focusCell(rowIndex + 1, myCol);
                                        } else if (e.key === 'ArrowUp') {
                                          e.preventDefault();
                                          commit(row, item, e.currentTarget.value);
                                          focusCell(rowIndex - 1, myCol);
                                        }
                                      }}
                                      onPaste={(e) => onPaste(rowIndex, myCol, e)}
                                      readOnly={!editable}
                                      variant={editable ? 'default' : 'filled'}
                                      error={!!err}
                                      size="xs"
                                      w={68}
                                      styles={{
                                        input: {
                                          textAlign: 'right',
                                          ...(conflicts.has(key)
                                            ? { borderColor: 'var(--mantine-color-orange-6)' }
                                            : {}),
                                        },
                                      }}
                                    />
                                  </Tooltip>
                                </Table.Td>
                              );
                            })
                          : [<Table.Td key={`${c.key}-none`} />]),
                        ...(c.entry === 'items' && editable
                          ? [<Table.Td key={`${c.key}-add`} />]
                          : []),
                      ];
                    })}
                    {!descriptor && (
                      <>
                        <Table.Td ta="right">
                          <Text
                            size="sm"
                            fw={600}
                            c={preview.status === 'ok' ? undefined : 'dimmed'}
                          >
                            {preview.status === 'ok'
                              ? preview.total
                              : preview.status === 'incomplete'
                                ? 'INC'
                                : preview.status === 'exempt'
                                  ? 'EX'
                                  : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700}>
                            {preview.grade ?? ''}
                          </Text>
                        </Table.Td>
                      </>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Group justify="space-between" mt="md">
        <Text size="sm" c={missing ? undefined : 'green'}>
          {data.roster.length === 0
            ? 'No pupils in this class this term.'
            : missing
              ? `${missing} mark${missing === 1 ? '' : 's'} still to enter. Type a mark, “a” for absent or “x” for exempt.`
              : 'Every mark is in.'}
        </Text>
        {sheet && sheet.status === 'draft' && data.canEdit && (
          <Button
            color="fastrackRed"
            radius="md"
            onClick={submit}
            disabled={(missing > 0 || noItems.length > 0) && !sheet.notAssessed}
          >
            Submit marks
          </Button>
        )}
      </Group>

      {itemModal && sheet && (
        <ItemModal
          sheetId={sheet.id}
          rowVersion={sheet.rowVersion}
          componentLabel={componentOf(itemModal.componentKey)?.label ?? ''}
          componentKey={itemModal.componentKey}
          defaultMax={componentOf(itemModal.componentKey)?.defaultMaxRaw ?? 10}
          numeric={!descriptor}
          next={items.filter((i) => i.componentKey === itemModal.componentKey).length + 1}
          item={itemModal.item}
          onClose={() => setItemModal(null)}
          onSaved={(res) => {
            setItemModal(null);
            setData((d) =>
              d && d.sheet
                ? { ...d, items: res.items, sheet: { ...d.sheet, rowVersion: res.rowVersion } }
                : d,
            );
          }}
          onStale={() => {
            setItemModal(null);
            load();
          }}
        />
      )}

      {returning && sheet && (
        <ReturnModal
          onClose={() => setReturning(false)}
          onReturn={async (reason) => {
            try {
              await marksApi.returnSheet(sheet.id, sheet.rowVersion, reason);
              setReturning(false);
              notifications.show({
                color: 'green',
                title: 'Returned to the teacher',
                message: reason,
              });
              load();
            } catch (err) {
              notifications.show({
                color: 'red',
                title: 'Not returned',
                message: errorMessage(err, 'Try again.'),
              });
            }
          }}
        />
      )}
    </>
  );
}

function ItemModal({
  sheetId,
  rowVersion,
  componentKey,
  componentLabel,
  defaultMax,
  numeric,
  next,
  item,
  onClose,
  onSaved,
  onStale,
}: {
  sheetId: string;
  rowVersion: number;
  componentKey: string;
  componentLabel: string;
  defaultMax: number;
  numeric: boolean;
  next: number;
  item?: Item;
  onClose: () => void;
  onSaved: (res: { rowVersion: number; items: Item[] }) => void;
  onStale: () => void;
}) {
  const [label, setLabel] = useState(item?.label ?? `Test ${next}`);
  const [maxRaw, setMaxRaw] = useState<number | string>(item?.maxRaw ?? defaultMax);
  const [takenOn, setTakenOn] = useState(item?.takenOn ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || (numeric && !(Number(maxRaw) > 0))) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        rowVersion,
        label: label.trim(),
        ...(numeric ? { maxRaw: Number(maxRaw) } : {}),
        takenOn: takenOn || undefined,
      };
      const res = item
        ? await marksApi.updateItem(sheetId, item.id, body)
        : await marksApi.addItem(sheetId, { ...body, componentKey, maxRaw: Number(maxRaw) });
      onSaved(res);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        notifications.show({
          color: 'orange',
          title: 'The sheet changed',
          message: 'It was reloaded; try again.',
        });
        onStale();
        return;
      }
      setError(errorMessage(err, 'Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={item ? `Edit ${item.label}` : `Add a test to ${componentLabel}`}
      radius="lg"
      centered
    >
      <form onSubmit={save}>
        <Stack gap="md">
          {error && <Alert color="red">{error}</Alert>}
          <TextInput
            label="Name"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            maxLength={60}
            required
            radius="md"
          />
          {numeric && (
            <NumberInput
              label="Marked out of"
              value={maxRaw}
              onChange={setMaxRaw}
              min={1}
              max={1000}
              decimalScale={2}
              required
              radius="md"
            />
          )}
          <TextInput
            label="Date taken"
            description="Pupils who joined after this date don't need a mark"
            type="date"
            value={takenOn}
            onChange={(e) => setTakenOn(e.currentTarget.value)}
            radius="md"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving} radius="md">
              {item ? 'Save' : 'Add test'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function ReturnModal({
  onClose,
  onReturn,
}: {
  onClose: () => void;
  onReturn: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal opened onClose={onClose} title="Return to the teacher" radius="lg" centered>
      <Stack gap="md">
        <Textarea
          label="What needs changing"
          description="The teacher sees this on the sheet"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={500}
          radius="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button
            color="orange"
            radius="md"
            disabled={!reason.trim()}
            onClick={() => onReturn(reason.trim())}
          >
            Return
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
