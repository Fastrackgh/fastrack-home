import { apiClient, type PageMeta, pathId } from '@/lib/api-client';
import { pageParams, toPage, type Raw } from '@/lib/pagination';

export interface AcademicTerm {
  id: string;
  academicYearId: string;
  termSequence: number;
  termLabel: string;
  /** YYYY-MM-DD. */
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface AcademicYear {
  id: string;
  /** Derived by the backend from the start date, e.g. "2026/2027". */
  yearLabel: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms: AcademicTerm[];
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  headStaffId: string | null;
  headStaffName: string | null;
  sequenceOrder: number;
  classCount: number;
}

export interface SchoolClass {
  id: string;
  classCode: string;
  className: string;
  departmentId: string | null;
  departmentName: string | null;
  homeroomStaffId: string | null;
  /** Promotion moves pupils to the class with the next number (QA-207). */
  sequenceOrder: number;
}

/** A teacher who can head a department or a class. */
export interface StaffOption {
  id: string;
  name: string;
}

export interface SchoolDetails {
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
}

export interface DatesInput {
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export interface DepartmentInput {
  code: string;
  name: string;
  description?: string;
  headStaffId?: string | null;
  sequenceOrder?: number;
}

export interface ClassInput {
  classCode: string;
  className: string;
  departmentId: string | null;
  homeroomStaffId: string | null;
  /** Left out on a new class, which then goes after the last one. */
  sequenceOrder?: number;
}

/**
 * A subject in the school's catalogue. One English serves every class that
 * takes it; which classes take it is set per class (docs/api/results.md).
 */
export interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  shortName: string | null;
  category: string | null;
  isActive: boolean;
  classCount: number;
}

export interface SubjectInput {
  subjectCode: string;
  subjectName: string;
  shortName?: string | null;
  category?: string | null;
  isActive?: boolean;
}

/** How a subject counts in a BECE-style aggregate: always, among the best others, or not at all. */
export type AggregateRole = 'none' | 'core' | 'pool';

/**
 * A subject a class takes. It stands until someone changes it, through every
 * term and year; pupils take their current class's subjects.
 */
export interface ClassSubject {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sequenceOrder: number;
  /** Printed on the report instead of the subject's name, e.g. "Ga". */
  reportLabel: string | null;
  countsInAverage: boolean;
  aggregateRole: AggregateRole;
  /** Empty means any teacher can enter its marks. */
  teachers: StaffOption[];
}

export interface ClassSubjectInput {
  subjectId: string;
  sequenceOrder: number;
  reportLabel: string | null;
  countsInAverage: boolean;
  aggregateRole: AggregateRole;
  teacherIds: string[];
}

export type SchoolDetailsInput = Partial<Omit<SchoolDetails, 'code' | 'logoUrl'>>;

/** The backend caps every list at 100 rows. */
const ALL = 'limit=100';
const text = (value: unknown) => (typeof value === 'string' && value ? value : null);

const toClass = (raw: Raw): SchoolClass => {
  const department = raw.department as { name?: string } | null;
  return {
    id: String(raw.id),
    classCode: String(raw.classCode ?? ''),
    className: String(raw.className ?? ''),
    departmentId: text(raw.departmentId),
    departmentName: department?.name ?? null,
    homeroomStaffId: text(raw.homeroomStaffId),
    sequenceOrder: Number(raw.sequenceOrder ?? 0),
  };
};

const toSubject = (raw: Raw): Subject => ({
  id: String(raw.id),
  subjectCode: String(raw.subjectCode ?? ''),
  subjectName: String(raw.subjectName ?? ''),
  shortName: text(raw.shortName),
  category: text(raw.category),
  isActive: raw.isActive !== false,
  classCount: Number(raw.classCount ?? 0),
});

const toClassSubject = (raw: Raw): ClassSubject => ({
  subjectId: String(raw.subjectId),
  subjectCode: String(raw.subjectCode ?? ''),
  subjectName: String(raw.subjectName ?? ''),
  sequenceOrder: Number(raw.sequenceOrder ?? 0),
  reportLabel: text(raw.reportLabel),
  countsInAverage: raw.countsInAverage !== false,
  aggregateRole:
    raw.aggregateRole === 'core' || raw.aggregateRole === 'pool' ? raw.aggregateRole : 'none',
  teachers: ((raw.teachers as Raw[] | undefined) ?? []).map((t) => ({
    id: String(t.staffId),
    name: String(t.name ?? ''),
  })),
});

export const setupApi = {
  /** Every academic year with its terms, newest first. */
  async listYears(): Promise<AcademicYear[]> {
    const years =
      (await apiClient.get<Omit<AcademicYear, 'terms'>[]>(`/schools/me/academic-years?${ALL}`))
        .data ?? [];
    const withTerms = await Promise.all(
      years.map(async (year) => {
        const terms =
          (
            await apiClient.get<AcademicTerm[]>(
              `/schools/me/academic-years/${pathId(year.id)}/terms?${ALL}`,
            )
          ).data ?? [];
        return { ...year, terms: [...terms].sort((a, b) => a.termSequence - b.termSequence) };
      }),
    );
    return withTerms.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },
  async createYear(input: DatesInput) {
    await apiClient.post('/schools/me/academic-years', input);
  },
  async updateYear(yearId: string, change: Partial<DatesInput>) {
    await apiClient.patch(`/schools/me/academic-years/${pathId(yearId)}`, change);
  },
  async createTerm(yearId: string, input: DatesInput & { termSequence: number }) {
    await apiClient.post(`/schools/me/academic-years/${pathId(yearId)}/terms`, input);
  },
  async updateTerm(
    yearId: string,
    termId: string,
    change: Partial<DatesInput & { termSequence: number }>,
  ) {
    await apiClient.patch(
      `/schools/me/academic-years/${pathId(yearId)}/terms/${pathId(termId)}`,
      change,
    );
  },

  async listDepartments(): Promise<Department[]> {
    const rows = (await apiClient.get<Department[]>(`/schools/me/departments?${ALL}`)).data ?? [];
    return [...rows].sort(
      (a, b) => a.sequenceOrder - b.sequenceOrder || a.name.localeCompare(b.name),
    );
  },
  async createDepartment(input: DepartmentInput) {
    await apiClient.post('/schools/me/departments', input);
  },
  async updateDepartment(departmentId: string, change: Partial<DepartmentInput>) {
    await apiClient.patch(`/schools/me/departments/${pathId(departmentId)}`, change);
  },
  async deleteDepartment(departmentId: string) {
    await apiClient.delete(`/schools/me/departments/${pathId(departmentId)}`);
  },
  /** Adds the standard departments (Pre-School, Lower Primary, …) that are missing. */
  async addDefaultDepartments() {
    await apiClient.post('/schools/me/departments/seed-defaults');
  },

  async listClasses(page: number, search: string) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/classes?${pageParams(page, { search: search.trim() })}`,
    );
    return toPage(res, toClass);
  },
  /** Every class, fetched a full page at a time, for pickers. */
  async allClasses(): Promise<SchoolClass[]> {
    const rows: SchoolClass[] = [];
    for (let page = 1; ; page++) {
      const res = await apiClient.get<Raw[], PageMeta>(`/schools/me/classes?page=${page}&${ALL}`);
      rows.push(...(res.data ?? []).map(toClass));
      if (!res.meta?.hasNext) break;
    }
    return rows.sort(
      (a, b) =>
        a.sequenceOrder - b.sequenceOrder ||
        a.className.localeCompare(b.className, undefined, { numeric: true }),
    );
  },
  async createClass(input: ClassInput) {
    const body = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null));
    await apiClient.post('/schools/me/classes', body);
  },
  async updateClass(classId: string, change: ClassInput) {
    await apiClient.patch(`/schools/me/classes/${pathId(classId)}`, change);
  },

  /** The whole catalogue in one list; it isn't paged, and `limit` is refused. */
  async listSubjects(includeInactive = false): Promise<Subject[]> {
    const rows =
      (
        await apiClient.get<Raw[]>(
          `/schools/me/subjects${includeInactive ? '?includeInactive=true' : ''}`,
        )
      ).data ?? [];
    return rows
      .map(toSubject)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, undefined, { numeric: true }));
  },
  async createSubject(input: SubjectInput) {
    await apiClient.post('/schools/me/subjects', input);
  },
  async updateSubject(subjectId: string, change: Partial<SubjectInput>) {
    await apiClient.patch(`/schools/me/subjects/${pathId(subjectId)}`, change);
  },
  /** Refused (409) while a class or a mark uses it; deactivate it instead. */
  async deleteSubject(subjectId: string) {
    await apiClient.delete(`/schools/me/subjects/${pathId(subjectId)}`);
  },
  async listClassSubjects(classId: string): Promise<ClassSubject[]> {
    const rows =
      (await apiClient.get<Raw[]>(`/schools/me/classes/${pathId(classId)}/subjects`)).data ?? [];
    return rows.map(toClassSubject).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  },
  /**
   * Replaces the class's whole list. A subject left out is removed from the
   * class, or kept inactive if it already has marks.
   */
  async saveClassSubjects(classId: string, subjects: ClassSubjectInput[]) {
    const rows =
      (await apiClient.put<Raw[]>(`/schools/me/classes/${pathId(classId)}/subjects`, subjects))
        .data ?? [];
    return rows.map(toClassSubject);
  },
  /** Adds subjects to every class in a department, or to chosen classes. */
  async applySubjects(input: { subjectIds: string[]; departmentId?: string; classIds?: string[] }) {
    return (
      await apiClient.post<{ added: number; alreadyThere: number }>(
        '/schools/me/class-subjects/apply',
        input,
      )
    ).data;
  },

  /** Any active staff member can teach a subject, heads included. */
  async listActiveStaff(): Promise<StaffOption[]> {
    const rows =
      (
        await apiClient.get<{ id: string; firstName: string; lastName: string }[]>(
          `/schools/me/staff?isActive=true&${ALL}`,
        )
      ).data ?? [];
    return rows
      .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async listStaffOptions(): Promise<StaffOption[]> {
    // Heads of department and class teachers must be active teachers.
    const rows =
      (
        await apiClient.get<{ id: string; firstName: string; lastName: string }[]>(
          `/schools/me/staff?role=TEACHER&isActive=true&${ALL}`,
        )
      ).data ?? [];
    return rows.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }));
  },

  async getSchool(): Promise<SchoolDetails> {
    const raw = (await apiClient.get<Raw>('/schools/me')).data ?? {};
    return {
      name: String(raw.name ?? ''),
      code: String(raw.code ?? ''),
      address: text(raw.address),
      phone: text(raw.phone),
      email: text(raw.email),
      website: text(raw.website),
      logoUrl: text(raw.logoUrl),
    };
  },
  async updateSchool(change: SchoolDetailsInput) {
    await apiClient.patch('/schools/me', change);
  },
  async uploadLogo(file: File) {
    const form = new FormData();
    form.append('file', file);
    await apiClient.request('/schools/me/logo', { method: 'PUT', body: form });
  },
  async removeLogo() {
    await apiClient.delete('/schools/me/logo');
  },
};
