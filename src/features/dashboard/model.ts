export const roles = [
  "PARENT",
  "SCHOOL_HEAD",
  "TEACHER",
  "ACADEMIC_HEAD",
  "ADMIN",
  "SUPER_ADMIN",
] as const;
export type Role = (typeof roles)[number];
export type Area =
  | "finance"
  | "debts"
  | "budgets"
  | "enrollment"
  | "performance"
  | "faculty"
  | "attendance"
  | "reports"
  | "communication"
  | "gradebook"
  | "schedule"
  | "resources"
  | "children"
  | "schools"
  | "subscriptions"
  | "access"
  | "activity";
export interface Metric {
  label: string;
  value: string;
  detail: string;
  tone?: "green" | "orange" | "blue";
}
export interface RecordRow {
  id: string;
  name: string;
  group: string;
  value: string;
  status: string;
  note: string;
}
export interface Panel {
  title: string;
  description: string;
  columns: [string, string, string];
  rows: RecordRow[];
  action?: string;
}
export interface DashboardData {
  metrics: Metric[];
  panels: Partial<Record<Area, Panel>>;
  bars: { label: string; value: number; secondary: number }[];
  chartTitle: string;
  chartLegend: [string, string];
  priorities: { title: string; detail: string; area: Area }[];
}
/** Matches AuthUserResponseDto; ACADEMIC_HEAD requires a backend enum + permission migration. */
export interface DashboardUser {
  id: string;
  role: Role;
  schoolId: string | null;
  firstName: string;
  lastName: string;
  permissions: string[];
}
export interface DashboardQuery {
  user: DashboardUser;
  termId: string;
  childId?: string;
  signal?: AbortSignal;
}
export interface DashboardRepository {
  load(query: DashboardQuery): Promise<DashboardData>;
}
export const roleConfig: Record<
  Role,
  {
    label: string;
    name: string;
    subtitle: string;
    areas: Area[];
    featured: Area[];
    chart: string;
  }
> = {
  ADMIN: {
    label: "Account Officer",
    name: "Ama",
    subtitle: "Collections, commitments, and a clear view of school finances.",
    areas: ["finance", "debts", "budgets", "enrollment"],
    featured: ["finance", "debts", "budgets", "enrollment"],
    chart: "Revenue & expenditure",
  },
  SCHOOL_HEAD: {
    label: "Principal / Administrator",
    name: "Kwame",
    subtitle: "Your school at a glance. Know what needs your attention.",
    areas: [
      "finance",
      "enrollment",
      "attendance",
      "performance",
      "reports",
      "communication",
    ],
    featured: ["enrollment", "performance", "attendance", "communication"],
    chart: "School financial performance",
  },
  ACADEMIC_HEAD: {
    label: "Academic Head",
    name: "Akosua",
    subtitle: "Turn academic insight into better learning outcomes.",
    areas: ["performance", "faculty", "attendance", "reports", "enrollment"],
    featured: ["performance", "faculty", "reports", "enrollment"],
    chart: "Subject proficiency",
  },
  TEACHER: {
    label: "Teacher",
    name: "Kofi",
    subtitle: "A little less administration. More time for your classroom.",
    areas: ["attendance", "gradebook", "schedule", "resources", "performance"],
    featured: ["schedule", "performance", "gradebook", "resources"],
    chart: "My class performance",
  },
  PARENT: {
    label: "Parent",
    name: "Abena",
    subtitle: "Stay close to your child’s learning, every step of the way.",
    areas: [
      "children",
      "finance",
      "attendance",
      "reports",
      "communication",
      "schedule",
    ],
    featured: ["children", "finance", "reports", "communication"],
    chart: "Learning progress",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    name: "Caleb",
    subtitle: "A connected view of every school on Fastrack.",
    areas: ["schools", "subscriptions", "access", "activity"],
    featured: ["schools", "subscriptions", "access", "activity"],
    chart: "Platform growth",
  },
};
export const areaLabels: Record<Area, string> = {
  finance: "Fees & revenue",
  debts: "Outstanding debts",
  budgets: "Budgets & expenses",
  enrollment: "Enrollment",
  performance: "Academic performance",
  faculty: "Faculty & workload",
  attendance: "Attendance",
  reports: "Reports & results",
  communication: "Communication",
  gradebook: "Gradebook",
  schedule: "Timetable",
  resources: "Lesson resources",
  children: "My children",
  schools: "Schools",
  subscriptions: "Subscriptions",
  access: "Users & access",
  activity: "Activity log",
};
export function canAccess(role: Role, area: Area) {
  return roleConfig[role].areas.includes(area);
}
export const sampleUser = (role: Role): DashboardUser => ({
  id: `preview-${role}`,
  role,
  schoolId: role === "SUPER_ADMIN" ? null : "sample-fis",
  firstName: roleConfig[role].name,
  lastName: "Mensah",
  permissions: [],
});
