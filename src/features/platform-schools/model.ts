/** Shapes returned by the Super Admin school endpoints (`/super-admin/schools/...`). */

export interface PlatformSchool {
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
  schoolHead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  } | null;
  studentsCount: number;
  staffCount: number;
  enabledModules: string[];
}

/** The editable profile fields (`PATCH /super-admin/schools/:id`); omitted fields stay unchanged. */
export interface SchoolProfileUpdate {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface PlatformStudent {
  id: string;
  studentCode: string;
  fullName: string;
  gender: string;
  status: string;
  className: string | null;
  guardianName: string | null;
  guardianContact: string | null;
  admissionDate: string | null;
}

export interface PlatformStaff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  position: string | null;
  department: string | null;
  isActive: boolean;
}

export interface ModuleEntitlement {
  moduleId: string;
  moduleKey: string;
  moduleName: string;
  description: string;
  isEnabled: boolean;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
