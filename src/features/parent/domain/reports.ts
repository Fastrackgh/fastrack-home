import { place } from '@/lib/format';
import type { SubjectResult, TermReport } from '../types';
import { formatDate } from './format';

export const gradeColor = (grade?: string | null) =>
  ({ A: 'green', B: 'teal', C: 'blue', D: 'orange' })[grade?.charAt(0) ?? ''] ?? 'red';

/** The school corrected the report after first publishing it. */
export const isRevised = (report: TermReport) => (report.revision ?? 1) > 1 && !!report.updatedAt;

/** `Updated 3 Jan 2027`, or when it was first published. */
export const publicationNote = (report: TermReport) =>
  isRevised(report)
    ? `Updated ${formatDate(report.updatedAt)}`
    : `Published ${formatDate(report.publishedAt)}`;

/** `3rd` or `3rd=` (tied), with ` of 40` / ` / 40` when the class size is known. */
export const positionLabel = (
  position: number,
  tied: boolean | undefined,
  classSize: number | null | undefined,
  separator: ' of ' | ' / ',
) => `${place(position, tied)}${classSize ? `${separator}${classSize}` : ''}`;

/** The end-of-year decision, from the newer `promotion` or the older `promotedTo`. */
export function promotionText(report: TermReport): string | null {
  const promotion = report.promotion;
  const status = promotion?.status.toLowerCase();
  if (status === 'promoted')
    return promotion?.toClass ? `Promoted to ${promotion.toClass}.` : 'Promoted.';
  if (status === 'repeated') return 'Repeats the year.';
  if (status === 'graduated') return 'Graduated.';
  if (!report.promotedTo) return null;
  return ['Graduated', 'Repeated'].includes(report.promotedTo)
    ? `${report.promotedTo}.`
    : `Promoted to ${report.promotedTo}.`;
}

const NOT_COUNTED: Record<string, string> = {
  incomplete: 'INC',
  exempt: 'Exempt',
  missing: '–',
  not_assessed: 'Not assessed',
};

/** A subject whose score counts towards the report (not exempt, missing, ...). */
export const isCounted = (subject: SubjectResult) => !subject.status || subject.status === 'ok';

/** The total column: the score, or why there isn't one. */
export const subjectTotal = (subject: SubjectResult) =>
  isCounted(subject) ? (subject.total ?? '–') : NOT_COUNTED[subject.status!];

/** Subjects marked with numbers, and those described in words (Montessori, early years). */
export function splitSubjects(report: TermReport) {
  const subjects = report.subjects ?? [];
  return {
    scored: subjects.filter((s) => s.mode !== 'descriptor'),
    described: subjects.filter((s) => s.mode === 'descriptor'),
  };
}
