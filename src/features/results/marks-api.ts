import { apiClient } from '@/lib/api-client';
import type { Band, Component, Settings } from './api';
import type { SubjectStatus } from './engine';

/*
 * Mark sheets (results phase 2): one per term, class and subject. Shapes and
 * rules are in docs/api/results.md ("Mark sheets").
 */

export type SheetStatus = 'draft' | 'submitted' | 'approved';
export type MarkStatus = 'scored' | 'absent' | 'exempt';

export interface Sheet {
  id: string;
  termId: string;
  classId: string;
  subjectId: string;
  status: SheetStatus;
  notAssessed: boolean;
  returnReason: string | null;
  rowVersion: number;
  schemeId: string;
  scaleId: string;
  submittedAt: string | null;
  submittedBy: { id: string; name: string } | null;
}

export interface Item {
  id: string;
  componentKey: string;
  itemIndex: number;
  label: string;
  /** Null on descriptor strands. */
  maxRaw: number | null;
  takenOn: string | null;
}

export interface Mark {
  componentKey: string;
  itemIndex: number;
  status: MarkStatus;
  rawScore: number | null;
  maxRaw: number | null;
  descriptorBandId: string | null;
  enteredBy: { id: string; name: string } | null;
  enteredAt: string | null;
}

export interface RosterRow {
  schoolStudentId: string;
  studentCode: string;
  fullName: string;
  flags: {
    joinedOn?: string;
    movedFrom?: { classId: string; className: string; on: string };
    leftOn?: string;
  };
  marks: Mark[];
  /** Items before the pupil joined; counted as exempt unless marked. */
  notRequired: { componentKey: string; itemIndex: number }[];
  /** Marks from another class with no matching item here; kept, not counted. */
  carried: {
    componentKey: string;
    itemIndex: number;
    rawScore: number | null;
    maxRaw: number | null;
    status: MarkStatus;
    fromClass: { classId: string; className: string };
  }[];
  preview: {
    status: SubjectStatus;
    componentScores: { key: string; score: number | null }[];
    total: number | null;
    grade: string | null;
    points: number | null;
    reweighted: boolean;
  };
}

export interface SheetScheme {
  id: string;
  name: string;
  mode: 'numeric' | 'descriptor';
  components: Component[];
}

export interface SheetScale {
  id: string;
  name: string;
  mode: 'numeric' | 'descriptor';
  bands: (Band & { id: string })[];
}

export interface OpenSheet {
  /** Names for the page title. */
  context?: { className: string; subjectName: string; termLabel: string; yearLabel: string };
  /** Null when the viewer may only read: the sheet isn't created for them. */
  sheet: Sheet | null;
  canEdit: boolean;
  scheme: SheetScheme;
  scale: SheetScale;
  settings: Settings;
  items: Item[];
  roster: RosterRow[];
}

export interface SheetCard {
  sheetId: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  status: SheetStatus | 'not_started';
  entered: number;
  expected: number;
  anyTeacher: boolean;
  teachers: { staffId: string; name: string }[];
}

export interface MarkChange {
  schoolStudentId: string;
  componentKey: string;
  itemIndex: number;
  /** Null removes the mark. */
  status: MarkStatus | null;
  rawScore?: number | null;
  descriptorBandId?: string | null;
}

/** A cell the backend refused (422 `details.cells`). */
export interface CellError {
  schoolStudentId: string;
  componentKey: string;
  itemIndex: number;
  message: string;
}

const base = '/schools/me/mark-sheets';
const id = (value: string) => encodeURIComponent(value);

export const marksApi = {
  async list(termId: string, mine: boolean): Promise<SheetCard[]> {
    return (
      (await apiClient.get<SheetCard[]>(`${base}?termId=${id(termId)}&mine=${mine}`)).data ?? []
    );
  },
  async open(termId: string, classId: string, subjectId: string): Promise<OpenSheet> {
    return (
      await apiClient.get<OpenSheet>(
        `${base}/open?termId=${id(termId)}&classId=${id(classId)}&subjectId=${id(subjectId)}`,
      )
    ).data;
  },
  async saveMarks(sheetId: string, rowVersion: number, marks: MarkChange[]) {
    return (
      await apiClient.put<{ rowVersion: number; rows: RosterRow[] }>(
        `${base}/${id(sheetId)}/marks`,
        { rowVersion, marks },
      )
    ).data;
  },
  async addItem(
    sheetId: string,
    body: {
      rowVersion: number;
      componentKey: string;
      label: string;
      maxRaw: number;
      takenOn?: string;
    },
  ) {
    return (
      await apiClient.post<{ rowVersion: number; items: Item[] }>(
        `${base}/${id(sheetId)}/items`,
        body,
      )
    ).data;
  },
  async updateItem(
    sheetId: string,
    itemId: string,
    body: { rowVersion: number; label?: string; maxRaw?: number; takenOn?: string | null },
  ) {
    return (
      await apiClient.patch<{ rowVersion: number; items: Item[] }>(
        `${base}/${id(sheetId)}/items/${id(itemId)}`,
        body,
      )
    ).data;
  },
  async deleteItem(sheetId: string, itemId: string, rowVersion: number, force = false) {
    return (
      await apiClient.delete<{ rowVersion: number; items: Item[] }>(
        `${base}/${id(sheetId)}/items/${id(itemId)}?rowVersion=${rowVersion}${force ? '&force=true' : ''}`,
      )
    ).data;
  },
  // Sheet actions carry the version they were made on and return the whole view.
  async submit(sheetId: string, rowVersion: number) {
    return (await apiClient.post<OpenSheet>(`${base}/${id(sheetId)}/submit`, { rowVersion })).data;
  },
  async returnSheet(sheetId: string, rowVersion: number, reason: string) {
    return (
      await apiClient.post<OpenSheet>(`${base}/${id(sheetId)}/return`, { rowVersion, reason })
    ).data;
  },
  async setNotAssessed(sheetId: string, rowVersion: number, notAssessed: boolean) {
    return (await apiClient.patch<OpenSheet>(`${base}/${id(sheetId)}`, { rowVersion, notAssessed }))
      .data;
  },
};
