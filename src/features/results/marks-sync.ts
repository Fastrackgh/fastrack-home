import type { EnqueueInput, OutboxOp, ReviewItem } from '@/lib/offline/outbox';
import { registerReviewResolver, registerReviewText, syncedRecord } from '@/lib/offline/syncEngine';
import type { Mark, MarkChange, MarkStatus, OpenSheet, RosterRow, Sheet } from './marks-api';

/**
 * Offline marks (docs/offline/staff-offline.md, contract §5 batch cells,
 * backend step 4b). Every queued save carries `from` on every mark, which
 * puts the server in per-cell mode: a stale sheet version is fine, and a
 * cell someone else changed meanwhile comes back in `conflicts[]` for review
 * instead of failing the whole save.
 */
export const MARKS_COLLECTION = 'marks';

/** A cell's value in the server's wire form (§5), or null when nothing is entered. */
export interface WireMark {
  status: MarkStatus;
  rawScore: number | null;
  descriptorBandId: string | null;
}

export type QueuedMark = MarkChange & { from: WireMark | null };

export interface QueuedSave {
  rowVersion: number;
  marks: QueuedMark[];
}

/**
 * The value the device saw: a raw score only on a scored numeric mark, a
 * band only on a scored descriptor mark, as the server compares them.
 */
export function wireOf(mark: Mark | undefined | null): WireMark | null {
  if (!mark) return null;
  const scored = mark.status === 'scored';
  return {
    status: mark.status,
    rawScore: scored && !mark.descriptorBandId ? mark.rawScore : null,
    descriptorBandId: scored ? mark.descriptorBandId : null,
  };
}

export const parseSave = (op: OutboxOp): QueuedSave | null => {
  try {
    return op.body ? (JSON.parse(op.body) as QueuedSave) : null;
  } catch {
    return null;
  }
};

/** The marks a queued save will set, to show over the sheet until it lands. */
export const queuedChanges = (ops: OutboxOp[]): MarkChange[] =>
  ops.flatMap((op) =>
    // `from` is for the server only.
    (parseSave(op)?.marks ?? []).map(
      ({ schoolStudentId, componentKey, itemIndex, status, rawScore, descriptorBandId }) => ({
        schoolStudentId,
        componentKey,
        itemIndex,
        status,
        rawScore,
        descriptorBandId,
      }),
    ),
  );

/** What a landed save returned: the sheet's new version, changed rows and clashing cells. */
export interface LandedSave {
  rowVersion?: number;
  rows?: RosterRow[];
  conflicts?: { cell: { schoolStudentId: string; componentKey: string; itemIndex: number } }[];
}

export const landedSave = (body: unknown): LandedSave =>
  ((body as { data?: LandedSave } | undefined)?.data ?? {}) as LandedSave;

/**
 * Lays the device's synced records (the change feed, §7) over an opened
 * sheet, where newer: the sheet's status and version (submitted or returned
 * on another device) and each pupil's row (marks entered elsewhere). A row's
 * version is the sheet version of the write that last changed it (§8).
 * Online the server's copy is at least as new, so nothing changes.
 */
export async function withSyncedSheet(open: OpenSheet): Promise<OpenSheet> {
  const sheet = open.sheet;
  if (!sheet) return open;
  const record = await syncedRecord<Partial<Sheet>>('mark-sheets', sheet.id);
  const base = sheet.rowVersion;
  const newer = record && !record.deleted && record.data && record.version > base;
  const roster = await Promise.all(
    open.roster.map(async (row) => {
      const synced = await syncedRecord<RosterRow>(
        MARKS_COLLECTION,
        `${sheet.id}:${row.schoolStudentId}`,
      );
      return synced && !synced.deleted && synced.data && synced.version > base
        ? { ...row, ...synced.data }
        : row;
    }),
  );
  return {
    ...open,
    sheet: newer
      ? {
          ...sheet,
          status: record.data?.status ?? sheet.status,
          notAssessed: record.data?.notAssessed ?? sheet.notAssessed,
          returnReason: record.data?.returnReason ?? null,
          submittedAt: record.data?.submittedAt ?? null,
          submittedBy: record.data?.submittedBy ?? null,
          rowVersion: record.version,
        }
      : sheet,
    roster,
  };
}

/** A key for an item in an op's `names`, next to pupil ids. */
export const itemNameKey = (componentKey: string, itemIndex: number) =>
  `${componentKey}:${itemIndex}`;

/** The refused cells of a 422 (`details.cells`), which saved none of the marks. */
const refusedCells = (item: ReviewItem) => {
  const cells = (item.error?.details as { cells?: unknown } | undefined)?.cells;
  return item.kind === 'rejected' && Array.isArray(cells)
    ? (cells as { schoolStudentId: string; componentKey: string; itemIndex: number }[])
    : [];
};

const sameCell = (
  a: { schoolStudentId: string; componentKey: string; itemIndex: number },
  b: { schoolStudentId: string; componentKey: string; itemIndex: number },
) =>
  a.schoolStudentId === b.schoolStudentId &&
  a.componentKey === b.componentKey &&
  a.itemIndex === b.itemIndex;

const resend = (item: ReviewItem, body: QueuedSave): EnqueueInput => ({
  collection: MARKS_COLLECTION,
  entityId: item.op.entityId,
  method: 'PUT',
  path: item.op.path,
  body,
  label: item.op.label,
  names: item.op.names,
});

/**
 * Review for queued mark saves:
 * - Keep mine for a clashing cell: that one mark again, with `from` set to
 *   what the server has now.
 * - A save with refused cells (422 `details.cells`) saved nothing: "Send
 *   without those marks" resends the rest.
 * - A sheet submitted or approved meanwhile (`SHEET_LOCKED`) saved nothing:
 *   once it's returned, "Send again" resends the save as it was.
 */
export function registerMarksResolver() {
  registerReviewText(MARKS_COLLECTION, {
    explain: (item) => {
      const refused = refusedCells(item);
      if (refused.length) {
        return `${refused.length === 1 ? 'One mark was' : `${refused.length} marks were`} refused (${item.error?.message ?? 'not valid'}), so none of this save was applied.`;
      }
      if (item.error?.code === 'SHEET_LOCKED') {
        return 'The sheet was submitted before these marks arrived, so they weren’t saved. Once it’s returned to you, send them again.';
      }
      return null;
    },
    resendLabel: (item) => (refusedCells(item).length ? 'Send without those marks' : null),
  });
  registerReviewResolver(MARKS_COLLECTION, (item) => {
    const save = parseSave(item.op);
    if (!save) return null;
    const refused = refusedCells(item);
    if (refused.length) {
      const marks = save.marks.filter((mark) => !refused.some((cell) => sameCell(cell, mark)));
      return marks.length && marks.length < save.marks.length
        ? resend(item, { ...save, marks })
        : null;
    }
    if (item.kind === 'rejected' && item.error?.code === 'SHEET_LOCKED') return resend(item, save);
    const cell = item.cell?.cell as
      { schoolStudentId: string; componentKey: string; itemIndex: number } | undefined;
    const mine = item.cell?.mine as Partial<WireMark> | undefined;
    const current = item.cell?.current as Partial<WireMark> | undefined;
    if (item.kind !== 'cell' || !cell || !mine) return null;
    const mark: QueuedMark = {
      schoolStudentId: cell.schoolStudentId,
      componentKey: cell.componentKey,
      itemIndex: cell.itemIndex,
      status: mine.status ?? null,
      ...(mine.rawScore != null ? { rawScore: mine.rawScore } : {}),
      ...(mine.descriptorBandId ? { descriptorBandId: mine.descriptorBandId } : {}),
      from: current?.status
        ? {
            status: current.status,
            rawScore: current.rawScore ?? null,
            descriptorBandId: current.descriptorBandId ?? null,
          }
        : null,
    };
    return resend(item, { rowVersion: save.rowVersion, marks: [mark] });
  });
}
