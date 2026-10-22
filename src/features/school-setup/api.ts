import { apiClient, type PageMeta } from '@/lib/api-client';
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
}

export type SchoolDetailsInput = Partial<Omit<SchoolDetails, 'code' | 'logoUrl'>>;

/** The backend caps every list at 100 rows. */
const ALL = 'limit=100';
const id = (value: string) => encodeURIComponent(value);
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
  };
};

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
              `/schools/me/academic-years/${id(year.id)}/terms?${ALL}`,
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
    await apiClient.patch(`/schools/me/academic-years/${id(yearId)}`, change);
  },
  async createTerm(yearId: string, input: DatesInput & { termSequence: number }) {
    await apiClient.post(`/schools/me/academic-years/${id(yearId)}/terms`, input);
  },
  async updateTerm(
    yearId: string,
    termId: string,
    change: Partial<DatesInput & { termSequence: number }>,
  ) {
    await apiClient.patch(`/schools/me/academic-years/${id(yearId)}/terms/${id(termId)}`, change);
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
    await apiClient.patch(`/schools/me/departments/${id(departmentId)}`, change);
  },
  async deleteDepartment(departmentId: string) {
    await apiClient.delete(`/schools/me/departments/${id(departmentId)}`);
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
    return rows.sort((a, b) =>
      a.className.localeCompare(b.className, undefined, { numeric: true }),
    );
  },
  async createClass(input: ClassInput) {
    const body = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null));
    await apiClient.post('/schools/me/classes', body);
  },
  async updateClass(classId: string, change: ClassInput) {
    await apiClient.patch(`/schools/me/classes/${id(classId)}`, change);
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

export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;
