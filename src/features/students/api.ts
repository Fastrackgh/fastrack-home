import { apiClient, pathId, type PageMeta } from '@/lib/api-client';
import { pageParams, toPage, type Page, type Raw } from '@/lib/pagination';

export type StudentStatus =
  'Pending_Admission' | 'Active' | 'Inactive' | 'Stopped' | 'Transferred_Out' | 'Graduated';

export const STATUS_LABELS: Record<StudentStatus, string> = {
  Pending_Admission: 'Pending admission',
  Active: 'Active',
  Inactive: 'Inactive',
  Stopped: 'Stopped',
  Transferred_Out: 'Transferred out',
  Graduated: 'Graduated',
};

/** Statuses a student can leave the school with. */
export const EXIT_STATUSES: StudentStatus[] = [
  'Graduated',
  'Transferred_Out',
  'Stopped',
  'Inactive',
];

export interface LinkedParent {
  parentId: string;
  fullName: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  /** False once the parent's phone/email no longer matches a guardian contact. */
  contactOnRecord: boolean;
}

const contactKeys = (p: Pick<LinkedParent, 'phone' | 'email'>) => {
  const digits = (p.phone ?? '').replace(/\D/g, '');
  const email = p.email.trim().toLowerCase();
  return [
    ...(digits.length >= 9 ? [`phone:${digits.slice(-9)}`] : []),
    ...(email.includes('@') ? [`email:${email}`] : []),
  ];
};

/**
 * The other linked accounts a relink block on `parent` also unlinks: those on
 * the same phone (last 9 digits) or email, followed through shared contacts.
 * Mirrors the backend (QA-240).
 */
export function accountsSharingContact(parent: LinkedParent, linked: LinkedParent[]) {
  const keys = new Set(contactKeys(parent));
  const sharing: LinkedParent[] = [];
  let pending = linked.filter((p) => p.parentId !== parent.parentId);
  for (let grew = true; grew;) {
    grew = false;
    pending = pending.filter((p) => {
      const own = contactKeys(p);
      if (!own.some((k) => keys.has(k))) return true;
      own.forEach((k) => keys.add(k));
      sharing.push(p);
      grew = true;
      return false;
    });
  }
  return sharing;
}

/** A parent this school stopped from linking to the student again. */
export interface LinkBlock {
  id: string;
  parentId: string | null;
  parentName: string | null;
  reason: string | null;
  blockedAt: string;
  blockedBy: string | null;
}

/** One entry of the student's audit trail (guardian edits, links, blocks). */
export interface HistoryEntry {
  id: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown> | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  className: string;
  termLabel: string;
  enrolledOn: string | null;
}

export interface FeePreference {
  enabled: boolean;
  customAmount?: number | null;
  notes?: string | null;
}

/** The editable profile fields, as `PATCH /schools/me/students/:id` takes them. */
export const PROFILE_FIELDS = [
  'firstName',
  'surname',
  'otherName',
  'gender',
  'birthDate',
  'nationality',
  'nationalId',
  'religion',
  'residence',
  'digitalAddress',
  'bloodGroup',
  'genotype',
  'allergiesMedicalNotes',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type Profile = Record<ProfileField, string>;

/** Guardian and emergency contacts; parents link through the phone/email here. */
export const GUARDIAN_FIELDS = [
  'motherName',
  'motherContact',
  'motherEmail',
  'motherOccupation',
  'fatherName',
  'fatherContact',
  'fatherEmail',
  'fatherOccupation',
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
] as const;

export type GuardianField = (typeof GUARDIAN_FIELDS)[number];
export type Guardians = Record<GuardianField, string>;

export interface StudentDetail {
  /** The enrolment id: what every `/schools/me/students/:id` route takes. */
  id: string;
  studentCode: string;
  fullName: string;
  status: StudentStatus;
  photoUrl: string | null;
  classId: string | null;
  className: string | null;
  profile: Profile;
  guardians: Guardians;
  parents: LinkedParent[];
  linkBlocks: LinkBlock[];
  history: Enrollment[];
  /** The record's version, the base of a queued edit (contract §5, §9.3); null from an older server. */
  rowVersion: number | null;
}

export const REQUIRED = new Set<ProfileField>(['firstName', 'surname', 'gender', 'birthDate']);
export const studentPath = (studentId: string) => `/schools/me/students/${pathId(studentId)}`;
const str = (value: unknown) => (typeof value === 'string' ? value : '');

export function toDetail(raw: Raw): StudentDetail {
  const current = raw.currentClass as { id?: string; className?: string } | null;
  return {
    id: String(raw.id),
    studentCode: str(raw.studentCode),
    fullName: str(raw.fullName),
    status: (raw.status as StudentStatus) ?? 'Active',
    photoUrl: str(raw.photoUrl) || null,
    classId: current?.id ?? null,
    className: current?.className ?? null,
    profile: Object.fromEntries(
      PROFILE_FIELDS.map((field) => [
        field,
        str(raw[field]).slice(0, field === 'birthDate' ? 10 : undefined),
      ]),
    ) as Profile,
    guardians: Object.fromEntries(
      GUARDIAN_FIELDS.map((field) => [field, str(raw[field])]),
    ) as Guardians,
    parents: ((raw.parents as LinkedParent[]) ?? []).map((p) => ({ ...p })),
    linkBlocks: ((raw.linkBlocks as LinkBlock[]) ?? []).map((b) => ({ ...b })),
    history: ((raw.enrollmentHistory as Raw[]) ?? []).map((e) => ({
      id: String(e.id),
      className: str(e.className),
      termLabel: str(e.termLabel),
      enrolledOn: str(e.enrolledOn) || null,
    })),
    rowVersion: typeof raw.rowVersion === 'number' ? raw.rowVersion : null,
  };
}

/** A row in the students table (`GET /schools/me/students`). */
export interface StudentRow {
  id: string;
  studentId: string;
  studentCode: string;
  firstName: string;
  surname: string;
  otherName?: string | null;
  fullName: string;
  gender: 'Male' | 'Female' | string;
  status: 'Active' | 'Inactive' | string;
  classId: string;
  classCode?: string;
  className: string;
  guardianName?: string | null;
  guardianContact?: string | null;
  nationalId?: string | null;
  bloodGroup?: string | null;
  boardingStatus?: string | null;
  admissionDate?: string | null;
  createdAt: string;
}

export interface StudentFilters {
  search?: string | null;
  classId?: string | null;
  status?: string | null;
}

export const studentsApi = {
  /** One page of the students table. */
  async list(page: number, filters: StudentFilters): Promise<Page<StudentRow>> {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/students?${pageParams(page, { search: filters.search, classId: filters.classId, status: filters.status })}`,
    );
    return toPage(res, (raw) => raw as unknown as StudentRow);
  },
  /** How many students are active, school-wide. */
  async activeCount(): Promise<number> {
    const res = await apiClient.get<Raw[], PageMeta>('/schools/me/students?status=Active&limit=1');
    return res.meta?.total ?? 0;
  },
  async get(studentId: string) {
    return toDetail((await apiClient.get<Raw>(studentPath(studentId))).data ?? {});
  },
  async uploadPhoto(studentId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    await apiClient.request(`${studentPath(studentId)}/photo`, { method: 'PUT', body: form });
  },
  async removePhoto(studentId: string) {
    await apiClient.delete(`${studentPath(studentId)}/photo`);
  },
  async promote(
    studentId: string,
    input: { targetClassId: string; termId: string; enrolledOn?: string },
  ) {
    await apiClient.post(`${studentPath(studentId)}/promote`, input);
  },
  async recordExit(
    studentId: string,
    input: { academicTermId: string; exitDate: string; status: StudentStatus; reason?: string },
  ) {
    await apiClient.post(`${studentPath(studentId)}/exit`, input);
  },
  /**
   * Unlinks a parent; with `preventRelink` they (and anyone on their phone or
   * email) can't link again until the block is lifted.
   */
  async unlinkParent(
    studentId: string,
    parentId: string,
    options: { preventRelink?: boolean; reason?: string } = {},
  ) {
    const query = new URLSearchParams();
    if (options.preventRelink) query.set('preventRelink', 'true');
    if (options.preventRelink && options.reason?.trim()) query.set('reason', options.reason.trim());
    const suffix = query.toString() ? `?${query.toString()}` : '';
    await apiClient.delete(`${studentPath(studentId)}/parents/${pathId(parentId)}${suffix}`);
  },
  /** Links the parent account using the mother's or father's contact on record. */
  async linkFromGuardian(studentId: string, guardian: 'mother' | 'father') {
    await apiClient.post(`${studentPath(studentId)}/parents/from-guardian`, { guardian });
  },
  async liftBlock(studentId: string, blockId: string) {
    await apiClient.delete(`${studentPath(studentId)}/parent-blocks/${pathId(blockId)}`);
  },
  /** Newest first. A v2 list response, so the entries are `data` itself (QA-238). */
  async history(studentId: string) {
    const res = await apiClient.get<HistoryEntry[]>(`${studentPath(studentId)}/history?limit=50`);
    return Array.isArray(res.data) ? res.data : [];
  },
  async feePreferences(studentId: string) {
    return (
      (
        await apiClient.get<Record<string, FeePreference>>(
          `${studentPath(studentId)}/optional-fees`,
        )
      ).data ?? {}
    );
  },
  async setFeePreference(studentId: string, feeTypeId: string, enabled: boolean) {
    await apiClient.put(`${studentPath(studentId)}/optional-fees`, { feeTypeId, enabled });
  },
};
