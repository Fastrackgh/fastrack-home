import { apiClient } from '@/lib/api-client';
import type { Raw } from '@/lib/pagination';

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
  'emergencyContactName',
  'emergencyContactPhone',
  'emergencyContactRelationship',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type Profile = Record<ProfileField, string>;

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
  parents: LinkedParent[];
  history: Enrollment[];
}

const REQUIRED = new Set<ProfileField>(['firstName', 'surname', 'gender', 'birthDate']);
const id = (value: string) => encodeURIComponent(value);
const base = (studentId: string) => `/schools/me/students/${id(studentId)}`;
const str = (value: unknown) => (typeof value === 'string' ? value : '');

function toDetail(raw: Raw): StudentDetail {
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
    parents: ((raw.parents as LinkedParent[]) ?? []).map((p) => ({ ...p })),
    history: ((raw.enrollmentHistory as Raw[]) ?? []).map((e) => ({
      id: String(e.id),
      className: str(e.className),
      termLabel: str(e.termLabel),
      enrolledOn: str(e.enrolledOn) || null,
    })),
  };
}

export const studentsApi = {
  async get(studentId: string) {
    return toDetail((await apiClient.get<Raw>(base(studentId))).data ?? {});
  },
  /**
   * Sends only the fields that changed. A cleared text field is sent empty to
   * blank it; names, gender and the birth date can't be blanked.
   */
  async update(studentId: string, change: Partial<Profile>) {
    const body = Object.fromEntries(
      Object.entries(change)
        .map(([key, value]) => [key, (value ?? '').trim()])
        .filter(([key, value]) => value !== '' || !REQUIRED.has(key as ProfileField)),
    );
    await apiClient.patch(base(studentId), body);
  },
  async uploadPhoto(studentId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    await apiClient.request(`${base(studentId)}/photo`, { method: 'PUT', body: form });
  },
  async removePhoto(studentId: string) {
    await apiClient.delete(`${base(studentId)}/photo`);
  },
  async promote(
    studentId: string,
    input: { targetClassId: string; termId: string; enrolledOn?: string },
  ) {
    await apiClient.post(`${base(studentId)}/promote`, input);
  },
  async recordExit(
    studentId: string,
    input: { academicTermId: string; exitDate: string; status: StudentStatus; reason?: string },
  ) {
    await apiClient.post(`${base(studentId)}/exit`, input);
  },
  async unlinkParent(studentId: string, parentId: string) {
    await apiClient.delete(`${base(studentId)}/parents/${id(parentId)}`);
  },
  async feePreferences(studentId: string) {
    return (
      (await apiClient.get<Record<string, FeePreference>>(`${base(studentId)}/optional-fees`))
        .data ?? {}
    );
  },
  async setFeePreference(studentId: string, feeTypeId: string, enabled: boolean) {
    await apiClient.put(`${base(studentId)}/optional-fees`, { feeTypeId, enabled });
  },
};

export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;
