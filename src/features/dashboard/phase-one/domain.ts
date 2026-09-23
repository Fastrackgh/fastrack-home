import type { Role } from "../model";

export type TermId = "2026-1" | "2025-3";
export const terms = {
  "2026-1": {
    year: "2026/27",
    label: "Term 1",
    start: "2026-09-01",
    end: "2026-12-18",
  },
  "2025-3": {
    year: "2025/26",
    label: "Term 3",
    start: "2026-04-20",
    end: "2026-07-24",
  },
};
export const classes = ["Nursery 1", "Primary 2", "Primary 4", "JHS 1"];
export const methods = ["Cash", "MoMo", "Bank Transfer", "Cheque"];
export interface Student {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  nationality: string;
  classId: string;
  parent: string;
  phone: string;
  email: string;
  address: string;
  previousSchool: string;
  admissionDate: string;
  termId: string;
  status: "Active" | "Stopped";
  exitDate?: string;
  exitReason?: string;
}
/** All amounts are integer pesewas; display formatting never feeds calculations. */
export interface Bill {
  id: string;
  studentId: string;
  termId: string;
  arrears: number;
  tuition: number;
  maintenance: number;
  books: number;
  abacus: number;
  discountPercent: number;
  scholarshipPercent: number;
}
export interface Payment {
  id: string;
  studentId: string;
  termId: string;
  date: string;
  amount: number;
  method: string;
  bank: string;
  kind: "School fees" | "Other income";
  account: string;
  reference: string;
}
export interface Expense {
  id: string;
  termId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string;
  payee: string;
}
export interface Plan {
  id: string;
  studentId: string;
  termId: string;
  installments: { amount: number; due: string; reminder: string }[];
  status: "Active" | "Cancelled";
}
export interface SchoolEvent {
  id: string;
  termId: string;
  type: string;
  description: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  scope: string;
  status: "Active" | "Postponed" | "Cancelled";
}
export interface Meal {
  id: string;
  termId: string;
  week: number;
  day: string;
  time: string;
  type: string;
  item: string;
  classId: string;
}
export interface Enquiry {
  id: string;
  termId: string;
  date: string;
  name: string;
  birthDate: string;
  gender: string;
  classId: string;
  nationality: string;
  parent: string;
  phone: string;
  email: string;
  address: string;
  previousSchool: string;
  source: string;
  status: string;
  assignedTo: string;
  followUp: string;
  notes: string;
}
export interface ArchiveRecord {
  id: string;
  termId: string;
  title: string;
  category: string;
  classId: string;
  studentId?: string;
  author: string;
  subject: string;
  filename: string;
  url?: string;
  content: string;
}
export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  position: string;
  status: string;
}
export interface Slot {
  id: string;
  termId: string;
  kind: string;
  day: string;
  start: string;
  end: string;
  classId: string;
  subject: string;
  teacher: string;
  room: string;
}
export interface Scale {
  min: number;
  grade: string;
  points: number;
}
export interface Assessment {
  id: string;
  studentId: string;
  termId: string;
  subject: string;
  ca: number;
  exam: number;
  present: number;
  comment: string;
}
export interface PhaseState {
  assessments: Assessment[];
  students: Student[];
  bills: Bill[];
  payments: Payment[];
  expenses: Expense[];
  plans: Plan[];
  events: SchoolEvent[];
  meals: Meal[];
  enquiries: Enquiry[];
  documents: ArchiveRecord[];
  questions: ArchiveRecord[];
  staff: Staff[];
  slots: Slot[];
  scales: Scale[];
  caWeight: number;
  examWeight: number;
  budgets: { category: string; amount: number }[];
}
export const money = (minor: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
    minor / 100,
  );
export function billTotals(b: Bill, payments: Payment[]) {
  const totalFees = b.tuition + b.maintenance + b.books + b.abacus;
  const discount =
    Math.round((b.tuition * b.discountPercent) / 100) +
    Math.round((totalFees * b.scholarshipPercent) / 100);
  const accumulated = b.arrears + totalFees;
  const payable = accumulated - discount;
  const paid = payments
    .filter(
      (p) =>
        p.studentId === b.studentId &&
        p.termId === b.termId &&
        p.kind === "School fees",
    )
    .reduce((sum, p) => sum + p.amount, 0);
  return {
    totalFees,
    discount,
    accumulated,
    payable,
    paid,
    balance: payable - paid,
  };
}
export function schoolDays(
  start: string,
  end: string,
  events: SchoolEvent[],
  termId: string,
  scope = "Whole School",
) {
  if (!start || !end || start > end)
    return { weekdays: 0, excluded: 0, total: 0 };
  let weekdays = 0,
    excluded = 0;
  for (
    let d = new Date(start + "T00:00:00Z");
    d <= new Date(end + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if ([0, 6].includes(d.getUTCDay())) continue;
    weekdays++;
    const date = d.toISOString().slice(0, 10);
    if (
      events.some(
        (e) =>
          e.termId === termId &&
          e.status === "Active" &&
          ["Holiday/Closure", "Mid-Term"].includes(e.type) &&
          (e.scope === "Whole School" || e.scope === scope) &&
          e.date <= date &&
          e.endDate >= date,
      )
    )
      excluded++;
  }
  return { weekdays, excluded, total: weekdays - excluded };
}
export const nextReceipt = (payments: Payment[], kind: Payment["kind"]) =>
  `${kind === "School fees" ? "FEE" : "INC"}-${String(Math.max(0, ...payments.filter((p) => p.kind === kind).map((p) => Number(p.id.split("-").at(-1)) || 0)) + 1).padStart(3, "0")}`;
export function planStatus(plan: Plan, state: PhaseState) {
  const bill = state.bills.find(
    (b) => b.studentId === plan.studentId && b.termId === plan.termId,
  );
  if (plan.status === "Cancelled") return "Cancelled";
  return bill && billTotals(bill, state.payments).balance <= 0
    ? "Settled · reminders cancelled"
    : "Active · penalty exempt";
}
const sameScheduleDay = (a: string, b: string) => {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (date.test(a) && date.test(b)) return a === b;
  const weekday = (value: string) =>
    date.test(value)
      ? [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][new Date(value + "T00:00:00Z").getUTCDay()]
      : value;
  return weekday(a) === weekday(b);
};
export const hasConflict = (slot: Slot, others: Slot[]) =>
  others.some(
    (s) =>
      s.id !== slot.id &&
      s.termId === slot.termId &&
      sameScheduleDay(s.day, slot.day) &&
      s.start < slot.end &&
      s.end > slot.start &&
      (s.teacher === slot.teacher ||
        s.room === slot.room ||
        s.classId === slot.classId),
  );
export const canManage = (role: Role) =>
  ["SCHOOL_HEAD", "SECRETARY"].includes(role);
export const canFinance = (role: Role) =>
  ["SCHOOL_HEAD", "ADMIN"].includes(role);
export const canAcademic = (role: Role) =>
  ["SCHOOL_HEAD", "ACADEMIC_HEAD"].includes(role);

export function initialPhaseState(role: Role, child: string): PhaseState {
  const students: Student[] = [
    {
      id: "abena",
      name: "Abena Osei",
      gender: "Female",
      birthDate: "2019-07-22",
      nationality: "Ghanaian",
      classId: "Primary 2",
      parent: "Mercy Osei",
      phone: "0244000222",
      email: "mercy@example.test",
      address: "Accra",
      previousSchool: "Little Stars",
      admissionDate: "2026-09-02",
      termId: "2026-1",
      status: "Active",
    },
    {
      id: "kwesi",
      name: "Kwesi Osei",
      gender: "Male",
      birthDate: "2017-02-10",
      nationality: "Ghanaian",
      classId: "Primary 4",
      parent: "Mercy Osei",
      phone: "0244000222",
      email: "mercy@example.test",
      address: "Accra",
      previousSchool: "Little Stars",
      admissionDate: "2025-09-03",
      termId: "2025-1",
      status: "Active",
    },
    {
      id: "kofi",
      name: "Kofi Ansah",
      gender: "Male",
      birthDate: "2019-03-12",
      nationality: "Ghanaian",
      classId: "Primary 2",
      parent: "George Ansah",
      phone: "0244000111",
      email: "george@example.test",
      address: "Tema",
      previousSchool: "",
      admissionDate: "2026-09-04",
      termId: "2026-1",
      status: "Active",
    },
    {
      id: "yaw",
      name: "Yaw Agyemang",
      gender: "Male",
      birthDate: "2018-11-05",
      nationality: "Ghanaian",
      classId: "Primary 2",
      parent: "Kwabena Agyemang",
      phone: "0244000333",
      email: "kwabena@example.test",
      address: "Accra",
      previousSchool: "",
      admissionDate: "2025-09-04",
      termId: "2025-1",
      status: "Stopped",
      exitDate: "2026-09-15",
      exitReason: "Relocated",
    },
  ];
  const documents: ArchiveRecord[] = students.map((s) => ({
    id: `doc-${s.id}`,
    termId: "2026-1",
    title: `${s.name} · terminal report`,
    category: "Terminal report",
    classId: s.classId,
    studentId: s.id,
    author: "Academic office",
    subject: "All subjects",
    filename: "",
    content: `${s.name}\nEnglish: 78 · Mathematics: 72 · Science: 84\nTeacher comment: Good progress this term. Sample report, not an official record.`,
  }));
  const state: PhaseState = {
    assessments: students.flatMap((s) =>
      ["English", "Mathematics", "Science"].map((subject, i) => ({
        id: `mark-${s.id}-${i}`,
        studentId: s.id,
        termId: "2026-1",
        subject,
        ca: 76 + i * 3,
        exam: 70 + i * 4,
        present: 66,
        comment: "Good progress. Continue regular practice.",
      })),
    ),
    students,
    bills: students.map((s, i) => ({
      id: `bill-${s.id}`,
      studentId: s.id,
      termId: "2026-1",
      arrears: i === 0 ? 20000 : 0,
      tuition: 100000,
      maintenance: 10000,
      books: 15000,
      abacus: 5000,
      discountPercent: i === 2 ? 10 : 0,
      scholarshipPercent: i === 1 ? 20 : 0,
    })),
    payments: [
      {
        id: "FEE-001",
        studentId: "abena",
        termId: "2026-1",
        date: "2026-09-10",
        amount: 60000,
        method: "MoMo",
        bank: "",
        kind: "School fees",
        account: "Tuition fee",
        reference: "DEMO-1028",
      },
      {
        id: "FEE-002",
        studentId: "kofi",
        termId: "2026-1",
        date: "2026-09-12",
        amount: 40000,
        method: "Bank Transfer",
        bank: "CalBank",
        kind: "School fees",
        account: "Tuition fee",
        reference: "DEMO-1029",
      },
      {
        id: "INC-001",
        studentId: "abena",
        termId: "2026-1",
        date: "2026-09-14",
        amount: 15000,
        method: "Cash",
        bank: "",
        kind: "Other income",
        account: "Abacus lessons",
        reference: "",
      },
    ],
    expenses: [
      {
        id: "exp-1",
        termId: "2026-1",
        date: "2026-09-15",
        category: "Supplies",
        description: "Exercise books",
        amount: 45000,
        method: "Bank Transfer",
        payee: "School supplies",
      },
    ],
    budgets: [
      { category: "Supplies", amount: 100000 },
      { category: "Facilities", amount: 200000 },
      { category: "Utilities", amount: 80000 },
      { category: "Payroll", amount: 500000 },
    ],
    plans: [
      {
        id: "plan-1",
        studentId: "abena",
        termId: "2026-1",
        status: "Active",
        installments: [
          { amount: 45000, due: "2026-10-01", reminder: "2026-09-28" },
          { amount: 45000, due: "2026-11-01", reminder: "2026-10-28" },
        ],
      },
    ],
    events: [
      {
        id: "event-1",
        termId: "2026-1",
        type: "Holiday/Closure",
        description: "Founders’ Day observed",
        date: "2026-09-21",
        endDate: "2026-09-21",
        startTime: "08:00",
        endTime: "16:00",
        location: "School",
        scope: "Whole School",
        status: "Active",
      },
      {
        id: "event-2",
        termId: "2026-1",
        type: "Mid-Term",
        description: "Mid-term break",
        date: "2026-10-26",
        endDate: "2026-10-30",
        startTime: "08:00",
        endTime: "16:00",
        location: "School",
        scope: "Whole School",
        status: "Active",
      },
      {
        id: "event-3",
        termId: "2026-1",
        type: "PTA Meeting",
        description: "Meet the school leadership",
        date: "2026-09-26",
        endDate: "2026-09-26",
        startTime: "10:00",
        endTime: "12:00",
        location: "Main auditorium",
        scope: "PTA",
        status: "Active",
      },
    ],
    meals: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
      (day, i) => ({
        id: `meal-${i}`,
        termId: "2026-1",
        week: 4,
        day,
        time: "12:00",
        type: "Lunch",
        item: [
          "Waakye with boiled egg",
          "Jollof rice & chicken",
          "Banku & fish",
          "Rice & vegetable stew",
          "Yam & palava sauce",
        ][i],
        classId: "Whole School",
      }),
    ),
    enquiries: [
      {
        id: "enq-1",
        termId: "2026-1",
        date: "2026-09-20",
        name: "Akua Addo",
        birthDate: "2020-03-10",
        gender: "Female",
        classId: "Nursery 1",
        nationality: "Ghanaian",
        parent: "Nana Addo",
        phone: "0244000999",
        email: "nana@example.test",
        address: "East Legon",
        previousSchool: "",
        source: "School website",
        status: "New",
        assignedTo: "Efua Mensah",
        followUp: "2026-09-25",
        notes: "Arrange a school visit.",
      },
    ],
    documents,
    questions: [
      {
        id: "q-1",
        termId: "2025-3",
        title: "Fractions · revision questions",
        category: "Past questions",
        classId: "Primary 2",
        subject: "Mathematics",
        author: "Kofi Mensah",
        filename: "",
        content:
          "1. Write two fractions equivalent to 1/2.\n2. Add 1/4 and 2/4.\n3. Share 12 oranges equally among four children.",
      },
    ],
    staff: [
      {
        id: "staff-1",
        name: "Kofi Mensah",
        email: "kofi@example.test",
        phone: "0244000777",
        category: "Teaching",
        position: "Primary 2 teacher",
        status: "Active",
      },
      {
        id: "staff-2",
        name: "Efua Mensah",
        email: "efua@example.test",
        phone: "0244000888",
        category: "Non-Teaching",
        position: "Administrative Secretary",
        status: "Active",
      },
    ],
    slots: [
      {
        id: "slot-1",
        termId: "2026-1",
        kind: "Lesson",
        day: "Monday",
        start: "08:00",
        end: "09:00",
        classId: "Primary 2",
        subject: "Mathematics",
        teacher: "Kofi Mensah",
        room: "Room P2",
      },
    ],
    scales: [
      { min: 80, grade: "A", points: 4 },
      { min: 70, grade: "B", points: 3 },
      { min: 60, grade: "C", points: 2 },
      { min: 50, grade: "D", points: 1 },
      { min: 0, grade: "F", points: 0 },
    ],
    caWeight: 40,
    examWeight: 60,
  };
  state.documents.push(
    ...state.payments.map((p) => ({
      id: `archived-${p.id}`,
      termId: p.termId,
      title: `Receipt ${p.id}`,
      category:
        p.kind === "School fees" ? "Fees receipt" : "Other income receipt",
      classId: students.find((s) => s.id === p.studentId)!.classId,
      studentId: p.studentId,
      author: "Accounts office",
      subject: "Finance",
      filename: "",
      content: `Preview receipt ${p.id}\n${p.date} · ${p.method}\n${p.account}: ${money(p.amount)}`,
    })),
  );
  if (role === "PARENT") {
    state.students = students.filter((s) => s.id === child);
    state.documents = documents.filter((d) => d.studentId === child);
    state.bills = state.bills.filter((b) => b.studentId === child);
    state.payments = state.payments.filter((p) => p.studentId === child);
    state.enquiries = [];
    state.staff = [];
    state.questions = [];
    state.assessments = state.assessments.filter((a) => a.studentId === child);
  }
  if (role === "TEACHER") {
    state.students = students.filter((s) => s.classId === "Primary 2");
    state.documents = documents.filter((d) => d.classId === "Primary 2");
    state.assessments = state.assessments.filter((a) =>
      state.students.some((s) => s.id === a.studentId),
    );
    state.documents = state.documents.filter(
      (d) => d.category === "Terminal report",
    );
  }
  return state;
}
export function resultFor(
  a: Assessment,
  state: Pick<PhaseState, "caWeight" | "examWeight" | "scales">,
) {
  const total =
    Math.round(a.ca * state.caWeight + a.exam * state.examWeight) / 100;
  const band = [...state.scales]
    .sort((a, b) => b.min - a.min)
    .find((g) => total >= g.min)!;
  return { total, ...band };
}
