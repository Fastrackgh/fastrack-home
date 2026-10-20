import { apiClient } from '@/lib/api-client';
import type {
  ModuleEntitlement,
  PageMeta,
  PlatformSchool,
  PlatformStaff,
  PlatformStudent,
  SchoolProfileUpdate,
} from './model';

const schoolPath = (schoolId: string) => `/super-admin/schools/${encodeURIComponent(schoolId)}`;

/** Super Admin calls for one school. Every request carries the signed-in session. */
export const platformSchoolsApi = {
  async getSchool(schoolId: string) {
    return (await apiClient.get<PlatformSchool>(schoolPath(schoolId))).data;
  },
  async updateSchool(schoolId: string, update: SchoolProfileUpdate) {
    await apiClient.patch(schoolPath(schoolId), update);
  },
  async setActive(schoolId: string, active: boolean) {
    await apiClient.patch(`${schoolPath(schoolId)}/${active ? 'activate' : 'deactivate'}`, {});
  },
  async listStudents(schoolId: string, page: number, search: string) {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search.trim()) params.set('search', search.trim());
    const res = await apiClient.get<PlatformStudent[], PageMeta>(
      `${schoolPath(schoolId)}/students?${params}`,
    );
    return { items: res.data ?? [], meta: res.meta };
  },
  async listStaff(schoolId: string) {
    const res = await apiClient.get<PlatformStaff[]>(`${schoolPath(schoolId)}/staff?limit=100`);
    return res.data ?? [];
  },
  async listModules(schoolId: string) {
    const res = await apiClient.get<ModuleEntitlement[]>(
      `/super-admin/modules/schools/${encodeURIComponent(schoolId)}`,
    );
    return res.data ?? [];
  },
  async setModule(schoolId: string, moduleId: string, isEnabled: boolean) {
    await apiClient.post(`/super-admin/modules/schools/${encodeURIComponent(schoolId)}/toggle`, {
      moduleId,
      isEnabled,
    });
  },
};
