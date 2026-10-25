'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';

import { ApiError, errorDetails, errorMessage } from '@/lib/api-client';
import {
  marksApi,
  type CellError,
  type Item,
  type MarkChange,
  type OpenSheet,
  type RosterRow,
} from './marks-api';
import { cellKey, markFor, parseCell, rebase, showMark, withChanges } from './marks-model';

const SAVE_DELAY = 700;

interface Pending {
  change: MarkChange;
  /** What the cell showed before this edit, to spot someone else's change on a 409. */
  base: string;
}

const keyOf = (change: MarkChange) =>
  cellKey(change.schoolStudentId, change.componentKey, change.itemIndex);

const without = (all: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(all).filter(([k]) => k !== key));

/**
 * One mark sheet: opening it, and saving marks a moment after they're typed.
 * Changes queue per cell and go in one request; a 409 (someone else saved
 * first) reloads and re-sends what nobody else touched, a 422 marks the
 * refused cells, and anything else retries after a pause.
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
              message: `${clashed.length} of your marks clashed with theirs and were not saved. They're outlined in orange.`,
            });
          }
          if (pending.current.size) timer.current = setTimeout(flush, 0);
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
  const rows = useMemo(
    () => {
      const queued = [...pending.current.values()].map((p) => p.change);
      return data
        ? data.roster.map((r) =>
            withChanges(
              r,
              items,
              queued.filter((c) => c.schoolStudentId === r.schoolStudentId),
            ),
          )
        : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, items, drafts],
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
    /** The sheet's newest row version, including saves since the last render. */
    rowVersion: () => dataRef.current?.sheet?.rowVersion ?? null,
    queue,
    commit,
    flush,
  };
}
