export type SchoolStatus = "Active" | "Trial" | "Suspended";
export type UserStatus = "Active" | "Invited" | "Inactive";
export type SchoolRole =
  | "Owner"
  | "Principal"
  | "Administrator"
  | "Academic Head"
  | "Teacher"
  | "Account Officer"
  | "Secretary";

export interface SchoolProfile {
  id: string;
  name: string;
  code: string;
  status: SchoolStatus;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  website: string;
  createdAt: string;
}

export interface SchoolPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: SchoolRole;
  status: UserStatus;
  lastActive: string;
}

export interface SchoolStudent {
  id: string;
  name: string;
  className: string;
  guardian: string;
  guardianPhone: string;
  status: "Active" | "Inactive" | "Pending";
  balance: string;
}

export interface SchoolModule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface SchoolSubscription {
  plan: "Trial" | "Standard" | "Professional" | "Enterprise";
  status: "Active" | "Trial" | "Past due" | "Paused";
  seats: number;
  renewalDate: string;
  monthlyFee: string;
}

export interface SchoolActivity {
  id: string;
  summary: string;
  actor: string;
  occurredAt: string;
}

export interface PlatformSchoolSnapshot {
  profile: SchoolProfile;
  ownerId: string;
  principalId: string;
  users: SchoolPerson[];
  students: SchoolStudent[];
  staff: SchoolPerson[];
  modules: SchoolModule[];
  subscription: SchoolSubscription;
  activity: SchoolActivity[];
}

/**
 * Boundary for the future platform API. The page currently receives fixture data,
 * but its UI depends only on this contract rather than school-dashboard state.
 */
export interface PlatformSchoolsRepository {
  getSchool(schoolId: string): Promise<PlatformSchoolSnapshot | null>;
  listSchoolIds(): Promise<string[]>;
}
