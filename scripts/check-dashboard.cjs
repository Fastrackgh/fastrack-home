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
const money = load('src/features/fees/money.ts');
const dates = load('src/features/calendar/dates.ts');

// The permissions each role receives by default from the backend
// (fastrack-backend/src/common/auth/role-permissions.matrix.ts), limited to
// the keys the dashboard checks.
const backendDefaults = {
  PRINCIPAL: [
    'student_fee_preferences:manage',
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
    'calendar:read',
    'calendar:manage',
    'school_profile:manage',
    'academic_years:manage',
    'academic_terms:manage',
    'classes:manage',
    'departments:manage',
    'grading:manage',
    'marks:read',
    'marks:enter',
    'reports:read',
    'reports:remark',
    'reports:generate',
    'reports:approve',
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
    'calendar:read',
    'calendar:manage',
    'academic_years:manage',
    'academic_terms:manage',
    'classes:manage',
    'departments:manage',
    'grading:manage',
    'marks:read',
    'marks:enter',
    'reports:read',
    'reports:remark',
    'reports:generate',
    'reports:approve',
  ],
  ACCOUNT_OFFICER: [
    'student_fee_preferences:manage',
    'students:read',
    'enrollment:read',
    'staff:read',
    'invoices:read',
    'payments:read',
    'payments:collect',
    'discounts:manage',
    'expenses:create',
    'calendar:read',
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
    'calendar:read',
    'calendar:manage',
    'reports:read',
    // 18 Oct product decision; requested from the backend's results grants on 24 Oct.
    'marks:read',
    'reports:generate',
  ],
  TEACHER: [
    'students:read',
    'attendance:read',
    'attendance:mark',
    'timetable:read',
    'calendar:read',
    'marks:read',
    'marks:enter',
    'reports:read',
    'reports:remark',
  ],
  PARENT: [
    'students:read',
    'attendance:read',
    'invoices:read',
    'payments:read',
    'timetable:read',
    'calendar:read',
    'marks:read',
  ],
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
// marks:read comes from the backend since results phase 1 (reports in the parent portal).
const parent = subject('PARENT', ['students:read', 'attendance:read', 'invoices:read', 'marks:read'], null);
const superAdmin = subject('SUPER_ADMIN', ['schools:read', 'schools:manage'], null);
const routes = (s) => Object.keys(rbac.APP_ROUTES).filter((key) => rbac.canAccessRoute(s, key));

check('each role reaches only its own pages', () => {
  assert.deepEqual(routes(teacher), ['dashboard', 'students', 'attendance', 'account']);
  assert.deepEqual(routes(accountOfficer), ['dashboard', 'students', 'fees', 'account']);
  assert.deepEqual(routes(secretary), [
    'dashboard',
    'students',
    'promotions',
    'attendance',
    'account',
    'admissions',
  ]);
  assert.deepEqual(routes(parent), [
    'parentHome',
    'parentWards',
    'parentFees',
    'parentReports',
    'parentAttendance',
    'parentMore',
  ]);
  assert.deepEqual(routes(superAdmin), ['platform']);
  assert.equal(rbac.landingPathFor('SUPER_ADMIN'), '/school-admin/platform');
  assert.equal(rbac.landingPathFor('PARENT'), '/parent');
});
check('parents live in the parent portal and staff stay out of it', () => {
  assert.equal(rbac.canAccessPath(parent, '/school-admin/dashboard'), false);
  assert.ok(rbac.canAccessPath(parent, '/parent'));
  assert.ok(rbac.canAccessPath(parent, '/parent/fees/inv-1'));
  // Receipts need the backend's payments:read, which this parent lacks.
  assert.equal(rbac.canAccessPath(parent, '/parent/receipts/pay-1'), false);
  assert.equal(rbac.canAccessPath(teacher, '/parent'), false);
  assert.equal(rbac.canAccessPath(superAdmin, '/parent/wards'), false);
  assert.equal(rbac.loginPathFor('/parent/fees'), '/parent/login');
  assert.equal(rbac.loginPathFor('/school-admin/fees'), '/school-admin/login');
  assert.equal(rbac.loginPathFor('/parentx'), '/school-admin/login');
  assert.equal(rbac.safeRedirectTarget('/parent/fees?term=1', parent), '/parent/fees?term=1');
  assert.equal(rbac.safeRedirectTarget('/parent/fees', teacher), null);
  assert.equal(rbac.safeRedirectTarget('//evil.example/parent', parent), null);
  assert.ok(rbac.can(parent, 'payments:make'));
  assert.equal(rbac.can(accountOfficer, 'payments:make'), false);
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
      ['School calendar', '/school-admin/calendar'],
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
check(
  'the live calendar opens for school staff with calendar:read; parents keep the preview',
  () => {
    for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD', 'TEACHER', 'ACCOUNT_OFFICER', 'SECRETARY'])
      assert.ok(rbac.canAccessRoute(viewer(role), 'calendar'), role);
    assert.equal(rbac.canAccessRoute(viewer('PARENT'), 'calendar'), false);
    assert.equal(rbac.canAccessRoute(viewer('SUPER_ADMIN', []), 'calendar'), false);
    const withoutRead = viewer(
      'TEACHER',
      backendDefaults.TEACHER.filter((p) => p !== 'calendar:read'),
    );
    assert.equal(rbac.canAccessRoute(withoutRead, 'calendar'), false);
    assert.equal(m.canAccess(withoutRead, 'calendar'), false);
    const family = nav.workspaceNavigation(viewer('PARENT')).map((i) => i.href);
    assert.ok(family.includes('/school-admin/dashboard/calendar'));
  },
);
check('school setup is for the Principal and Academic Head only, never parents or the platform', () => {
  for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD']) {
    assert.ok(rbac.canAccessRoute(viewer(role), 'setup'), role);
    const items = nav.workspaceNavigation(viewer(role)).map((i) => i.href);
    assert.ok(items.includes('/school-admin/setup'), role);
  }
  for (const role of ['TEACHER', 'ACCOUNT_OFFICER', 'SECRETARY', 'PARENT']) {
    assert.equal(rbac.canAccessRoute(viewer(role), 'setup'), false, role);
    const items = nav.workspaceNavigation(viewer(role)).map((i) => i.href);
    assert.equal(items.includes('/school-admin/setup'), false, role);
  }
  assert.equal(rbac.canAccessRoute(viewer('SUPER_ADMIN', []), 'setup'), false);
  const withoutManage = viewer(
    'ACADEMIC_HEAD',
    backendDefaults.ACADEMIC_HEAD.filter((p) => p !== 'classes:manage'),
  );
  assert.equal(rbac.canAccessRoute(withoutManage, 'setup'), false);
  assert.equal(m.canAccess(withoutManage, 'setup'), false);
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
  assert.ok(hrefs.includes('/school-admin/calendar')); // no module: always on
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
check('fee amounts are whole pesewas, so sums do not drift', () => {
  assert.equal(money.toPesewas(0.1) + money.toPesewas(0.2), money.toPesewas(0.3));
  assert.equal(money.toPesewas('1400.00'), 140000);
  assert.equal(money.toPesewas(null), 0);
  assert.equal(money.toCedis(money.toPesewas(19.99)), 19.99);
  assert.equal(money.sumPesewas([1.1, 2.2, 3.3], money.toPesewas), 660);
  assert.equal(money.formatGhs(-30000), 'GHS -300.00');
  assert.equal(money.formatGhs(123456), 'GHS 1,234.56');
});
check('calendar months run Monday to Sunday and cross year ends', () => {
  // February 2027 starts on a Monday and fills exactly four weeks.
  const february = dates.monthWeeks('2027-02-01');
  assert.equal(february.length, 4);
  assert.deepEqual([february[0][0], february[3][6]], ['2027-02-01', '2027-02-28']);
  // September 2026 starts on a Tuesday, so its grid opens on Monday 31 August.
  assert.equal(dates.monthWeeks('2026-09-01')[0][0], '2026-08-31');
  assert.deepEqual(dates.monthsBetween('2026-11-20', '2027-01-08'), [
    '2026-11-01',
    '2026-12-01',
    '2027-01-01',
  ]);
  assert.equal(dates.isWeekend('2027-02-06'), true);
  assert.equal(dates.isWeekend('2027-02-08'), false);
});
check('only fee staff review parents\' optional-service requests', () => {
  const path = '/school-admin/fees/requests';
  // Its own rule guards it, not the wider Fees & Billing rule.
  assert.equal(rbac.findRoute(path).path, path);
  for (const role of ['PRINCIPAL', 'ACCOUNT_OFFICER'])
    assert.ok(rbac.canAccessPath({ ...viewer(role), modules: ['fees'] }, path), role);
  for (const role of ['TEACHER', 'SECRETARY', 'PARENT'])
    assert.equal(rbac.canAccessPath({ ...viewer(role), modules: ['fees'] }, path), false, role);
});
check('only enrolment managers move whole classes up', () => {
  const path = '/school-admin/students/promote';
  // Its own rule guards it, not the wider Students rule that teachers pass.
  assert.equal(rbac.findRoute(path).path, path);
  for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD', 'SECRETARY'])
    assert.ok(rbac.canAccessPath({ ...viewer(role), modules: ['students'] }, path), role);
  for (const role of ['TEACHER', 'ACCOUNT_OFFICER', 'PARENT'])
    assert.equal(rbac.canAccessPath({ ...viewer(role), modules: ['students'] }, path), false, role);
  assert.equal(rbac.canAccessPath({ ...viewer('PRINCIPAL'), modules: [] }, path), false);
});
check('results engine gives the worked answers in docs/api/results-fixtures.json', () => {
  const engine = load('src/features/results/engine.ts');
  const fx = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'docs/api/results-fixtures.json'), 'utf8'),
  );
  const settings = (c) => ({ ...fx.defaults.settings, ...c.settings });
  for (const c of fx.round) assert.equal(engine.roundHalfUp(c.x, c.decimals), c.expected, c.name);
  for (const c of fx.grade)
    assert.equal(engine.gradeFor(c.total, c.bands ?? fx.defaults.bands)?.label, c.expected, c.name);
  for (const c of fx.subject) {
    const r = engine.subjectResult(
      c.components ?? fx.defaults.components,
      c.marks,
      c.bands ?? fx.defaults.bands,
      settings(c),
    );
    const scores = Object.fromEntries(r.componentScores.map((s) => [s.key, s.score]));
    assert.deepEqual(
      {
        status: r.status,
        componentScores: scores,
        total: r.total,
        grade: r.grade,
        reweighted: r.reweighted,
      },
      c.expected,
      c.name,
    );
  }
  for (const c of fx.summary)
    assert.deepEqual(engine.pupilSummary(c.subjects, settings(c)), c.expected, c.name);
  for (const c of fx.ranks)
    assert.deepEqual(engine.competitionRanks(c.values, c.lowerIsBetter), c.expected, c.name);
  for (const c of fx.positions)
    assert.deepEqual(
      engine.classPositions(c.pupils, c.subjectsAssessed, settings(c), c.classHasAggregate),
      c.expected,
      c.name,
    );
});
check('grading setup is for heads with the results module; its maths matches the engine', () => {
  const path = '/school-admin/results/setup';
  assert.equal(rbac.findRoute(path).path, path);
  for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD'])
    assert.ok(rbac.canAccessPath({ ...viewer(role), modules: ['results'] }, path), role);
  for (const role of ['TEACHER', 'SECRETARY', 'ACCOUNT_OFFICER', 'PARENT'])
    assert.equal(rbac.canAccessPath({ ...viewer(role), modules: ['results'] }, path), false, role);
  assert.equal(rbac.canAccessPath({ ...viewer('PRINCIPAL'), modules: [] }, path), false);

  const sm = load('src/features/results/setup-model.ts');
  const parts = (weights) =>
    weights.map((weight, i) => ({ key: `c${i}`, label: `C${i}`, shortLabel: '', weight, defaultMaxRaw: 10, entry: 'single', bestOf: null, group: 'exam' }));
  assert.deepEqual(sm.evenSplit(parts([0, 0, 0])).map((c) => c.weight), [33.33, 33.33, 33.34]);
  assert.equal(sm.weightTotal(sm.evenSplit(parts([0, 0, 0]))), 100);
  assert.equal(sm.weightsProblem({ components: parts([30, 65]), bands: [] }, 'numeric'), 'The weights add up to 95, not 100.');
  const band = (label, minScore) => ({ label, remark: '', minScore, points: null, isPass: true, description: null });
  const bands = [band('A', 80), band('B', 70), band('F', 0)];
  assert.equal(sm.bandsProblem({ components: [], bands }, 'numeric'), null);
  assert.equal(sm.bandsProblem({ components: [], bands: [band('A', 80), band('B', 85), band('F', 0)] }, 'numeric'), 'B must start below A (80).');
  assert.equal(sm.bandsProblem({ components: [], bands: [band('A', 80), band('F', 5)] }, 'numeric'), 'The lowest grade, F, must start at 0.');
  const preset = { scheme: { name: 'GES 30/70', mode: 'numeric', components: parts([30, 70]) }, scale: { name: 'GES A–F', mode: 'numeric', bands } };
  assert.equal(sm.overridesFor(preset, sm.editFrom(preset)), undefined);
  const edit = sm.editFrom(preset);
  edit.components[0].weight = 40;
  edit.components[1].weight = 60;
  edit.bands[0].minScore = 85;
  assert.deepEqual(sm.overridesFor(preset, edit), {
    components: { c0: { weight: 40 }, c1: { weight: 60 } },
    bands: [{ index: 0, minScore: 85 }],
    schemeName: 'C0 40 / C1 60',
    scaleName: 'GES A–F (edited)',
  });
  // A renamed part alone keeps the preset's names.
  const renamed = sm.editFrom(preset);
  renamed.components[0].label = 'Classwork';
  assert.deepEqual(sm.overridesFor(preset, renamed), { components: { c0: { label: 'Classwork' } } });
  // Running setup again starts from what is stored (QA-257): each distinct
  // stored setup is its own copy, even on the same preset as the school.
  const stored = sm.editFrom(preset);
  stored.components[0].weight = 40;
  stored.components[1].weight = 60;
  const current = {
    rows: [
      { scope: 'school', schemeFamilyId: 's0', scaleFamilyId: 'g1' },
      { scope: 'department', departmentId: 'lp', schemeFamilyId: 's1', scaleFamilyId: 'g1' },
      { scope: 'department', departmentId: 'up', schemeFamilyId: 's1', scaleFamilyId: 'g1' },
      { scope: 'class', classId: 'p4', schemeFamilyId: null, scaleFamilyId: 'g1' },
    ],
    schemes: [
      { familyId: 's0', presetKey: 'ges', name: 'GES 30/70', components: sm.editFrom(preset).components },
      { familyId: 's1', presetKey: 'ges', name: 'Class score 40 / Exam 60', components: stored.components },
    ],
    scales: [{ familyId: 'g1', presetKey: 'ges', name: 'GES A–F', bands }],
  };
  const pre = sm.prefillFrom(current, [{ ...preset, key: 'ges', name: 'GES basic' }]);
  assert.equal(pre.defaultKey, 'ges', 'an unedited school row is the plain preset');
  assert.deepEqual(pre.deptKeys, { lp: 'current-1', up: 'current-1' });
  assert.deepEqual(pre.copies.map((c) => c.label), ['GES basic: your current (Class score 40 / Exam 60, GES A–F)']);
  assert.deepEqual(pre.edits['current-1'].components.map((c) => c.weight), [40, 60]);
  assert.equal(pre.notShown, 1);
  assert.ok(sm.sameEdit(pre.edits['current-1'], stored));
  assert.equal(sm.sameEdit(stored, sm.editFrom(preset)), false);
  // 79.5 is an A at whole numbers and a B at one decimal, as in the fixtures.
  assert.deepEqual(sm.tryScore(79.5, sm.editFrom(preset), 0), { printed: 80, grade: 'A' });
  assert.deepEqual(sm.tryScore(79.5, sm.editFrom(preset), 1), { printed: 79.5, grade: 'B' });
});
check('mark sheets: teachers and heads with results; cell typing, missing marks and conflicts', () => {
  const path = '/school-admin/results/marks/sheet';
  assert.equal(rbac.findRoute(path).path, '/school-admin/results/marks');
  for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD', 'TEACHER'])
    assert.ok(rbac.canAccessPath({ ...viewer(role), modules: ['results'] }, path), role);
  for (const role of ['SECRETARY', 'ACCOUNT_OFFICER', 'PARENT'])
    assert.equal(rbac.canAccessPath({ ...viewer(role), modules: ['results'] }, path), false, role);
  assert.equal(rbac.canAccessPath({ ...viewer('TEACHER'), modules: [] }, path), false);

  const mm = load('src/features/results/marks-model.ts');
  assert.deepEqual(mm.parseCell('7.5', 10), { change: { status: 'scored', rawScore: 7.5 } });
  assert.deepEqual(mm.parseCell(' A ', 10), { change: { status: 'absent', rawScore: null } });
  assert.deepEqual(mm.parseCell('x', 10), { change: { status: 'exempt', rawScore: null } });
  assert.deepEqual(mm.parseCell('', 10), { change: { status: null } });
  assert.deepEqual(mm.parseCell('11', 10), { error: 'The most is 10.' });
  assert.ok('error' in mm.parseCell('7.555', 10));
  assert.ok('error' in mm.parseCell('-1', 10));

  const item = (componentKey, itemIndex, maxRaw = 10) => ({ id: `${componentKey}${itemIndex}`, componentKey, itemIndex, label: `T${itemIndex}`, maxRaw, takenOn: null });
  const items = [item('class', 1), item('class', 2), item('exam', 1, 70)];
  const mark = (componentKey, itemIndex, rawScore, maxRaw = 10) => ({ componentKey, itemIndex, status: 'scored', rawScore, maxRaw, descriptorBandId: null, enteredBy: null, enteredAt: null });
  const row = (marks, extra = {}) => ({ schoolStudentId: 'p1', studentCode: 'S1', fullName: 'Ama', flags: {}, marks, notRequired: [], carried: [], preview: null, ...extra });
  assert.equal(mm.missingFor(row([mark('class', 1, 8)]), items), 2);
  // Tests before the pupil joined aren't needed, and leavers never need marks.
  assert.equal(mm.missingFor(row([mark('exam', 1, 50, 70)], { notRequired: [{ componentKey: 'class', itemIndex: 1 }, { componentKey: 'class', itemIndex: 2 }] }), items), 0);
  assert.equal(mm.missingFor(row([], { flags: { leftOn: '2026-11-02' } }), items), 0);

  // The local preview matches the engine: a late joiner's missed test is exempt, so
  // class 8/10 = 0.8 x 30 = 24 and exam 56/70 = 56 give 80, an A.
  const sheet = {
    scheme: { components: [{ key: 'class', weight: 30, bestOf: null }, { key: 'exam', weight: 70, bestOf: null }] },
    scale: { bands: [{ label: 'A', minScore: 80 }, { label: 'B', minScore: 70 }, { label: 'F', minScore: 0 }] },
    items,
  };
  const late = row([mark('class', 2, 8), mark('exam', 1, 56, 70)], { notRequired: [{ componentKey: 'class', itemIndex: 1 }] });
  const p = mm.localPreview(late, sheet, load('src/features/results/api.ts').DEFAULT_SETTINGS);
  assert.deepEqual([p.status, p.total, p.grade], ['ok', 80, 'A']);

  // Changes show at once; a cleared cell removes its mark.
  const changed = mm.withChanges(row([mark('class', 1, 8)]), items, [
    { schoolStudentId: 'p1', componentKey: 'class', itemIndex: 1, status: null },
    { schoolStudentId: 'p1', componentKey: 'exam', itemIndex: 1, status: 'absent', rawScore: null },
  ]);
  assert.deepEqual(changed.marks.map((m) => [m.componentKey, m.status]), [['exam', 'absent']]);

  // A mark carried from another class keeps its own total and says so (QA, phase 2).
  assert.equal(mm.showMark(mark('class', 1, 40, 50), 20), '40/50');
  assert.equal(mm.showMark(mark('class', 1, 8, 10), 10), '8');
  // ApiError.details holds the whole error body; the backend's own details sit one level in.
  const client = load('src/lib/api-client.ts');
  const refused = new client.ApiError(422, 'Above the maximum of 20.', {
    success: false,
    message: 'Above the maximum of 20.',
    details: { cells: [{ schoolStudentId: 'p1', componentKey: 'class', itemIndex: 1, message: 'Above the maximum of 20.' }] },
  });
  assert.equal(client.errorDetails(refused).cells[0].message, 'Above the maximum of 20.');
  assert.equal(client.errorDetails(new Error('x')), undefined);
  // After a 409, a change is kept only if nobody else changed that cell meanwhile.
  const fresh = [row([mark('class', 1, 9), mark('class', 2, 6)])];
  const { keep, conflicts } = mm.rebase(
    [
      { change: { schoolStudentId: 'p1', componentKey: 'class', itemIndex: 1, status: 'scored', rawScore: 7 }, base: '8' },
      { change: { schoolStudentId: 'p1', componentKey: 'class', itemIndex: 2, status: 'scored', rawScore: 5 }, base: '6' },
    ],
    fresh,
    items,
  );
  assert.deepEqual(keep.map((k) => k.change.itemIndex), [2]);
  assert.deepEqual(conflicts, ['p1|class|1']);
});
check('with results on, Academic performance gives way to the live term reports', () => {
  const on = (role) => ({ ...viewer(role), modules: ['results', 'students'] });
  const off = (role) => ({ ...viewer(role), modules: ['students'] });
  // Teachers have no Reports area, so their Academic performance opens Term reports.
  assert.equal(m.areaPage(on('TEACHER'), 'performance'), 'reports');
  assert.ok(m.canAccess(on('TEACHER'), 'performance'));
  assert.equal(m.areaHref(on('TEACHER'), 'performance'), '/school-admin/results/reports');
  // Heads already have Reports, so the preview is simply hidden.
  for (const role of ['PRINCIPAL', 'ACADEMIC_HEAD']) {
    assert.equal(m.canAccess(on(role), 'performance'), false, role);
    assert.ok(m.canAccess(on(role), 'reports'), role);
  }
  // Without results, everyone keeps the labelled preview.
  for (const role of ['TEACHER', 'PRINCIPAL', 'ACADEMIC_HEAD']) {
    assert.equal(m.areaPage(off(role), 'performance'), undefined, role);
    assert.ok(m.canAccess(off(role), 'performance'), role);
  }
});
check('design columns: two or three by ratio, and switching to two keeps the middle', () => {
  const ops = load('src/features/document-templates/builder/layout-ops.ts');
  const cols = (ratio) => ({ id: 'c', type: 'columns', props: { ratio, gap: 16 }, children: { left: [], right: [] } });
  assert.deepEqual(ops.columnSides(cols('50-50')), ['left', 'right']);
  assert.deepEqual(ops.columnSides(cols('25-50-25')), ['left', 'middle', 'right']);
  const text = (id) => ({ id, type: 'text', props: {} });
  let layout = { version: 1, theme: {}, blocks: [cols('33-33-33')] };
  layout = ops.insertBlock(layout, text('a'), { parentId: 'c', side: 'left' });
  layout = ops.insertBlock(layout, text('m'), { parentId: 'c', side: 'middle' });
  layout = ops.insertBlock(layout, text('r'), { parentId: 'c', side: 'right' });
  assert.deepEqual(ops.locate(layout, 'm').slot, { parentId: 'c', side: 'middle' });
  // Duplicating gives every column's sections new ids.
  const dup = ops.duplicateBlock(layout, 'c');
  assert.notEqual(dup.blocks[1].children.middle[0].id, 'm');
  // A columns section can't go inside a column.
  const nested = ops.insertBlock(layout, cols('50-50'), { parentId: 'c', side: 'middle' });
  assert.equal(nested.blocks.length, 2);
  // Back to two columns: the middle's sections join the left column.
  const two = ops.updateProps(layout, 'c', { ratio: '60-40', gap: 16 });
  assert.deepEqual(two.blocks[0].children.left.map((b) => b.id), ['a', 'm']);
  assert.equal(two.blocks[0].children.middle, undefined);
  assert.deepEqual(ops.moveTo(two, 'r', { slot: { parentId: 'c', side: 'left' } }).blocks[0].children.left.map((b) => b.id), ['a', 'm', 'r']);
});
console.log(`${checks} dashboard and access checks passed.`);
