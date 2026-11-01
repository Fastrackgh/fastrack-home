import { apiClient, type PageMeta, pathId } from '@/lib/api-client';
import { fetchAll, pageParams, toPage, type Raw } from '@/lib/pagination';

/** Amounts in platform analytics are decimal cedis, summed across every school. */
export interface PlatformFinance {
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
  paymentMethods: { method: string; count: number; totalAmount: number }[];
}

export interface PlatformDemographics {
  total: number;
  active: number;
  inactive: number;
  gender: { male: number; female: number; unspecified: number };
  boarding: { boarding: number; day: number };
  classDistribution: { className: string; count: number }[];
}

export interface PlatformActivity {
  userRoles: { role: string; count: number }[];
  moduleAdoption: { moduleKey: string; moduleName: string; enabledCount: number }[];
  loginActivity7Days: { date: string; successCount: number; failCount: number }[];
}

export interface SchoolComparison {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  studentsCount: number;
  staffCount: number;
  totalCollected: number;
  collectionRate: number;
}

export interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LoginLog {
  id: string;
  userEmail: string;
  userName: string | null;
  role: string | null;
  schoolName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isSuccess: boolean;
  createdAt: string;
}

export interface LoginLogFilters {
  email: string;
  role: string | null;
  isSuccess: 'true' | 'false' | null;
}

export interface NewPlatformUser {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/** A school as the platform console lists it. */
export interface SchoolItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  studentsCount?: number;
  staffCount?: number;
}

export interface PlatformAnalytics {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  totalSchools: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
  netOperatingCashflow: number;
  attendanceRate: number;
  staffStudentRatio: string;
}

export interface PlatformModule {
  id: string;
  moduleKey: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
}

export interface NewSchool {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/** Super Admin calls that span every school. */
export const platformApi = {
  /** Every school, a full page at a time (the list endpoint returns at most 100). */
  async listSchools(): Promise<SchoolItem[]> {
    return fetchAll<SchoolItem>('/super-admin/schools');
  },
  async createSchool(school: NewSchool) {
    await apiClient.post('/super-admin/schools', school);
  },
  async overview() {
    return (await apiClient.get<PlatformAnalytics>('/super-admin/analytics/overview')).data;
  },
  async listModules(): Promise<PlatformModule[]> {
    return (await apiClient.get<PlatformModule[]>('/super-admin/modules?limit=50')).data ?? [];
  },

  async finance() {
    return (await apiClient.get<PlatformFinance>('/super-admin/analytics/finance')).data;
  },
  async demographics() {
    return (await apiClient.get<PlatformDemographics>('/super-admin/analytics/demographics')).data;
  },
  async activity() {
    return (await apiClient.get<PlatformActivity>('/super-admin/analytics/activity')).data;
  },
  async comparison(): Promise<SchoolComparison[]> {
    const res = await apiClient.get<{ items: SchoolComparison[] } | SchoolComparison[]>(
      '/super-admin/analytics/schools-comparison',
    );
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  async listUsers(page: number, search: string) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/super-admin/users?${pageParams(page, { search: search.trim() })}`,
    );
    return toPage(res, (raw) => raw as unknown as PlatformUser);
  },
  /** No password: the backend emails an invitation to set one. */
  async createUser(user: NewPlatformUser) {
    await apiClient.post('/super-admin/users', user);
  },
  async setUserActive(userId: string, active: boolean) {
    await apiClient.patch(
      `/super-admin/users/${pathId(userId)}/${active ? 'activate' : 'deactivate'}`,
    );
  },

  async listLogins(page: number, filters: LoginLogFilters) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/super-admin/system/audit/logins?${pageParams(page, {
        email: filters.email.trim(),
        role: filters.role,
        isSuccess: filters.isSuccess,
      })}`,
    );
    return toPage(res, (raw) => raw as unknown as LoginLog);
  },
};
