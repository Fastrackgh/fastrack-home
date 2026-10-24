import { subjectResult, type ItemMark } from './engine';
import type { Settings } from './api';
import type { Item, Mark, MarkChange, OpenSheet, RosterRow } from './marks-api';

/*
 * The mark grid's logic, kept apart from the screen so the check script can
 * test it: reading what a teacher types into a cell, which marks are still
 * missing, and the preview while a change is on its way to the server.
 */

export const cellKey = (schoolStudentId: string, componentKey: string, itemIndex: number) =>
  `${schoolStudentId}|${componentKey}|${itemIndex}`;

export type Parsed = { change: Pick<MarkChange, 'status' | 'rawScore'> } | { error: string };

/**
 * A typed cell: a mark out of `maxRaw` (two decimals at most), "a" for absent,
 * "x" for exempt, or empty to clear it.
 */
export function parseCell(text: string, maxRaw: number | null): Parsed {
  const value = text.trim().toLowerCase();
  if (value === '') return { change: { status: null } };
  if (value === 'a' || value === 'abs' || value === 'absent')
    return { change: { status: 'absent', rawScore: null } };
  if (value === 'x' || value === 'ex' || value === 'exempt')
    return { change: { status: 'exempt', rawScore: null } };
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    return { error: 'Type a mark, “a” for absent or “x” for exempt.' };
  const raw = Number(value);
  if (maxRaw != null && raw > maxRaw) return { error: `The most is ${maxRaw}.` };
  return { change: { status: 'scored', rawScore: raw } };
}

/** How a stored mark shows in its cell. */
export function showMark(mark: Pick<Mark, 'status' | 'rawScore'> | undefined | null): string {
  if (!mark) return '';
  if (mark.status === 'absent') return 'ABS';
  if (mark.status === 'exempt') return 'EX';
  return mark.rawScore == null ? '' : String(mark.rawScore);
}

const isNotRequired = (row: RosterRow, item: Item) =>
  row.notRequired.some(
    (n) => n.componentKey === item.componentKey && n.itemIndex === item.itemIndex,
  );

const markFor = (row: RosterRow, item: Item) =>
  row.marks.find((m) => m.componentKey === item.componentKey && m.itemIndex === item.itemIndex);

/** Marks still needed from a pupil; leavers never need any (rule 13). */
export function missingFor(row: RosterRow, items: Item[]): number {
  if (row.flags.leftOn) return 0;
  return items.filter((item) => !markFor(row, item) && !isNotRequired(row, item)).length;
}

/** Components of the scheme that have no items yet, so no pupil can be complete. */
export const emptyComponents = (sheet: Pick<OpenSheet, 'scheme' | 'items'>) =>
  sheet.scheme.components.filter((c) => !sheet.items.some((i) => i.componentKey === c.key));

/**
 * The row's result as the engine works it out, used while the server's
 * preview is out of date. Items before the pupil joined count as exempt.
 */
export function localPreview(
  row: RosterRow,
  sheet: Pick<OpenSheet, 'scheme' | 'scale' | 'items'>,
  settings: Settings,
) {
  const marks: Record<string, ItemMark[]> = {};
  for (const c of sheet.scheme.components) {
    marks[c.key] = sheet.items
      .filter((i) => i.componentKey === c.key)
      .sort((a, b) => a.itemIndex - b.itemIndex)
      .map((item): ItemMark => {
        const mark = markFor(row, item);
        if (mark)
          return {
            status: mark.status,
            raw: mark.rawScore,
            maxRaw: mark.maxRaw ?? item.maxRaw ?? 1,
          };
        return isNotRequired(row, item) ? { status: 'exempt', maxRaw: item.maxRaw ?? 1 } : null;
      });
  }
  return subjectResult(
    sheet.scheme.components.map((c) => ({ key: c.key, weight: c.weight, bestOf: c.bestOf })),
    marks,
    sheet.scale.bands.map((b) => ({ label: b.label, minScore: b.minScore ?? 0, points: b.points })),
    { ...settings, aggregate: null },
  );
}

/** A row with `changes` applied locally, as the teacher sees it before the save comes back. */
export function withChanges(row: RosterRow, items: Item[], changes: MarkChange[]): RosterRow {
  let marks = row.marks;
  for (const change of changes) {
    if (change.schoolStudentId !== row.schoolStudentId) continue;
    marks = marks.filter(
      (m) => !(m.componentKey === change.componentKey && m.itemIndex === change.itemIndex),
    );
    if (change.status) {
      const item = items.find(
        (i) => i.componentKey === change.componentKey && i.itemIndex === change.itemIndex,
      );
      marks = [
        ...marks,
        {
          componentKey: change.componentKey,
          itemIndex: change.itemIndex,
          status: change.status,
          rawScore: change.rawScore ?? null,
          maxRaw: item?.maxRaw ?? null,
          descriptorBandId: change.descriptorBandId ?? null,
          enteredBy: null,
          enteredAt: null,
        },
      ];
    }
  }
  return { ...row, marks };
}

/**
 * After a 409, which unsent changes can be re-applied on the fresh sheet: a
 * cell keeps its change only if nobody else changed it meanwhile.
 */
export function rebase(
  pending: { change: MarkChange; base: string }[],
  fresh: RosterRow[],
  items: Item[],
) {
  const keep: { change: MarkChange; base: string }[] = [];
  const conflicts: string[] = [];
  for (const p of pending) {
    const row = fresh.find((r) => r.schoolStudentId === p.change.schoolStudentId);
    const item = items.find(
      (i) => i.componentKey === p.change.componentKey && i.itemIndex === p.change.itemIndex,
    );
    const now = row && item ? showMark(markFor(row, item)) : '';
    if (now === p.base) keep.push(p);
    else
      conflicts.push(cellKey(p.change.schoolStudentId, p.change.componentKey, p.change.itemIndex));
  }
  return { keep, conflicts };
}
