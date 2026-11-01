'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { ApiError, errorDetails, errorMessage, pathId } from '@/lib/api-client';
import type { OutboxOp } from '@/lib/offline/outbox';
import {
  enqueueWrite,
  onRecordsPulled,
  onSyncApplied,
  pendingWrites,
  syncStatus,
  waitForOp,
} from '@/lib/offline/syncEngine';
import {
  marksApi,
  type CellError,
  type Item,
  type MarkChange,
  type OpenSheet,
  type RosterRow,
} from './marks-api';
import { cellKey, markFor, parseCell, rebase, showMark, withChanges } from './marks-model';
import {
  MARKS_COLLECTION,
  itemNameKey,
  landedSave,
  queuedChanges,
  wireOf,
  withSyncedSheet,
  type QueuedMark,
} from './marks-sync';

const SAVE_DELAY = 700;
/** How long Submit waits for queued marks to reach the server. */
const SETTLE_WAIT_MS = 15000;

interface Pending {
  change: MarkChange;
  /** What the cell showed before this edit, to spot someone else's change on a 409. */
  base: string;
}

/** "1 of your marks clashed with theirs and was not saved. It's outlined in orange." */
const clashNotice = (n: number) =>
  n === 1
    ? "1 of your marks clashed with theirs and was not saved. It's outlined in orange"
    : `${n} of your marks clashed with theirs and were not saved. They're outlined in orange`;

const keyOf = (change: MarkChange) =>
  cellKey(change.schoolStudentId, change.componentKey, change.itemIndex);

const without = (all: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(all).filter(([k]) => k !== key));

/**
 * One mark sheet: opening it, and saving marks a moment after they're typed.
 * Changes gather per cell, then go to the outbox as one save (offline too)
 * with each cell's `from`, so the server applies them cell by cell: a cell
 * someone else changed meanwhile is outlined and goes to the review tray.
 * Queued saves show on the sheet until they land. Without an offline store
 * the save is sent directly: a 409 reloads and re-sends what nobody else
 * touched, a 422 marks the refused cells, anything else retries.
 */
export function useMarkSheet(termId: string, classId: string, subjectId: string) {
  const [data, setData] = useState<OpenSheet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** What each cell shows while it's being edited or saved, by cell key. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  /** Cells someone else changed while this teacher's edit was on its way. */
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  /** This sheet's saves waiting in the outbox. */
  const [queued, setQueued] = useState<OutboxOp[]>([]);
  const pending = useRef<Map<string, Pending>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<OpenSheet | null>(null);
  dataRef.current = data;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const fresh = await withSyncedSheet(await marksApi.open(termId, classId, subjectId));
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

  // New records from the server (marks entered elsewhere, the sheet submitted
  // or returned) refresh the sheet when nothing typed is waiting here.
  useEffect(
    () =>
      onRecordsPulled(() => {
        if (pending.current.size === 0 && !timer.current) void load();
      }),
    [load],
  );

  // Unsaved marks would be lost on leaving.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const sheetId = data?.sheet?.id ?? null;
  const refreshQueued = useCallback(async () => {
    const id = dataRef.current?.sheet?.id;
    setQueued(id ? await pendingWrites(MARKS_COLLECTION, id).catch(() => []) : []);
  }, []);

  // Follow the outbox (saves landing, other tabs) for this sheet.
  useEffect(() => {
    void refreshQueued();
    return syncStatus.subscribe(() => void refreshQueued());
  }, [refreshQueued, sheetId]);

  // A save of this sheet landed: take its rows and version, and outline clashes.
  useEffect(
    () =>
      onSyncApplied((op, body) => {
        const current = dataRef.current;
        if (op.collection !== MARKS_COLLECTION || op.entityId !== current?.sheet?.id) return;
        const landed = landedSave(body);
        setData((d) =>
          d && d.sheet
            ? {
                ...d,
                sheet: {
                  ...d.sheet,
                  rowVersion: Math.max(d.sheet.rowVersion, landed.rowVersion ?? 0),
                },
                roster: d.roster.map(
                  (r) => landed.rows?.find((n) => n.schoolStudentId === r.schoolStudentId) ?? r,
                ),
              }
            : d,
        );
        const clashed = (landed.conflicts ?? []).map(({ cell }) =>
          cellKey(cell.schoolStudentId, cell.componentKey, cell.itemIndex),
        );
        if (clashed.length) {
          setConflicts((all) => new Set([...all, ...clashed]));
          notifications.show({
            color: 'orange',
            title: 'Someone else changed this sheet',
            message: `${clashNotice(clashed.length)}, and you can choose in “need review” at the top of the page.`,
          });
        }
        void refreshQueued();
      }),
    [refreshQueued],
  );

  /** The latest `flush`, for the direct path's retries (declared before it). */
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  /** Sends straight to the server: only when this device has no offline store. */
  const flushDirect = useCallback(
    async (batch: Pending[]) => {
      const current = dataRef.current;
      if (!current?.sheet) return;
      setSaving(true);
      try {
        const res = await marksApi.saveMarks(
          current.sheet.id,
          current.sheet.rowVersion,
          batch.map((p) => p.change),
        );
        // Only clear what was sent and hasn't been typed over since.
        for (const p of batch) {
          if (pending.current.get(keyOf(p.change)) === p) pending.current.delete(keyOf(p.change));
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
          for (const p of batch)
            if (!pending.current.has(keyOf(p.change))) delete next[keyOf(p.change)];
          return next;
        });
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 409) {
          // Someone else saved first: reload, then re-apply what nobody else touched.
          const fresh = await load();
          if (fresh) {
            const { keep, conflicts: clashed } = rebase(batch, fresh.roster, fresh.items);
            for (const p of batch) {
              const key = keyOf(p.change);
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
                message: `${clashNotice(clashed.length)}.`,
              });
            }
            if (pending.current.size) timer.current = setTimeout(() => flushRef.current(), 0);
          }
        } else if (err instanceof ApiError && err.statusCode === 422) {
          const cells = (errorDetails<{ cells?: CellError[] }>(err)?.cells ?? []).map((c) => ({
            key: cellKey(c.schoolStudentId, c.componentKey, c.itemIndex),
            message: c.message,
          }));
          setCellErrors((all) => ({
            ...all,
            ...Object.fromEntries(cells.map((c) => [c.key, c.message])),
          }));
          // Nothing was saved: drop the refused cells and send the rest again.
          for (const c of cells) pending.current.delete(c.key);
          if (cells.length && pending.current.size)
            timer.current = setTimeout(() => flushRef.current(), 0);
          if (!cells.length)
            notifications.show({ color: 'red', title: 'Marks not saved', message: err.message });
        } else {
          notifications.show({
            color: 'red',
            title: 'Marks not saved',
            message: errorMessage(err, 'Check your connection; your marks will be sent again.'),
          });
          timer.current = setTimeout(() => flushRef.current(), 5000);
        }
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  /** Queues the gathered cells as one save, each with `from`: the value this device saw. */
  const flush = useCallback(async () => {
    timer.current = null;
    const current = dataRef.current;
    if (!current?.sheet || pending.current.size === 0) return;
    const sheet = current.sheet;
    const batch = [...pending.current.values()];
    setSaving(true);
    try {
      const seen = queuedChanges(await pendingWrites(MARKS_COLLECTION, sheet.id).catch(() => []));
      const marks: QueuedMark[] = batch.map(({ change }) => {
        const row = current.roster.find((r) => r.schoolStudentId === change.schoolStudentId);
        const item = current.items.find(
          (i) => i.componentKey === change.componentKey && i.itemIndex === change.itemIndex,
        );
        const view = row && item ? markFor(withChanges(row, current.items, seen), item) : undefined;
        return { ...change, from: wireOf(view) };
      });
      // For the review tray only (kept on the device): pupils, items and bands by id.
      const names = Object.fromEntries([
        ...current.roster.map((r) => [r.schoolStudentId, r.fullName]),
        ...current.items.map((i) => [itemNameKey(i.componentKey, i.itemIndex), i.label]),
        ...current.scale.bands.map((b) => [b.id, b.label]),
      ]);
      const ctx = current.context;
      try {
        await enqueueWrite({
          collection: MARKS_COLLECTION,
          entityId: sheet.id,
          method: 'PUT',
          path: `/schools/me/mark-sheets/${pathId(sheet.id)}/marks`,
          body: { rowVersion: sheet.rowVersion, marks },
          label: ctx ? `Marks: ${ctx.subjectName}, ${ctx.className}` : 'Marks',
          names,
        });
      } catch {
        await flushDirect(batch);
        return;
      }
      // Only clear what was queued and hasn't been typed over since.
      for (const p of batch) {
        if (pending.current.get(keyOf(p.change)) === p) pending.current.delete(keyOf(p.change));
      }
      await refreshQueued();
      setDrafts((all) => {
        const next = { ...all };
        for (const p of batch)
          if (!pending.current.has(keyOf(p.change))) delete next[keyOf(p.change)];
        return next;
      });
    } finally {
      setSaving(false);
    }
  }, [flushDirect, refreshQueued]);

  flushRef.current = flush;

  /**
   * Before Submit: queues what's typed and waits for this sheet's saves to
   * reach the server. Resolves how many marks are still waiting (offline,
   * slow); 0 when everything landed.
   */
  const settle = async (): Promise<number> => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current.size) await flush();
    const id = dataRef.current?.sheet?.id;
    if (!id) return 0;
    const ops = await pendingWrites(MARKS_COLLECTION, id).catch(() => []);
    const landed = await Promise.all(ops.map((op) => waitForOp(op.opId, SETTLE_WAIT_MS)));
    return queuedChanges(ops.filter((_, i) => landed[i] === null)).length;
  };

  /** Queues one cell's change; the batch goes a moment after the last edit. */
  const queue = (change: MarkChange, base: string) => {
    pending.current.set(keyOf(change), { change, base });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  /** A typed value leaving its cell: checked, then queued unless unchanged. */
  const commit = (row: RosterRow, item: Item, text: string) => {
    const key = cellKey(row.schoolStudentId, item.componentKey, item.itemIndex);
    const base = showMark(markFor(row, item), item.maxRaw);
    setConflicts((s) => {
      if (!s.has(key)) return s;
      const next = new Set(s);
      next.delete(key);
      return next;
    });
    // Leaving a cell as it was never re-saves it, even a carried "40/50".
    if (text.trim() === base) {
      setCellErrors((all) => without(all, key));
      return;
    }
    const parsed = parseCell(text, item.maxRaw);
    if ('error' in parsed) {
      setCellErrors((all) => ({ ...all, [key]: parsed.error }));
      return;
    }
    setCellErrors((all) => without(all, key));
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

  const setDraft = (key: string, value: string) => setDrafts((all) => ({ ...all, [key]: value }));

  const items = useMemo(() => {
    const order = (key: string) => data?.scheme.components.findIndex((c) => c.key === key) ?? 0;
    return [...(data?.items ?? [])].sort(
      (a, b) => order(a.componentKey) - order(b.componentKey) || a.itemIndex - b.itemIndex,
    );
  }, [data]);

  // Rows as the teacher sees them: saved marks plus anything still on its way.
  // The queue lives in a ref, so `drafts` (set with every edit) is what tells
  // this to recompute.
  const waiting = useMemo(() => queuedChanges(queued), [queued]);
  const rows = useMemo(
    () => {
      // Queued saves first, then what's typed and not yet queued.
      const shown = [...waiting, ...[...pending.current.values()].map((p) => p.change)];
      return data
        ? data.roster.map((r) =>
            withChanges(
              r,
              items,
              shown.filter((c) => c.schoolStudentId === r.schoolStudentId),
            ),
          )
        : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, items, drafts, waiting],
  );

  return {
    data,
    setData,
    loadError,
    load,
    items,
    rows,
    drafts,
    setDraft,
    setDrafts,
    cellErrors,
    conflicts,
    clearConflicts: () => setConflicts(new Set()),
    saving,
    hasUnsaved: () => pending.current.size > 0,
    /** Marks saved on this device and waiting to be sent. */
    waiting: waiting.length,
    settle,
    /** The sheet's newest row version, including saves since the last render. */
    rowVersion: () => dataRef.current?.sheet?.rowVersion ?? null,
    queue,
    commit,
    flush,
  };
}
