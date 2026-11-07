import { apiClient, pathId } from '@/lib/api-client';
import type { DeliveryProgress } from './delivery';

/** A standalone assessment such as "Mock 1" for one class. */
export interface Assessment {
  id: string;
  title: string;
  classId: string;
  className: string;
  termId: string;
  termLabel: string;
  yearLabel: string | null;
  componentKey: string;
  maxRaw: number;
  takenOn: string | null;
  status: 'draft' | 'published';
  /** Published revisions so far. */
  revision: number;
  publishedAt: string | null;
}

export interface AssessmentSubjectLine {
  subjectId: string;
  name: string;
  status: 'ok' | 'missing' | 'exempt';
  raw: number | null;
  /** Out of 100. */
  score: number | null;
  grade: string | null;
  remark: string | null;
  position: number | null;
  positionTied: boolean;
}

export interface AssessmentResults {
  assessment: Assessment;
  subjects: {
    subjectId: string;
    name: string;
    sheetId: string | null;
    entered: number;
    expected: number;
  }[];
  pupils: {
    schoolStudentId: string;
    studentCode: string | null;
    fullName: string;
    left: boolean;
    subjects: AssessmentSubjectLine[];
    subjectsCounted: number;
    total: number | null;
    outOf: number | null;
    average: number | null;
    aggregate: number | null;
    position: number | null;
    positionTied: boolean;
    complete: boolean;
  }[];
  stats: {
    subjectId: string;
    classAverage: number | null;
    highest: number | null;
    lowest: number | null;
  }[];
  onRoll: number;
  complete: boolean;
  /** The class's subjects without a paper in it; `addMissingPapers` adds them where it can. */
  notIncluded?: { subjectId: string; name: string }[];
}

/** Where an assessment's papers went: `partsAdded` subjects had no such part and got one at 0% (also in `added`). */
export interface AssessmentPapersResult {
  assessment: Assessment;
  added: { subjectId: string; subjectName: string; sheetId: string }[];
  skipped: { subjectId: string; subjectName: string; reason: string }[];
  partsAdded: { subjectId: string; subjectName: string; weighting: string }[];
}

export interface CreateAssessmentInput {
  termId: string;
  classId: string;
  componentKey: string;
  title: string;
  maxRaw: number;
  takenOn?: string;
}

const base = '/schools/me/assessments';

export const assessmentsApi = {
  async list(termId: string): Promise<Assessment[]> {
    return (await apiClient.get<Assessment[]>(`${base}?termId=${pathId(termId)}`)).data ?? [];
  },
  async create(input: CreateAssessmentInput): Promise<AssessmentPapersResult> {
    return (await apiClient.post<AssessmentPapersResult>(base, input)).data;
  },
  /** Puts the paper on the class's subjects that don't have it yet (heads). */
  async addMissingPapers(id: string): Promise<AssessmentPapersResult> {
    return (await apiClient.post<AssessmentPapersResult>(`${base}/${pathId(id)}/papers`)).data;
  },
  async results(id: string): Promise<AssessmentResults> {
    return (await apiClient.get<AssessmentResults>(`${base}/${pathId(id)}`)).data;
  },
  /** Publishes and queues the messages to parents; `notified` is what was queued. */
  async publish(id: string): Promise<AssessmentResults & { notified: DeliveryProgress }> {
    return (
      await apiClient.post<AssessmentResults & { notified: DeliveryProgress }>(
        `${base}/${pathId(id)}/publish`,
      )
    ).data;
  },
  /** How the messages from the latest publish stand (heads). */
  async notifications(id: string): Promise<DeliveryProgress> {
    return (await apiClient.get<DeliveryProgress>(`${base}/${pathId(id)}/notifications`)).data;
  },
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const names = (list: { subjectName: string }[]) => list.map((s) => s.subjectName).join(', ');

/** A one-line summary of where a mock's papers went, for a notification. */
export function papersMessage(res: AssessmentPapersResult): string {
  const parts: string[] = [];
  if (res.added.length) parts.push(`Its paper is on ${plural(res.added.length, 'subject')}.`);
  if (res.partsAdded.length) {
    // The new weighting is "<old> + <Part> 0%".
    const part = res.partsAdded[0].weighting.split(' + ').pop()?.replace(/ 0%$/, '') ?? 'such';
    parts.push(
      `${names(res.partsAdded)} had no ${part} part, so one was added at 0%: their term results don't change.`,
    );
  }
  if (res.skipped.length)
    parts.push(
      `Not on ${res.skipped.map((s) => `${s.subjectName} (${s.reason.replace(/\.$/, '')})`).join(', ')}.`,
    );
  return parts.join(' ') || 'Every subject already has its paper.';
}
