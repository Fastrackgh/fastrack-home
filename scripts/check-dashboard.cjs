// Run with node scripts/check-dashboard.cjs. Uses the existing TypeScript dev dependency.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
// Let plain `require` load the app's .ts modules, including the `@/` path alias.
const SRC = path.resolve(__dirname, '..', 'src');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const target = request.startsWith('@/') ? path.join(SRC, request.slice(2)) : request;
  return resolveFilename.call(this, target, ...rest);
};
require.extensions['.ts'] = (mod, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  mod._compile(compiled, filename);
};
function load(relative) {
  return require(path.resolve(__dirname, '..', relative));
}
const d = load('src/features/dashboard/phase-one/domain.ts');
const m = load('src/features/dashboard/model.ts');
const rbac = load('src/lib/rbac/index.ts');
const session = load('src/lib/auth/session.ts');
const nav = load('src/features/workspace/navigation.ts');

// The permissions each role receives by default from the backend
// (fastrack-backend/src/common/auth/role-permissions.matrix.ts), limited to
// the keys the dashboard checks.
const backendDefaults = {
  PRINCIPAL: [
    'students:read',
    'students:create',
    'students:update',
    'students:exit',
    'enrollment:read',
    'enrollment:manage',
    'staff:read',
    'staff:manage',
    'attendance:read',
    'attendance:mark',
    'invoices:read',
    'payments:read',
    'payments:collect',
    'discounts:manage',
    'expenses:create',
    'timetable:read',
    'timetable:manage',
  ],
  ACADEMIC_HEAD: [
    'students:read',
    'students:create',
    'students:update',
    'students:exit',
    'enrollment:read',
    'enrollment:manage',
    'staff:read',
    'staff:manage',
    'attendance:read',
    'attendance:mark',
    'timetable:read',
    'timetable:manage',
  ],
  ACCOUNT_OFFICER: [
    'students:read',
    'enrollment:read',
    'staff:read',
    'invoices:read',
    'payments:read',
    'payments:collect',
    'discounts:manage',
    'expenses:create',
  ],
  SECRETARY: [
    'students:read',
    'students:create',
    'students:update',
    'enrollment:read',
    'enrollment:manage',
    'staff:read',
    'attendance:read',
    'attendance:mark',
  ],
  TEACHER: ['students:read', 'attendance:read', 'attendance:mark', 'timetable:read'],
  PARENT: ['students:read', 'attendance:read', 'invoices:read', 'payments:read', 'timetable:read'],
};
const viewer = (role, permissions = backendDefaults[role]) => ({
  role,
  permissions,
  schoolId: role === 'PARENT' ? null : 'school-a',
});
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log(`PASS ${name}`);
}
check('tuition discount excludes other fee components and arrears', () => {
  const s = d.initialPhaseState('school', 'abena');
  const b = { ...s.bills[0], discountPercent: 10, scholarshipPercent: 0 };
  const total = d.billTotals(b, s.payments);
  assert.equal(total.totalFees, 130000);
  assert.equal(total.discount, 10000);
  assert.equal(total.accumulated, 150000);
  assert.equal(total.payable, 140000);
  assert.equal(total.paid, 60000);
  assert.equal(total.balance, 80000);
});
check('scholarship applies to all current fees, excluding arrears', () => {
  const s = d.initialPhaseState('school', 'abena');
  assert.equal(
    d.billTotals({ ...s.bills[0], discountPercent: 0, scholarshipPercent: 20 }, []).discount,
    26000,
  );
});
check('other income and other-term payments never reduce tuition balance', () => {
  const s = d.initialPhaseState('school', 'abena');
  const b = s.bills[0];
  const baseline = d.billTotals(b, s.payments).balance;
  assert.equal(
    d.billTotals(b, [
      ...s.payments,
      { ...s.payments[0], termId: '2025-3', amount: 900000 },
      { ...s.payments[0], kind: 'Other income', amount: 900000 },
    ]).balance,
    baseline,
  );
});
check('fee and other-income receipt numbering are independent and zero padded', () => {
  const s = d.initialPhaseState('school', 'abena');
  assert.equal(d.nextReceipt([], 'School fees'), 'FEE-001');
  assert.equal(d.nextReceipt(s.payments, 'School fees'), 'FEE-003');
  assert.equal(d.nextReceipt(s.payments, 'Other income'), 'INC-002');
});
check('school-day calculation excludes weekends and de-duplicates active closures', () => {
  const event = {
    id: 'x',
    termId: '2026-1',
    type: 'Holiday/Closure',
    date: '2026-09-21',
    endDate: '2026-09-23',
    scope: 'Whole School',
    status: 'Active',
  };
  const result = d.schoolDays(
    '2026-09-21',
    '2026-09-27',
    [
      event,
      { ...event, id: 'y', date: '2026-09-22', endDate: '2026-09-24' },
      {
        ...event,
        id: 'z',
        date: '2026-09-25',
        endDate: '2026-09-25',
        status: 'Cancelled',
      },
    ],
    '2026-1',
  );
  assert.deepEqual(result, { weekdays: 5, excluded: 4, total: 1 });
  assert.equal(
    d.schoolDays(
      '2026-09-21',
      '2026-09-27',
      [{ ...event, scope: 'Primary 4' }],
      '2026-1',
      'Primary 2',
    ).total,
    5,
  );
  assert.equal(
    d.schoolDays('2026-09-21', '2026-09-27', [{ ...event, status: 'Postponed' }], '2026-1').total,
    5,
  );
});
check('full payment cancels plan reminders; other income does not', () => {
  const s = d.initialPhaseState('school', 'abena');
  const p = s.plans[0];
  assert.match(d.planStatus(p, s), /^Active/);
  s.payments.push({
    ...s.payments[0],
    id: 'INC-002',
    kind: 'Other income',
    amount: 90000,
  });
  assert.match(d.planStatus(p, s), /^Active/);
  s.payments.push({ ...s.payments[0], id: 'FEE-003', amount: 90000 });
  assert.match(d.planStatus(p, s), /^Settled/);
  assert.equal(d.planStatus({ ...p, status: 'Cancelled' }, s), 'Cancelled');
});
check('room, class and teacher conflicts include date-specific exams', () => {
  const s = d.initialPhaseState('school', 'abena');
  const slot = s.slots[0];
  assert.equal(d.hasConflict({ ...slot, id: 'new', start: '08:30', end: '09:30' }, s.slots), true);
  assert.equal(d.hasConflict({ ...slot, id: 'new', start: '09:00', end: '10:00' }, s.slots), false);
  assert.equal(
    d.hasConflict({ ...slot, id: 'exam', kind: 'Examination', day: '2026-09-21' }, s.slots),
    true,
  );
  assert.equal(d.hasConflict({ ...slot, id: 'exam', day: '2026-09-22' }, s.slots), false);
});
check('assessment weights feed report grade and GPA', () => {
  const s = d.initialPhaseState('school', 'abena');
  const r = d.resultFor({ ...s.assessments[0], ca: 100, exam: 50 }, s);
  assert.equal(r.total, 70);
  assert.equal(r.grade, 'B');
  assert.equal(r.points, 3);
});
check('parents see only selected linked-child archive and teachers only assigned class', () => {
  const p = d.initialPhaseState('own_children', 'kwesi');
  assert.deepEqual(
    p.students.map((s) => s.id),
    ['kwesi'],
  );
  assert.ok(p.documents.every((x) => x.studentId === 'kwesi'));
  assert.equal(p.questions.length, 0);
  const t = d.initialPhaseState('assigned_classes', 'abena');
  assert.ok(t.students.every((s) => s.classId === 'Primary 2'));
  assert.ok(t.documents.every((x) => x.classId === 'Primary 2'));
});
check(
  'six PDF roles have required menus; finance stays hidden from Secretary and academics',
  () => {
    for (const role of [
      'PARENT',
      'PRINCIPAL',
      'TEACHER',
      'ACADEMIC_HEAD',
      'ACCOUNT_OFFICER',
      'SECRETARY',
    ]) {
      assert.ok(m.canAccess(viewer(role), 'calendar'));
      assert.ok(m.canAccess(viewer(role), 'archive'));
    }
    assert.ok(m.canAccess(viewer('SECRETARY'), 'enquiries'));
    assert.ok(m.canAccess(viewer('ACADEMIC_HEAD'), 'grading'));
    assert.ok(m.canAccess(viewer('ACCOUNT_OFFICER'), 'plans'));
    assert.equal(m.canAccess(viewer('PARENT'), 'questions'), false);
    for (const role of ['SECRETARY', 'TEACHER', 'ACADEMIC_HEAD'])
      assert.equal(m.canAccess(viewer(role), 'finance'), false);
  },
);

// Access control: route rules per role, tenant safety, and session parsing.
const subject = (role, permissions, schoolId = 'school-a') => ({ role, permissions, schoolId });
const teacher = subject('TEACHER', ['students:read', 'attendance:read', 'attendance:mark']);
const accountOfficer = subject('ACCOUNT_OFFICER', [
  'students:read',
  'invoices:read',
  'payments:collect',
]);
const secretary = subject('SECRETARY', ['students:read', 'attendance:read', 'enrollment:manage']);
const parent = subject('PARENT', ['students:read', 'attendance:read', 'invoices:read'], null);
const superAdmin = subject('SUPER_ADMIN', ['schools:read', 'schools:manage'], null);
const routes = (s) => Object.keys(rbac.APP_ROUTES).filter((key) => rbac.canAccessRoute(s, key));

check('each role reaches only its own pages', () => {
  assert.deepEqual(routes(teacher), ['dashboard', 'students', 'attendance']);
  assert.deepEqual(routes(accountOfficer), ['dashboard', 'students', 'fees']);
  assert.deepEqual(routes(secretary), ['dashboard', 'students', 'attendance', 'admissions']);
  assert.deepEqual(routes(parent), ['dashboard']);
  assert.deepEqual(routes(superAdmin), ['platform']);
  assert.equal(rbac.landingPathFor('SUPER_ADMIN'), '/school-admin/platform');
  assert.equal(rbac.landingPathFor('PARENT'), '/school-admin/dashboard');
});
check('staff without a school, signed-out visitors and unregistered pages are denied', () => {
  const noTenant = { ...accountOfficer, schoolId: null };
  assert.deepEqual(routes(noTenant), []);
  assert.equal(rbac.canAccessPath(null, '/school-admin/dashboard'), false);
  assert.equal(rbac.canAccessPath(superAdmin, '/school-admin/unregistered'), false);
  assert.ok(rbac.canAccessPath(superAdmin, '/school-admin/platform/schools/abc'));
  assert.equal(rbac.canAccessPath(teacher, '/school-admin/platform/schools/abc'), false);
});
check("post-login redirects stay in-app and inside the user's access", () => {
  assert.equal(rbac.safeRedirectTarget('https://evil.example', teacher), null);
  assert.equal(rbac.safeRedirectTarget('//evil.example/school-admin/', teacher), null);
  assert.equal(rbac.safeRedirectTarget('/school-admin/fees', teacher), null);
  assert.equal(
    rbac.safeRedirectTarget('/school-admin/students?page=2', teacher),
    '/school-admin/students?page=2',
  );
});
check('sessions reject unknown roles and drop unknown permission keys', () => {
  assert.equal(session.parseAuthUser({ id: 'u1', role: 'ADMIN' }), null);
  assert.equal(session.parseAuthUser({ id: 'u1', role: 'SCHOOL_HEAD' }), null);
  const user = session.parseAuthUser({
    id: 'u1',
    role: 'PRINCIPAL',
    schoolId: 'school-a',
    permissions: ['students:read', 'everything:allow'],
  });
  assert.deepEqual(user.permissions, ['students:read']);
  assert.equal(user.schoolId, 'school-a');
});
check("dashboard areas need the permission as well as a place in the role's layout", () => {
  const officer = viewer('ACCOUNT_OFFICER');
  assert.ok(m.canAccess(officer, 'finance'));
  const withoutInvoices = viewer(
    'ACCOUNT_OFFICER',
    officer.permissions.filter((p) => p !== 'invoices:read'),
  );
  assert.equal(m.canAccess(withoutInvoices, 'finance'), false);
  assert.equal(m.accessibleAreas(withoutInvoices).includes('debts'), false);
  // Academic Head has no finance access at all.
  const head = viewer('ACADEMIC_HEAD');
  assert.equal(m.canAccess(head, 'finance'), false);
  assert.equal(rbac.can(head, 'payments:collect'), false);
  assert.equal(rbac.canAccessRoute(head, 'fees'), false);
});
check('actions follow individual permissions', () => {
  assert.ok(rbac.can(viewer('ACCOUNT_OFFICER'), 'payments:collect'));
  // Product decisions, 18 October 2026: Account Officer and Principal both set budgets;
  // Academic Head, Principal and Secretary generate terminal reports; Parents and Teachers don't export.
  assert.ok(rbac.can(viewer('ACCOUNT_OFFICER'), 'budgets:manage'));
  assert.ok(rbac.can(viewer('PRINCIPAL'), 'budgets:manage'));
  for (const role of ['ACADEMIC_HEAD', 'PRINCIPAL', 'SECRETARY'])
    assert.ok(rbac.can(viewer(role), 'reports:generate'), role);
  assert.ok(m.canAccess(viewer('SECRETARY'), 'reports'));
  assert.equal(rbac.can(viewer('SECRETARY'), 'marks:enter'), false);
  assert.equal(rbac.can(viewer('TEACHER'), 'data:export'), false);
  // Teachers upload class documents, but neither send messages nor edit the timetable.
  assert.ok(rbac.can(viewer('TEACHER'), 'documents:manage'));
  assert.equal(rbac.can(viewer('TEACHER'), 'messages:send'), false);
  assert.equal(rbac.can(viewer('TEACHER'), 'timetable:manage'), false);
  assert.ok(rbac.can(viewer('TEACHER'), 'marks:enter'));
  assert.equal(rbac.can(viewer('TEACHER'), 'reports:generate'), false);
  assert.ok(rbac.can(viewer('ACADEMIC_HEAD'), 'grading:manage'));
  assert.equal(rbac.can(viewer('PARENT'), 'data:export'), false);
  assert.equal(rbac.can(viewer('SECRETARY'), 'staff:manage'), false);
});
check('frontend feature keys never shadow backend-issued keys', () => {
  const overlap = rbac.FEATURE_PERMISSIONS.filter((p) => rbac.PERMISSIONS.includes(p));
  assert.deepEqual(overlap, []);
  for (const area of Object.keys(m.areaPermission))
    assert.ok(
      rbac.isPermission(m.areaPermission[area]) || rbac.isFeaturePermission(m.areaPermission[area]),
      area,
    );
});
check('parents and teachers hold no school-wide finance or front-office records', () => {
  const p = d.initialPhaseState('own_children', 'abena');
  assert.deepEqual(
    [p.expenses.length, p.budgets.length, p.staff.length, p.enquiries.length],
    [0, 0, 0, 0],
  );
  assert.ok(p.plans.every((x) => x.studentId === 'abena'));
  const t = d.initialPhaseState('assigned_classes', 'abena');
  assert.deepEqual(
    [
      t.bills.length,
      t.payments.length,
      t.plans.length,
      t.expenses.length,
      t.budgets.length,
      t.staff.length,
      t.enquiries.length,
    ],
    [0, 0, 0, 0, 0, 0, 0],
  );
});
check('staff open live pages for fees, students and attendance; one entry per page', () => {
  const officer = nav.workspaceNavigation(viewer('ACCOUNT_OFFICER'));
  assert.deepEqual(
    officer.map((i) => [i.label, i.href]),
    [
      ['Overview', '/school-admin/dashboard'],
      ['Fees & Billing', '/school-admin/fees'],
      ['Budgets & expenses', '/school-admin/dashboard/budgets'],
      ['Students', '/school-admin/students'],
      ['Payment plans', '/school-admin/dashboard/plans'],
      ['School calendar', '/school-admin/dashboard/calendar'],
      ['Documents & archive', '/school-admin/dashboard/archive'],
    ],
  );
  const principal = nav.workspaceNavigation(viewer('PRINCIPAL')).map((i) => i.href);
  for (const page of ['/school-admin/fees', '/school-admin/students', '/school-admin/attendance'])
    assert.ok(principal.includes(page), page);
  for (const role of Object.keys(backendDefaults).filter((r) => r !== 'PARENT'))
    for (const area of ['finance', 'debts', 'enrollment', 'attendance'])
      assert.equal(m.previewAreas(viewer(role)).includes(area), false, `${role} ${area}`);
});
check("parents keep the preview for their own children's fees and attendance", () => {
  const family = nav.workspaceNavigation(viewer('PARENT')).map((i) => i.href);
  assert.ok(family.includes('/school-admin/dashboard/finance'));
  assert.ok(family.includes('/school-admin/dashboard/attendance'));
  assert.equal(
    family.some((href) => !href.startsWith('/school-admin/dashboard')),
    false,
  );
});
check('a page-backed area disappears when its page is not permitted', () => {
  const officer = viewer(
    'ACCOUNT_OFFICER',
    backendDefaults.ACCOUNT_OFFICER.filter((p) => p !== 'students:read'),
  );
  const hrefs = nav.workspaceNavigation(officer).map((i) => i.href);
  assert.equal(hrefs.includes('/school-admin/students'), false);
  assert.equal(hrefs.includes('/school-admin/dashboard/enrollment'), false);
});
check('the sidebar highlights the page the path belongs to', () => {
  const items = nav.workspaceNavigation(viewer('ACCOUNT_OFFICER'));
  const active = (path) => nav.activeNavItem(items, path)?.id;
  assert.equal(active('/school-admin/dashboard'), 'overview');
  assert.equal(active('/school-admin/dashboard/budgets'), 'budgets');
  assert.equal(active('/school-admin/fees'), 'finance');
  assert.equal(active('/school-admin/platform'), undefined);
  assert.equal(m.isArea('budgets'), true);
  assert.equal(m.isArea('toString'), false);
});
check("a school's disabled modules hide their pages and areas", () => {
  const principal = { ...viewer('PRINCIPAL'), modules: ['students', 'fees', 'timetable'] };
  assert.equal(rbac.canAccessRoute(principal, 'attendance'), false);
  assert.equal(rbac.canAccessPath(principal, '/school-admin/attendance'), false);
  assert.ok(rbac.canAccessRoute(principal, 'fees'));
  assert.equal(m.canAccess(principal, 'budgets'), false); // expenses module off
  const hrefs = nav.workspaceNavigation(principal).map((i) => i.href);
  assert.equal(hrefs.includes('/school-admin/attendance'), false);
  assert.equal(hrefs.includes('/school-admin/dashboard/budgets'), false);
  assert.ok(hrefs.includes('/school-admin/dashboard/calendar')); // no module: always on
  // Unknown modules (not loaded, or a parent) defer to the backend.
  assert.ok(rbac.canAccessRoute(viewer('PRINCIPAL'), 'attendance'));
  assert.deepEqual(
    session.parseEnabledModules([
      { moduleKey: 'fees', isEnabled: true },
      { moduleKey: 'attendance', isEnabled: false },
      { moduleKey: 'unknown', isEnabled: true },
    ]),
    ['fees'],
  );
  // The endpoint is paginated: `data` is the array itself, never `{ items }`.
  assert.deepEqual(
    session.parseEnabledModules({ items: [{ moduleKey: 'fees', isEnabled: true }] }),
    [],
  );
});
check('a closed term allows reading and exporting, never changing', () => {
  assert.equal(d.isClosedTerm('2025-3'), true);
  assert.equal(d.isClosedTerm('2026-1'), false);
  const principal = viewer('PRINCIPAL');
  const archived = { ...principal, readOnly: true };
  assert.ok(rbac.can(principal, 'budgets:manage'));
  assert.equal(rbac.can(archived, 'budgets:manage'), false);
  assert.equal(rbac.can(archived, 'payments:collect'), false);
  assert.ok(rbac.can(archived, 'students:read'));
  assert.ok(rbac.can(archived, 'data:export'));
  // Which areas open is unchanged by the period.
  const head = { ...viewer('ACADEMIC_HEAD'), readOnly: true };
  assert.ok(m.canAccess(head, 'grading'));
  assert.ok(rbac.canAccessRoute({ ...viewer('SECRETARY'), readOnly: true }, 'admissions'));
});
check('product answers of 19 October 2026 shape navigation and actions', () => {
  const hrefs = (role) => nav.workspaceNavigation(viewer(role)).map((i) => i.href);
  // Staff opens the live Staff page for everyone who manages or reads staff.
  for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD', 'SECRETARY'])
    assert.ok(hrefs(role).includes('/school-admin/staff'), role);
  assert.equal(hrefs('TEACHER').includes('/school-admin/staff'), false);
  assert.ok(hrefs('SECRETARY').includes('/school-admin/dashboard/admissions'));
  assert.ok(hrefs('PRINCIPAL').includes('/school-admin/dashboard/faculty'));
  assert.ok(rbac.can(viewer('PRINCIPAL'), 'marks:enter'));
  assert.ok(rbac.can(viewer('PRINCIPAL'), 'question_bank:manage'));
  for (const role of ['ACCOUNT_OFFICER', 'PRINCIPAL', 'SECRETARY', 'ACADEMIC_HEAD', 'TEACHER'])
    assert.equal(m.previewAreas(viewer(role)).includes('staffing'), false, role);
});
console.log(`${checks} dashboard and access checks passed.`);
