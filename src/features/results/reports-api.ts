import { apiClient, pathId } from '@/lib/api-client';

/*
 * Term reports (results phase 3): a batch per term and class, worked out from
 * the mark sheets, with remarks, approval and publishing. Shapes are in
 * docs/api/results.md ("Term reports").
 */

export type BatchStatus = 'open' | 'in_review' | 'approved' | 'published' | 'reopened';

export interface Batch {
  termId: string;
  classId: string;
  status: BatchStatus;
  revision: number;
  computedAt: string | null;
  approvedAt: string | null;
  approvedBy: { id: string; name: string } | null;
  publishedAt: string | null;
  publishedBy: { id: string; name: string } | null;
  reopenReason: string | null;
  onRoll: number;
  rankedCount: number;
  isLastTerm: boolean;
}

export type Blocker =
  | { type: 'sheet_not_submitted'; subjectId: string; subjectName: string }
  | { type: 'remarks_missing'; count: number };

export interface BoardRow {
  classId: string;
  className: string;
  status: BatchStatus | 'not_started';
  sheetsSubmitted: number;
  sheetsTotal: number;
  remarksDone: number;
  pupils: number;
  blockers: Blocker[];
}

export interface Promotion {
  status: 'promoted' | 'repeated' | 'graduated';
  toClassId: string | null;
  toClassName: string | null;
}

export interface Attendance {
  present: number;
  total: number;
  source: 'register' | 'manual';
}

export interface PupilReport {
  termReportId: string;
  schoolStudentId: string;
  fullName: string;
  status: 'ready' | 'incomplete' | 'left';
  withheld: boolean;
  withheldReason: string | null;
  average: number | null;
  total: number | null;
  aggregate: number | null;
  position: number | null;
  subjects: {
    subjectId: string;
    subjectName: string;
    total: number | null;
    grade: string | null;
    position: number | null;
    status: 'ok' | 'incomplete' | 'exempt' | 'missing' | 'not_assessed';
  }[];
  classTeacherRemark: string | null;
  headRemark: string | null;
  conduct: string | null;
  attitude: string | null;
  interest: string | null;
  promotion: Promotion | null;
  attendance: Attendance | null;
}

/** A partial update: fields left out stay; null clears one. */
export type RemarksChange = Partial<{
  classTeacherRemark: string | null;
  headRemark: string | null;
  conduct: string | null;
  attitude: string | null;
  interest: string | null;
  promotion: Omit<Promotion, 'toClassName'> | null;
  attendance: { present: number; total: number } | null;
}>;

export type RemarkKind = 'class_teacher' | 'head' | 'conduct' | 'attitude' | 'interest';

export interface BankRemark {
  id: string;
  kind: RemarkKind;
  text: string;
  minAverage: number | null;
  maxAverage: number | null;
}

const batchPath = (termId: string, classId: string) =>
  `/schools/me/report-batches/${pathId(termId)}/${pathId(classId)}`;

export const reportsApi = {
  async board(termId: string): Promise<BoardRow[]> {
    return (
      (await apiClient.get<BoardRow[]>(`/schools/me/report-batches?termId=${pathId(termId)}`))
        .data ?? []
    );
  },
  async batch(termId: string, classId: string) {
    return (
      await apiClient.get<{ batch: Batch | null; pupils: PupilReport[] }>(
        batchPath(termId, classId),
      )
    ).data;
  },
  async compute(termId: string, classId: string) {
    return (
      await apiClient.post<{ batch: Batch; pupils: PupilReport[] }>(
        `${batchPath(termId, classId)}/compute`,
        {},
      )
    ).data;
  },
  async saveRemarks(termReportId: string, change: RemarksChange) {
    return (
      await apiClient.put<PupilReport>(
        `/schools/me/term-reports/${pathId(termReportId)}/remarks`,
        change,
      )
    ).data;
  },
  async action(termId: string, classId: string, action: 'approve' | 'publish', body = {}) {
    return (await apiClient.post(`${batchPath(termId, classId)}/${action}`, body)).data;
  },
  async reopen(termId: string, classId: string, reason: string) {
    return (await apiClient.post(`${batchPath(termId, classId)}/reopen`, { reason })).data;
  },
  async withhold(termReportId: string, reason: string) {
    return (
      await apiClient.post<PupilReport>(
        `/schools/me/term-reports/${pathId(termReportId)}/withhold`,
        {
          reason,
        },
      )
    ).data;
  },
  async release(termReportId: string) {
    return (
      await apiClient.post<PupilReport>(
        `/schools/me/term-reports/${pathId(termReportId)}/release`,
        {},
      )
    ).data;
  },
  async document(termReportId: string): Promise<string> {
    return (
      (
        await apiClient.get<{ html: string }>(
          `/schools/me/term-reports/${pathId(termReportId)}/document`,
        )
      ).data?.html ?? ''
    );
  },
  async classDocuments(termId: string, classId: string): Promise<string> {
    return (
      (await apiClient.get<{ html: string }>(`${batchPath(termId, classId)}/documents`)).data
        ?.html ?? ''
    );
  },
  async remarkBank(): Promise<BankRemark[]> {
    return (await apiClient.get<BankRemark[]>('/schools/me/remark-bank')).data ?? [];
  },
};
