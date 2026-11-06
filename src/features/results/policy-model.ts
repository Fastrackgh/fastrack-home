import type { PolicyRow, Scope } from './api';

/** The levels a single class or subject can be set at, below the wizard's school and departments. */
export const NARROW_SCOPES: { value: Scope; label: string }[] = [
  { value: 'class', label: 'One class' },
  { value: 'subject', label: 'A subject in every class' },
  { value: 'class_subject', label: 'A subject in one class' },
];

export const isNarrow = (row: Pick<PolicyRow, 'scope'>) =>
  row.scope === 'class' || row.scope === 'subject' || row.scope === 'class_subject';

/** Rows aim at the same place: same level and same class/subject/department. */
export const sameTarget = (a: PolicyRow, b: PolicyRow) =>
  a.scope === b.scope &&
  (a.departmentId ?? null) === (b.departmentId ?? null) &&
  (a.classId ?? null) === (b.classId ?? null) &&
  (a.subjectId ?? null) === (b.subjectId ?? null);

/** Where a row applies, in words: "JHS 3", "French in every class", "Mathematics in JHS 3". */
export function targetName(
  row: PolicyRow,
  className: (id: string) => string | undefined,
  subjectName: (id: string) => string | undefined,
): string {
  const cls = row.classId ? (className(row.classId) ?? 'A class') : '';
  const subject = row.subjectId ? (subjectName(row.subjectId) ?? 'A subject') : '';
  if (row.scope === 'class') return cls;
  if (row.scope === 'subject') return `${subject} in every class`;
  if (row.scope === 'class_subject') return `${subject} in ${cls}`;
  return row.scope === 'school' ? 'The whole school' : 'A department';
}

/** The request body's rows (no ids), with `row` added or replacing the row for the same place. */
export const withRow = (rows: PolicyRow[], row: PolicyRow): PolicyRow[] => [
  ...rows.filter((r) => !sameTarget(r, row)).map(strip),
  strip(row),
];

/** The request body's rows (no ids), without the row for `row`'s place. */
export const withoutRow = (rows: PolicyRow[], row: PolicyRow): PolicyRow[] =>
  rows.filter((r) => !sameTarget(r, row)).map(strip);

/** Only the fields the replace request takes, with each level's own columns. */
const strip = (r: PolicyRow): PolicyRow => ({
  scope: r.scope,
  departmentId: r.departmentId ?? null,
  classId: r.classId ?? null,
  subjectId: r.subjectId ?? null,
  schemeFamilyId: r.schemeFamilyId,
  scaleFamilyId: r.scaleFamilyId,
});

/** Why a narrow setting can't be saved yet, or null. */
export function narrowProblem(row: PolicyRow, rows: PolicyRow[], editing: boolean): string | null {
  if ((row.scope === 'class' || row.scope === 'class_subject') && !row.classId)
    return 'Choose the class.';
  if ((row.scope === 'subject' || row.scope === 'class_subject') && !row.subjectId)
    return 'Choose the subject.';
  if (!row.schemeFamilyId && !row.scaleFamilyId)
    return 'Choose a weighting or grades (or both); otherwise it just follows the level above.';
  if (!editing && rows.some((r) => sameTarget(r, row)))
    return 'There is already a setting for this; change that one instead.';
  return null;
}
