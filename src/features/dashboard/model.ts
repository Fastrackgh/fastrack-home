import {
  APP_ROUTES,
  audienceOf,
  can,
  canAccessRoute,
  hasModule,
  type AccessPermission,
  type AccessSubject,
  type AppRouteKey,
  type ModuleKey,
  type SchoolRole,
} from '@/lib/rbac';

/** The signed-in school user a workspace renders for. */
export type Viewer = AccessSubject & { role: SchoolRole };
export type Area =
  | 'finance'
  | 'debts'
  | 'budgets'
  | 'enrollment'
  | 'performance'
  | 'faculty'
  | 'attendance'
  | 'reports'
  | 'communication'
  | 'gradebook'
  | 'schedule'
  | 'children'
  | 'meals'
  | 'gallery'
  | 'calendar'
  | 'archive'
  | 'questions'
  | 'enquiries'
  | 'staffing'
  | 'plans'
  | 'admissions'
  | 'grading'
  | 'templates'
  | 'setup';
export interface Metric {
  label: string;
  value: string;
  detail: string;
  tone?: 'green' | 'orange' | 'blue';
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
export interface DashboardQuery {
  viewer: Viewer;
  termId: string;
  childId?: string;
  signal?: AbortSignal;
}
export interface DashboardRepository {
  load(query: DashboardQuery): Promise<DashboardData>;
}
/**
 * Each role's workspace layout: which areas it composes and how they are
 * presented. Access to every area is still checked against the viewer's
 * permissions (`canAccess`), so a layout never grants anything by itself.
 */
export const roleConfig: Record<
  SchoolRole,
  {
    label: string;
    subtitle: string;
    areas: Area[];
    featured: Area[];
    /** Areas this role works in through the full phase-one workspace rather than a summary panel. */
    fullWorkspaces: Area[];
    chart: string;
  }
> = {
  ACCOUNT_OFFICER: {
    label: 'Account Officer',
    subtitle: 'Collections, commitments, and a clear view of school finances.',
    areas: ['finance', 'debts', 'budgets', 'enrollment', 'plans', 'calendar', 'archive'],
    featured: ['finance', 'debts', 'budgets', 'enrollment'],
    fullWorkspaces: [],
    chart: 'Revenue & expenditure',
  },
  PRINCIPAL: {
    label: 'Principal',
    subtitle: 'Your school at a glance. Know what needs your attention.',
    areas: [
      'finance',
      'enrollment',
      'attendance',
      'faculty',
      'performance',
      'reports',
      'communication',
      'budgets',
      'plans',
      'admissions',
      'enquiries',
      'staffing',
      'meals',
      'gallery',
      'calendar',
      'archive',
      'questions',
      'templates',
      'grading',
      'setup',
    ],
    featured: ['enrollment', 'performance', 'attendance', 'communication'],
    fullWorkspaces: ['reports'],
    chart: 'School financial performance',
  },
  ACADEMIC_HEAD: {
    label: 'Academic Head',
    subtitle: 'Turn academic insight into better learning outcomes.',
    areas: [
      'performance',
      'faculty',
      'staffing',
      'attendance',
      'reports',
      'enrollment',
      'gallery',
      'calendar',
      'archive',
      'questions',
      'communication',
      'schedule',
      'grading',
      'setup',
    ],
    featured: ['performance', 'faculty', 'reports', 'enrollment'],
    fullWorkspaces: ['reports', 'schedule'],
    chart: 'Subject proficiency',
  },
  TEACHER: {
    label: 'Teacher',
    subtitle: 'A little less administration. More time for your classroom.',
    areas: [
      'attendance',
      'gradebook',
      'schedule',
      'performance',
      'meals',
      'gallery',
      'calendar',
      'archive',
      'questions',
    ],
    featured: ['schedule', 'performance', 'gradebook', 'questions'],
    fullWorkspaces: ['gradebook'],
    chart: 'My class performance',
  },
  PARENT: {
    label: 'Parent',
    subtitle: 'Stay close to your child’s learning, every step of the way.',
    areas: [
      'children',
      'finance',
      'attendance',
      'reports',
      'communication',
      'schedule',
      'meals',
      'gallery',
      'calendar',
      'archive',
    ],
    featured: ['children', 'finance', 'reports', 'communication'],
    fullWorkspaces: [],
    chart: 'Learning progress',
  },
  SECRETARY: {
    label: 'Administrative Secretary',
    subtitle: 'Admissions, people, and the everyday life of your school.',
    areas: [
      'enrollment',
      'enquiries',
      'admissions',
      'staffing',
      'reports',
      'meals',
      'gallery',
      'calendar',
      'archive',
    ],
    featured: ['enrollment', 'enquiries', 'calendar', 'staffing'],
    fullWorkspaces: ['reports'],
    chart: 'Enrollment trends',
  },
};
export const areaLabels: Record<Area, string> = {
  finance: 'Fees & revenue',
  debts: 'Outstanding debts',
  budgets: 'Budgets & expenses',
  enrollment: 'Enrollment',
  performance: 'Academic performance',
  faculty: 'Faculty & workload',
  attendance: 'Attendance',
  reports: 'Reports & results',
  communication: 'Communication',
  gradebook: 'Gradebook',
  schedule: 'Timetable',
  children: 'My children',
  meals: 'Weekly meal menu',
  gallery: 'Photo gallery',
  calendar: 'School calendar',
  archive: 'Documents & archive',
  questions: 'Question bank',
  enquiries: 'Enquiries',
  staffing: 'Staff',
  plans: 'Payment plans',
  admissions: 'Online admissions',
  grading: 'Grading configuration',
  templates: 'Bill & report designs',
  setup: 'School setup',
};
/** The permission needed to open each area, on top of it being in the viewer's layout. */
export const areaPermission: Record<Area, AccessPermission> = {
  finance: 'invoices:read',
  debts: 'invoices:read',
  budgets: 'budgets:read',
  plans: 'payment_plans:read',
  enrollment: 'enrollment:read',
  admissions: 'enrollment:manage',
  enquiries: 'enquiries:read',
  staffing: 'staff:read',
  faculty: 'staff:read',
  children: 'students:read',
  attendance: 'attendance:read',
  performance: 'marks:read',
  reports: 'marks:read',
  gradebook: 'marks:enter',
  grading: 'grading:manage',
  templates: 'document_templates:read',
  setup: 'classes:manage',
  schedule: 'timetable:read',
  questions: 'question_bank:read',
  communication: 'messages:read',
  meals: 'meals:read',
  gallery: 'gallery:read',
  calendar: 'calendar:read',
  archive: 'documents:read',
};

/** The school module an area belongs to; areas without one are always available. */
const areaModule: Partial<Record<Area, ModuleKey>> = {
  finance: 'fees',
  debts: 'fees',
  plans: 'fees',
  budgets: 'expenses',
  enrollment: 'students',
  enquiries: 'students',
  admissions: 'students',
  attendance: 'attendance',
  schedule: 'timetable',
};

export function isArea(value: string): value is Area {
  return Object.hasOwn(areaLabels, value);
}

/**
 * Areas staff work in through a dedicated, API-backed page instead of the
 * preview workspace. The page's own route rule decides access, and staff
 * never see the preview version. Other audiences (parents) keep the preview.
 */
const areaPages: Partial<Record<Area, AppRouteKey>> = {
  finance: 'fees',
  debts: 'fees',
  enrollment: 'students',
  attendance: 'attendance',
  staffing: 'staff',
  templates: 'templates',
  calendar: 'calendar',
  setup: 'setup',
  grading: 'resultsSetup',
};

/** The live page that serves `area` for this viewer, if any. */
export function areaPage(viewer: Viewer, area: Area): AppRouteKey | undefined {
  return audienceOf(viewer.role) === 'staff' ? areaPages[area] : undefined;
}

export function canAccess(viewer: Viewer, area: Area) {
  if (!roleConfig[viewer.role].areas.includes(area)) return false;
  const requiredModule = areaModule[area];
  if (requiredModule && !hasModule(viewer, requiredModule)) return false;
  const page = areaPage(viewer, area);
  // Opening an area depends on who the viewer is, not on a read-only term.
  return page
    ? canAccessRoute(viewer, page)
    : can({ ...viewer, readOnly: false }, areaPermission[area]);
}

/** The viewer's areas they may open, in layout order. */
export function accessibleAreas(viewer: Viewer): Area[] {
  return roleConfig[viewer.role].areas.filter((area) => canAccess(viewer, area));
}

/** Accessible areas the viewer works in inside the preview workspace. */
export function previewAreas(viewer: Viewer): Area[] {
  return accessibleAreas(viewer).filter((area) => !areaPage(viewer, area));
}

export const OVERVIEW_PATH = APP_ROUTES.dashboard.path;

/** Where `area` opens for this viewer: its live page, or its preview route. */
export function areaHref(viewer: Viewer, area: Area): string {
  const page = areaPage(viewer, area);
  return page ? APP_ROUTES[page].path : `${OVERVIEW_PATH}/${area}`;
}

/** The label `area` is shown under: a live page keeps its own name. */
export function areaLabel(viewer: Viewer, area: Area): string {
  const page = areaPage(viewer, area);
  return page ? APP_ROUTES[page].label : areaLabels[area];
}

/** School-service areas that always open the phase-one workspace. */
const phaseOnlyAreas: Area[] = [
  'meals',
  'gallery',
  'calendar',
  'archive',
  'questions',
  'enquiries',
  'plans',
  'admissions',
  'grading',
  'budgets',
];

export function isPhaseArea(area: Area | 'overview', viewer: Viewer) {
  return (
    area !== 'overview' &&
    (phaseOnlyAreas.includes(area) || roleConfig[viewer.role].fullWorkspaces.includes(area))
  );
}
