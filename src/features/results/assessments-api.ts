import { apiClient, pathId } from '@/lib/api-client';

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
  async create(input: CreateAssessmentInput) {
    return (
      await apiClient.post<{
        assessment: Assessment;
        added: { subjectId: string; subjectName: string; sheetId: string }[];
        skipped: { subjectId: string; subjectName: string; reason: string }[];
      }>(base, input)
    ).data;
  },
  async results(id: string): Promise<AssessmentResults> {
    return (await apiClient.get<AssessmentResults>(`${base}/${pathId(id)}`)).data;
  },
  async publish(id: string): Promise<AssessmentResults> {
    return (await apiClient.post<AssessmentResults>(`${base}/${pathId(id)}/publish`)).data;
  },
};
