import { ApiError } from '@/lib/api-client';
import type { Page } from '@/lib/pagination';
import { addDays, isWeekend, todayIso } from '@/features/calendar/dates';
import { formatGhs, sumPesewas, type Pesewas } from '@/features/fees/money';
import type { ParentApi } from './api';
import type {
  AcademicTerm,
  AttendanceDay,
  AttendanceMark,
  OptionalFeeRequest,
  OptionalService,
  ParentInvoice,
  ParentPayment,
  TermReport,
  Ward,
  WardCalendar,
  WardProfile,
} from './types';

/*
 * Sample data for running the parent portal before its backend endpoints
 * exist (NEXT_PUBLIC_PARENT_API_MOCK=1). State lives in sessionStorage so a
 * simulated checkout survives the redirect back from the "payment provider".
 * Link a child with code LCA/2026/031 and any six-digit code.
 */

const SCHOOL = { id: 'school-lca', code: 'LCA', name: 'Lifecycle Academy' };

const CATALOGUE: Ward[] = [
  {
    studentId: '6a1f0c52-0000-4000-8000-000000000001',
    studentCode: 'LCA/2024/007',
    firstName: 'Abena',
    surname: 'Osei',
    birthDate: '2019-03-14',
    gender: 'Female',
    status: 'Active',
    relationship: 'Mother',
    school: SCHOOL,
    currentClass: { id: 'class-p2', name: 'Primary 2 - Gold', department: 'Primary' },
  },
  {
    studentId: '6a1f0c52-0000-4000-8000-000000000002',
    studentCode: 'LCA/2022/019',
    firstName: 'Kwesi',
    surname: 'Osei',
    otherName: 'Ato',
    birthDate: '2017-07-02',
    gender: 'Male',
    status: 'Active',
    relationship: 'Mother',
    school: SCHOOL,
    currentClass: { id: 'class-p4', name: 'Primary 4 - Blue', department: 'Primary' },
  },
  {
    studentId: '6a1f0c52-0000-4000-8000-000000000003',
    studentCode: 'LCA/2026/031',
    firstName: 'Esi',
    surname: 'Osei',
    birthDate: '2021-11-23',
    gender: 'Female',
    status: 'Active',
    relationship: 'Mother',
    school: SCHOOL,
    currentClass: { id: 'class-kg1', name: 'KG 1', department: 'Kindergarten' },
  },
];

const TERMS: AcademicTerm[] = [
  { id: 'term-2026-1', label: 'Term 1', yearId: 'y-2026', yearLabel: '2026/2027', isCurrent: true },
  {
    id: 'term-2025-3',
    label: 'Term 3',
    yearId: 'y-2025',
    yearLabel: '2025/2026',
    isCurrent: false,
  },
  {
    id: 'term-2025-2',
    label: 'Term 2',
    yearId: 'y-2025',
    yearLabel: '2025/2026',
    isCurrent: false,
  },
];

const FEES: { name: string; amount: Pesewas; optional?: boolean }[] = [
  { name: 'Tuition', amount: 95000 },
  { name: 'PTA dues', amount: 10000 },
  { name: 'ICT', amount: 15000 },
  { name: 'Feeding', amount: 40000, optional: true },
];

/** Optional services the sample school offers; Extra classes has no price yet. */
const SERVICES: { feeTypeId: string; name: string; description: string; amount: Pesewas | null }[] =
  [
    { feeTypeId: 'feeding', name: 'Feeding', description: 'Lunch every school day', amount: 40000 },
    {
      feeTypeId: 'bus',
      name: 'School bus',
      description: 'Morning pick-up and afternoon drop-off',
      amount: 45000,
    },
    {
      feeTypeId: 'extra-classes',
      name: 'Extra classes',
      description: 'After-school lessons, Monday to Thursday',
      amount: null,
    },
  ];

interface MockState {
  linked: string[];
  /** Pesewas paid online this session, per invoice id. */
  paid: Record<string, Pesewas>;
  payments: ParentPayment[];
  /** Optional-service requests, per ward. Staff never decide them in the sample. */
  requests?: Record<string, OptionalFeeRequest[]>;
}

const STATE_KEY = 'fastrack_parent_mock';

function readState(): MockState {
  const fallback = {
    linked: CATALOGUE.slice(0, 2).map((w) => w.studentId),
    paid: {},
    payments: [],
  };
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(sessionStorage.getItem(STATE_KEY) ?? '') as MockState;
  } catch {
    return fallback;
  }
}

function writeState(state: MockState) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

const wait = <T>(value: T, ms = 350) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const notFound = () => new ApiError(404, 'Not found');

function linkedWard(studentId: string): Ward {
  const found = readState().linked.includes(studentId)
    ? CATALOGUE.find((w) => w.studentId === studentId)
    : undefined;
  if (!found) throw notFound();
  return found;
}

/** A stable pseudo-random number in [0, 1) for a seed, so sample data doesn't shuffle. */
function noise(seed: string) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}

const invoiceId = (studentId: string, termId: string) => `inv-${studentId.slice(-2)}-${termId}`;

function buildInvoices(studentId: string): ParentInvoice[] {
  const { paid } = readState();
  const ward = linkedWard(studentId);
  return TERMS.map((term, index) => {
    const lineItems = FEES.map((fee) => ({
      id: `${term.id}-${fee.name}`,
      feeTypeId: fee.name.toLowerCase(),
      feeTypeName: fee.name,
      amount: fee.amount,
      isOptional: Boolean(fee.optional),
    }));
    const id = invoiceId(studentId, term.id);
    const totalFees = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = ward.firstName === 'Kwesi' ? 10000 : 0;
    const feePayable = totalFees - discountAmount;
    // Past terms are settled; the current term is part paid.
    const offline = index === 0 ? Math.round(feePayable * 0.4) : feePayable;
    const totalPayment = Math.min(feePayable, offline + (paid[id] ?? 0));
    const balance = feePayable - totalPayment;
    return {
      id,
      invoiceNumber: `INV-${term.id.slice(5).replace('-', '')}-${studentId.slice(-3)}`,
      studentId,
      studentCode: ward.studentCode,
      studentName: `${ward.firstName} ${ward.surname}`,
      className: ward.currentClass?.name,
      arrearsBf: 0,
      totalFees,
      discountAmount,
      feePayable,
      totalPayment,
      balance,
      status: balance <= 0 ? 'PAID' : totalPayment > 0 ? 'PARTIAL' : 'UNPAID',
      lineItems,
      termId: term.id,
      termLabel: term.label,
      yearLabel: term.yearLabel,
      dueDate: index === 0 ? addDays(todayIso(), 21) : null,
      canPayOnline: true,
    };
  });
}

function buildPayments(studentId: string): ParentPayment[] {
  const invoices = buildInvoices(studentId);
  const offline = invoices.map((invoice, index) => {
    const amountPaid = index === 0 ? Math.round(invoice.feePayable * 0.4) : invoice.feePayable;
    return {
      id: `pay-${invoice.id}`,
      receiptNumber: `RCP-${invoice.invoiceNumber.slice(4)}`,
      paymentDate: addDays(todayIso(), -30 - index * 100),
      amountPaid,
      paymentMethod: index % 2 ? 'Cash' : 'Bank Transfer',
      studentName: invoice.studentName,
      studentCode: invoice.studentCode,
      className: invoice.className,
      previousBalance: invoice.feePayable,
      newBalance: invoice.feePayable - amountPaid,
      recordedByName: 'Accounts Office',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      termLabel: `${invoice.termLabel}, ${invoice.yearLabel}`,
    };
  });
  const online = readState().payments.filter(
    (p) => p.studentCode === linkedWard(studentId).studentCode,
  );
  return [...online, ...offline];
}

const SUBJECTS = [
  'English Language',
  'Mathematics',
  'Science',
  'Social Studies',
  'Ghanaian Language (Twi)',
  'Religious & Moral Education',
  'Computing',
  'Creative Arts',
];

const gradeFor = (total: number) =>
  total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'E';
const remarkFor = (grade: string) =>
  ({ A: 'Excellent', B: 'Very good', C: 'Good', D: 'Credit', E: 'Needs improvement' })[grade];

function buildReport(studentId: string, term: AcademicTerm): TermReport {
  const ward = linkedWard(studentId);
  const subjects = SUBJECTS.map((subject) => {
    const classScore = Math.round(18 + noise(`${studentId}${term.id}${subject}c`) * 12);
    const examScore = Math.round(38 + noise(`${studentId}${term.id}${subject}e`) * 30);
    const total = classScore + examScore;
    const grade = gradeFor(total);
    return {
      subject,
      classScore,
      examScore,
      total,
      grade,
      position: 1 + Math.floor(noise(`${studentId}${subject}p`) * 20),
      remark: remarkFor(grade),
    };
  });
  const average = subjects.reduce((sum, s) => sum + (s.total ?? 0), 0) / subjects.length;
  return {
    id: `rep-${studentId.slice(-2)}-${term.id}`,
    termId: term.id,
    termLabel: term.label,
    yearLabel: term.yearLabel,
    className: ward.currentClass?.name,
    publishedAt: addDays(todayIso(), -40 - TERMS.indexOf(term) * 100),
    average: Math.round(average * 10) / 10,
    overallGrade: gradeFor(average),
    position: 1 + Math.floor(noise(`${studentId}${term.id}pos`) * 12),
    classSize: 32,
    subjects,
    attendance: { present: 58 + Math.floor(noise(`${studentId}${term.id}att`) * 6), total: 64 },
    teacherRemark: `${ward.firstName} is attentive in class and works well with others.`,
    headRemark: 'A good term. Keep it up.',
    promotedTo: term.label === 'Term 3' ? 'Next class' : null,
    nextTermBegins: addDays(todayIso(), 60),
  };
}

/** Reports are published once a term ends, so the current term has none yet. */
const reportTerms = () => TERMS.filter((term) => !term.isCurrent);

function markFor(studentId: string, date: string): AttendanceMark {
  const roll = noise(`${studentId}${date}`);
  return roll < 0.04 ? 'absent' : roll < 0.09 ? 'late' : roll < 0.11 ? 'excused' : 'present';
}

const page = <T>(items: T[], pageNumber: number, size = 20): Page<T> => ({
  items: items.slice((pageNumber - 1) * size, pageNumber * size),
  total: items.length,
});

const documentShell = (
  title: string,
  body: string,
) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  body{font-family:system-ui,sans-serif;color:#0f172a;margin:32px;font-size:14px}
  h1{font-size:20px;margin:0}.muted{color:#64748b}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
  th{background:#f8fafc;font-size:12px;text-transform:uppercase;color:#475569}
  .right{text-align:right}.head{display:flex;justify-content:space-between;border-bottom:3px solid #e01a2b;padding-bottom:12px}
  .badge{display:inline-block;background:#fff0f2;color:#e01a2b;padding:2px 8px;border-radius:6px;font-weight:600;font-size:12px}
</style></head><body>
<div class="head"><div><h1>${SCHOOL.name}</h1><div class="muted">${title}</div></div><span class="badge">Sample design</span></div>
${body}</body></html>`;

export const mockParentApi: ParentApi = {
  async listWards() {
    const { linked } = readState();
    return wait(CATALOGUE.filter((w) => linked.includes(w.studentId)));
  },
  async initiateLink({ studentCode }) {
    const known = CATALOGUE.some((w) => w.studentCode === studentCode.trim().toUpperCase());
    // Unknown codes look the same as known ones, as the backend should (QA-014).
    return wait({
      requestId: known ? `link-${studentCode.trim().toUpperCase()}` : 'link-unknown',
      maskedDestination: '+233 ••• ••• 412',
      expiresInSeconds: 300,
    });
  },
  async resendLinkOtp() {
    return wait({
      maskedDestination: '+233 ••• ••• 412',
      expiresInSeconds: 300,
      cooldownSeconds: 30,
    });
  },
  async verifyLink(requestId, otp) {
    const ward = CATALOGUE.find((w) => `link-${w.studentCode}` === requestId);
    if (!ward || !/^\d{6}$/.test(otp)) {
      await wait(null);
      throw new ApiError(400, 'That code is not valid or has expired.');
    }
    const state = readState();
    if (!state.linked.includes(ward.studentId)) state.linked.push(ward.studentId);
    writeState(state);
    return wait(ward);
  },
  async unlinkWard(studentId) {
    const state = readState();
    writeState({ ...state, linked: state.linked.filter((linked) => linked !== studentId) });
    await wait(null);
  },
  async getWard(studentId): Promise<WardProfile> {
    const ward = linkedWard(studentId);
    return wait({
      ...ward,
      admissionDate: `20${ward.studentCode?.slice(6, 8) ?? '24'}-09-08`,
      boardingStatus: ward.firstName === 'Kwesi' ? 'Boarding' : 'Day',
      guardians: [
        {
          name: 'Mercy Osei',
          relationship: 'Mother',
          phone: '+233 24 412 0412',
          email: 'mercy.osei@example.com',
        },
        { name: 'Kofi Osei', relationship: 'Father', phone: '+233 20 555 0190' },
      ],
      school: {
        ...ward.school,
        phone: '+233 30 290 1122',
        email: 'office@lifecycle.edu.gh',
        address: 'Spintex Road, Accra',
      },
    });
  },
  async listTerms(studentId) {
    linkedWard(studentId);
    return wait(TERMS);
  },
  async listInvoices(studentId, { page: pageNumber, termId }) {
    const invoices = buildInvoices(studentId).filter((inv) => !termId || inv.termId === termId);
    return wait(page(invoices, pageNumber));
  },
  async invoiceSummary(studentId, termId) {
    const invoices = buildInvoices(studentId).filter((inv) => !termId || inv.termId === termId);
    // Sample bills carry no arrears, so nothing is brought or carried forward.
    return wait({
      invoiceCount: invoices.length,
      totalBilled: sumPesewas(invoices, (inv) => inv.totalFees - inv.discountAmount),
      totalPaid: sumPesewas(invoices, (inv) => inv.totalPayment),
      outstanding: sumPesewas(invoices, (inv) => Math.max(inv.balance, 0)),
      overpaid: sumPesewas(invoices, (inv) => Math.max(-inv.balance, 0)),
      broughtForward: 0,
      carriedForward: 0,
    });
  },
  async getInvoice(studentId, id) {
    const invoice = buildInvoices(studentId).find((inv) => inv.id === id);
    if (!invoice) throw notFound();
    return wait(invoice);
  },
  async invoiceDocument(studentId, id) {
    const invoice = await this.getInvoice(studentId, id);
    const rows = (invoice.lineItems ?? [])
      .map(
        (item) =>
          `<tr><td>${item.feeTypeName}</td><td class="right">${formatGhs(item.amount)}</td></tr>`,
      )
      .join('');
    return documentShell(
      `Fee bill · ${invoice.termLabel}, ${invoice.yearLabel}`,
      `<p><strong>${invoice.studentName}</strong> · ${invoice.className} · ${invoice.studentCode}</p>
       <table><tr><th>Item</th><th class="right">Amount</th></tr>${rows}
       <tr><td>Discount</td><td class="right">-${formatGhs(invoice.discountAmount)}</td></tr>
       <tr><th>Amount payable</th><th class="right">${formatGhs(invoice.feePayable)}</th></tr>
       <tr><td>Paid</td><td class="right">${formatGhs(invoice.totalPayment)}</td></tr>
       <tr><th>Balance</th><th class="right">${formatGhs(invoice.balance)}</th></tr></table>`,
    );
  },
  async listPayments(studentId, { page: pageNumber }) {
    return wait(page(buildPayments(studentId), pageNumber));
  },
  async getPayment(studentId, paymentId) {
    const payment = buildPayments(studentId).find((p) => p.id === paymentId);
    if (!payment) throw notFound();
    return wait(payment);
  },
  async receiptDocument(studentId, paymentId) {
    const payment = await this.getPayment(studentId, paymentId);
    return documentShell(
      `Receipt ${payment.receiptNumber}`,
      `<p><strong>${payment.studentName}</strong> · ${payment.className}</p>
       <table><tr><td>Date</td><td class="right">${payment.paymentDate}</td></tr>
       <tr><td>Method</td><td class="right">${payment.paymentMethod}</td></tr>
       <tr><td>Previous balance</td><td class="right">${formatGhs(payment.previousBalance)}</td></tr>
       <tr><th>Amount paid</th><th class="right">${formatGhs(payment.amountPaid)}</th></tr>
       <tr><td>Balance after payment</td><td class="right">${formatGhs(payment.newBalance)}</td></tr></table>`,
    );
  },
  async checkout(studentId, id, { amount, channel, callbackUrl }) {
    const invoice = await this.getInvoice(studentId, id);
    if (amount <= 0 || amount > invoice.balance) {
      throw new ApiError(400, 'Amount must be more than zero and no more than the balance.');
    }
    const reference = `mock_${studentId}_${id}_${amount}_${channel}_${Date.now()}`;
    const url = new URL(callbackUrl);
    url.searchParams.set('reference', reference);
    return wait({ reference, authorizationUrl: url.toString() });
  },
  async verifyPayment(reference) {
    const [, studentId, id, amountText, channel] = reference.split('_');
    const amount = Number(amountText);
    const state = readState();
    const existing = state.payments.find((p) => p.reference === reference);
    if (existing) {
      return wait({ status: 'success' as const, studentId, invoiceId: id, payment: existing });
    }
    const invoice = buildInvoices(studentId).find((inv) => inv.id === id);
    if (!invoice || !Number.isFinite(amount)) {
      return wait({ status: 'failed' as const, message: 'We could not find that payment.' });
    }
    const payment: ParentPayment = {
      id: `pay-online-${Date.now()}`,
      receiptNumber: `RCP-ON-${String(Date.now()).slice(-6)}`,
      paymentDate: todayIso(),
      amountPaid: amount,
      paymentMethod: channel === 'card' ? 'Card' : 'MoMo',
      studentName: invoice.studentName,
      studentCode: invoice.studentCode,
      className: invoice.className,
      previousBalance: invoice.balance,
      newBalance: invoice.balance - amount,
      recordedByName: 'Online payment',
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      termLabel: `${invoice.termLabel}, ${invoice.yearLabel}`,
      reference,
    };
    writeState({
      ...state,
      paid: { ...state.paid, [id]: (state.paid[id] ?? 0) + amount },
      payments: [payment, ...state.payments],
    });
    return wait({ status: 'success' as const, studentId, invoiceId: id, payment }, 1200);
  },
  async listReports(studentId) {
    return wait(
      reportTerms().map((term) => ({ ...buildReport(studentId, term), subjects: undefined })),
    );
  },
  async getReport(studentId, reportId) {
    const term = reportTerms().find((t) => reportId.endsWith(t.id));
    if (!term) throw notFound();
    return wait(buildReport(studentId, term));
  },
  async reportDocument(studentId, reportId) {
    const report = await this.getReport(studentId, reportId);
    const ward = linkedWard(studentId);
    const rows = (report.subjects ?? [])
      .map(
        (s) =>
          `<tr><td>${s.subject}</td><td class="right">${s.classScore}</td><td class="right">${s.examScore}</td><td class="right">${s.total}</td><td>${s.grade}</td><td>${s.remark}</td></tr>`,
      )
      .join('');
    return documentShell(
      `Terminal report · ${report.termLabel}, ${report.yearLabel}`,
      `<p><strong>${ward.firstName} ${ward.surname}</strong> · ${report.className} · Position ${report.position} of ${report.classSize}</p>
       <table><tr><th>Subject</th><th class="right">Class (30)</th><th class="right">Exam (70)</th><th class="right">Total</th><th>Grade</th><th>Remark</th></tr>${rows}</table>
       <p><strong>Class teacher:</strong> ${report.teacherRemark}</p><p><strong>Head teacher:</strong> ${report.headRemark}</p>`,
    );
  },
  async listOptionalServices(studentId) {
    linkedWard(studentId);
    const requests = readState().requests?.[studentId] ?? [];
    const services: OptionalService[] = SERVICES.map((service) => ({
      ...service,
      // Every sample ward takes feeding (it is on their bills).
      enrolled: service.feeTypeId === 'feeding',
      pendingRequest:
        requests.find((r) => r.feeTypeId === service.feeTypeId && r.status === 'PENDING') ?? null,
    }));
    return wait({
      termLabel: TERMS.find((term) => term.isCurrent)?.label ?? null,
      className: linkedWard(studentId).currentClass?.name ?? null,
      canRequest: true,
      services,
    });
  },
  async listOptionalFeeRequests(studentId) {
    linkedWard(studentId);
    return wait(readState().requests?.[studentId] ?? []);
  },
  async requestOptionalService(studentId, { feeTypeId, action, note }) {
    linkedWard(studentId);
    const service = SERVICES.find((s) => s.feeTypeId === feeTypeId);
    if (!service) throw notFound();
    const state = readState();
    const requests = state.requests?.[studentId] ?? [];
    if (requests.some((r) => r.feeTypeId === feeTypeId && r.status === 'PENDING')) {
      throw new ApiError(409, 'A request for this service is already waiting for the school');
    }
    const request: OptionalFeeRequest = {
      id: `req-${Date.now()}`,
      feeTypeId,
      feeTypeName: service.name,
      action,
      status: 'PENDING',
      parentNote: note?.trim() || null,
      staffNote: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
      isMine: true,
    };
    writeState({ ...state, requests: { ...state.requests, [studentId]: [request, ...requests] } });
    return wait(request);
  },
  async cancelOptionalFeeRequest(studentId, requestId) {
    linkedWard(studentId);
    const state = readState();
    const requests = state.requests?.[studentId] ?? [];
    const request = requests.find((r) => r.id === requestId);
    if (!request) throw notFound();
    if (request.status !== 'PENDING') {
      throw new ApiError(409, 'This request has already been decided');
    }
    const cancelled = { ...request, status: 'CANCELLED' as const };
    writeState({
      ...state,
      requests: {
        ...state.requests,
        [studentId]: requests.map((r) => (r.id === requestId ? cancelled : r)),
      },
    });
    return wait(cancelled);
  },
  async attendance(studentId, { from, to }) {
    linkedWard(studentId);
    const last = to < todayIso() ? to : todayIso();
    const days: AttendanceDay[] = [];
    for (let date = from; date <= last; date = addDays(date, 1)) {
      if (!isWeekend(date)) days.push({ date, status: markFor(studentId, date) });
    }
    const count = (mark: AttendanceMark) => days.filter((day) => day.status === mark).length;
    return wait({
      days,
      summary: {
        present: count('present'),
        absent: count('absent'),
        late: count('late'),
        halfDay: count('half_day'),
        excused: count('excused'),
        schoolDays: days.length,
        unmarked: 0,
      },
    });
  },
  async calendar(studentId, termId) {
    const ward = linkedWard(studentId);
    const term = TERMS.find((t) => t.id === termId) ?? TERMS.find((t) => t.isCurrent)!;
    const today = todayIso();
    const event = (
      days: number,
      type: WardCalendar['events'][number]['type'],
      title: string,
      length = 1,
    ): WardCalendar['events'][number] => ({
      id: `event-${term.id}-${days}`,
      termId: term.id,
      termLabel: term.label,
      yearLabel: term.yearLabel,
      type,
      title,
      description: null,
      startDate: addDays(today, days),
      endDate: addDays(today, days + length - 1),
      startTime: null,
      endTime: null,
      location: null,
      audience: 'WHOLE_SCHOOL',
      classId: null,
      className: null,
      status: 'ACTIVE',
    });
    const events = [
      event(-12, 'PTA_MEETING', 'PTA general meeting'),
      event(6, 'MID_TERM_BREAK', 'Mid-term break', 3),
      event(20, 'SPORTS_DAY', `${ward.school.name} sports day`),
      event(41, 'EXAMINATION', 'End-of-term examinations', 5),
    ];
    return wait({
      events,
      schoolDays: {
        termId: term.id,
        startDate: addDays(today, -40),
        endDate: addDays(today, 50),
        weekdays: 65,
        closedDays: 3,
        schoolDays: 62,
      },
    });
  },
};
