import {
  Area,
  DashboardData,
  DashboardRepository,
  Metric,
  Panel,
  Role,
  roleConfig,
} from "./model";

const panel = (
  title: string,
  description: string,
  columns: Panel["columns"],
  rows: string[][],
  action?: string,
): Panel => ({
  title,
  description,
  columns,
  action,
  rows: rows.map(([name, group, value, status, note], i) => ({
    id: `${title}-${i}`,
    name,
    group,
    value,
    status,
    note,
  })),
});
const panels: Record<Area, Panel> = {
  finance: panel(
    "Collections & revenue",
    "Tuition, other income, and approved concessions.",
    ["Revenue source", "Category", "Amount"],
    [
      [
        "Tuition fees",
        "Term 1 · 2026/27",
        "GH₵ 82,400",
        "Collected",
        "Expected GH₵ 100,000. Collection rate 82.4%.",
      ],
      [
        "Transport & meals",
        "Other income",
        "GH₵ 12,600",
        "Collected",
        "Transport GH₵ 8,400 · Meals GH₵ 4,200.",
      ],
      [
        "Scholarships",
        "12 students",
        "GH₵ 6,000",
        "Approved",
        "Approved concessions are excluded from collectible tuition.",
      ],
      [
        "INV-2026-041",
        "Kofi Ansah · Primary 2",
        "GH₵ 1,200",
        "Pending",
        "Tuition installment due 30 September 2026.",
      ],
    ],
    "Record payment",
  ),
  debts: panel(
    "Fee defaulters",
    "Prioritize overdue accounts by age and balance.",
    ["Student", "Aging", "Outstanding"],
    [
      [
        "Kofi Ansah",
        "1–30 days",
        "GH₵ 1,200",
        "Overdue",
        "Guardian: George Ansah. Last reminder: 12 September. Late fee: GH₵ 0.",
      ],
      [
        "Abena Osei",
        "31–60 days",
        "GH₵ 850",
        "Overdue",
        "Guardian: Mercy Osei. Late fee: GH₵ 50 included in balance.",
      ],
      [
        "Yaw Agyemang",
        "61–90 days",
        "GH₵ 2,100",
        "Overdue",
        "Payment plan requested. Late fee: GH₵ 100 included in balance.",
      ],
      [
        "Adwoa Boateng",
        "Over 90 days",
        "GH₵ 950",
        "Review",
        "Scholarship review pending. Do not apply a penalty until reviewed.",
      ],
    ],
    "Draft reminder",
  ),
  budgets: panel(
    "Budgets & spending",
    "Department allocations, committed invoices, and available balances.",
    ["Department / invoice", "Budget / category", "Spent / amount"],
    [
      [
        "Primary department",
        "GH₵ 25,000 allocated",
        "GH₵ 18,750",
        "On track",
        "75% used. GH₵ 6,250 available.",
      ],
      [
        "Science department",
        "GH₵ 15,000 allocated",
        "GH₵ 14,250",
        "Near limit",
        "95% used. GH₵ 750 available.",
      ],
      [
        "Facilities",
        "GH₵ 20,000 allocated",
        "GH₵ 21,000",
        "Over budget",
        "105% used. GH₵ 1,000 over allocation.",
      ],
      [
        "INV-SUP-018 · Lab supplies",
        "Supplies · invoice",
        "GH₵ 3,400",
        "Pending",
        "Awaiting approval. Due 25 September.",
      ],
      [
        "INV-SUP-019 · Maintenance",
        "Facilities · invoice",
        "GH₵ 1,850",
        "Pending",
        "Awaiting payment. Due 28 September.",
      ],
    ],
    "Add expense",
  ),
  enrollment: panel(
    "Enrollment distribution",
    "Capacity, admissions, and withdrawals across departments.",
    ["Department", "Active / capacity", "Term movement"],
    [
      [
        "Creche",
        "42 / 50",
        "+6 admissions",
        "Available",
        "2 withdrawals · 8 prospective families.",
      ],
      [
        "Nursery",
        "86 / 100",
        "+12 admissions",
        "Available",
        "3 withdrawals · 14 prospective families.",
      ],
      [
        "Primary",
        "248 / 260",
        "+18 admissions",
        "Near capacity",
        "4 withdrawals · 21 prospective families.",
      ],
      [
        "Junior high",
        "144 / 180",
        "+9 admissions",
        "Available",
        "2 withdrawals · 10 prospective families.",
      ],
    ],
  ),
  performance: panel(
    "Students needing support",
    "Review academic and attendance risk factors together.",
    ["Student", "Class · risk factor", "Average"],
    [
      [
        "Kofi Ansah",
        "Primary 2 · Low attainment",
        "46%",
        "At risk",
        "Mathematics 42%, English 50%. Attendance 88%. Recommend weekly revision.",
      ],
      [
        "Yaw Agyemang",
        "Primary 2 · Absenteeism",
        "49%",
        "At risk",
        "Attendance 72%. Average fell 8 points from last term.",
      ],
      [
        "Adwoa Boateng",
        "Primary 2 · Missing work",
        "54%",
        "Review",
        "3 assignments overdue. Attendance 96%.",
      ],
      [
        "Kwesi Addo",
        "Primary 2 · Improving",
        "67%",
        "On track",
        "Average increased 9 points following learning support.",
      ],
    ],
  ),
  faculty: panel(
    "Faculty workload",
    "Teaching hours, class sizes, and syllabus readiness.",
    ["Teacher", "Allocation", "Hours / week"],
    [
      [
        "Kofi Mensah",
        "Primary 2 · 28 students",
        "24 / 30",
        "Submitted",
        "Syllabus submitted 14 September. Teacher-to-student ratio 1:28.",
      ],
      [
        "Efua Owusu",
        "JHS 1 · 36 students",
        "32 / 30",
        "Overloaded",
        "Two hours above planned workload. Syllabus submitted.",
      ],
      [
        "Adjoa Asante",
        "Primary 4 · 30 students",
        "26 / 30",
        "Late",
        "Syllabus due 16 September. Follow up required.",
      ],
      [
        "Kojo Appiah",
        "JHS 2 · 32 students",
        "22 / 30",
        "Submitted",
        "Available for 8 additional teaching hours.",
      ],
    ],
  ),
  attendance: panel(
    "Attendance register",
    "Sample roll call · Primary 2 · 21 September 2026.",
    ["Student", "Class", "Attendance"],
    [
      [
        "Kofi Ansah",
        "Primary 2",
        "88% this term",
        "Present",
        "Arrived at 07:40.",
      ],
      [
        "Abena Osei",
        "Primary 2",
        "98% this term",
        "Present",
        "Arrived at 07:35.",
      ],
      [
        "Yaw Agyemang",
        "Primary 2",
        "72% this term",
        "Absent",
        "Unexcused absence. Guardian follow-up needed.",
      ],
      [
        "Adwoa Boateng",
        "Primary 2",
        "96% this term",
        "Late",
        "Arrived at 08:20.",
      ],
    ],
    "Take attendance",
  ),
  reports: panel(
    "Academic quality & reports",
    "Term averages, pass rates, and report card readiness.",
    ["Class / subject", "Average · pass rate", "Reports ready"],
    [
      [
        "Primary 2",
        "72% · 89% pass",
        "26 / 28",
        "In progress",
        "Average last term 68%. Two teacher comments outstanding.",
      ],
      [
        "Primary 3",
        "76% · 94% pass",
        "30 / 30",
        "Ready",
        "Average last term 73%. All comments complete.",
      ],
      [
        "JHS 1",
        "65% · 81% pass",
        "29 / 36",
        "In progress",
        "Average last term 67%. Mathematics review recommended.",
      ],
      [
        "JHS 2",
        "78% · 96% pass",
        "32 / 32",
        "Ready",
        "Average last term 75%. Ready for academic review.",
      ],
    ],
  ),
  communication: panel(
    "Parent communication",
    "Delivery health, announcements, and open inquiries.",
    ["Message / inquiry", "Audience", "Delivery / replies"],
    [
      [
        "Term 1 fee reminder",
        "SMS · 420 guardians",
        "98% delivered",
        "Delivered",
        "412 delivered, 8 failed. Sent 18 September.",
      ],
      [
        "PTA meeting · 26 September",
        "Email · 380 guardians",
        "94% delivered",
        "Delivered",
        "357 delivered, 23 failed. 186 opened.",
      ],
      [
        "Transport route question",
        "Mercy Osei",
        "Awaiting reply",
        "Open",
        "Parent asks about the revised morning pickup time.",
      ],
      [
        "Mid-term assessment dates",
        "All parents",
        "Not sent",
        "Draft",
        "Scheduled draft for academic review.",
      ],
    ],
    "Compose message",
  ),
  gradebook: panel(
    "Gradebook",
    "Primary 2 · Mathematics · CA 40 + examination 60.",
    ["Student", "CA / 40 · exam / 60", "Total / 100"],
    [
      [
        "Kofi Ansah",
        "20 · 26",
        "46",
        "Review",
        "Needs practice with fractions.",
      ],
      [
        "Abena Osei",
        "35 · 51",
        "86",
        "Complete",
        "Excellent progress and consistent participation.",
      ],
      [
        "Yaw Agyemang",
        "22 · 27",
        "49",
        "Review",
        "Missing assignments affecting progress.",
      ],
      [
        "Adwoa Boateng",
        "26 · 28",
        "54",
        "Complete",
        "Build confidence with word problems.",
      ],
    ],
    "Enter marks",
  ),
  schedule: panel(
    "Weekly timetable",
    "Assigned lessons, rooms, and free periods.",
    ["Lesson", "Day · time", "Location"],
    [
      [
        "Mathematics · Primary 2",
        "Monday · 08:00–09:00",
        "Room P2",
        "Lesson",
        "Fractions and equivalent values.",
      ],
      [
        "English · Primary 2",
        "Monday · 10:00–11:00",
        "Room P2",
        "Lesson",
        "Reading comprehension.",
      ],
      [
        "Planning period",
        "Monday · 11:30–12:30",
        "Staff room",
        "Free period",
        "Prepare continuous assessment tasks.",
      ],
      [
        "Science · Primary 2",
        "Tuesday · 09:00–10:00",
        "Science lab",
        "Lesson",
        "Living things and their habitats.",
      ],
      [
        "Mathematics · Primary 2",
        "Wednesday · 08:00–09:00",
        "Room P2",
        "Lesson",
        "Fraction exercises and group work.",
      ],
      [
        "English · Primary 2",
        "Thursday · 10:00–11:00",
        "Library",
        "Lesson",
        "Independent reading.",
      ],
      [
        "Class assessment",
        "Friday · 09:00–10:00",
        "Room P2",
        "Assessment",
        "Weekly mathematics quiz.",
      ],
    ],
  ),
  resources: panel(
    "Lesson plans & resources",
    "Syllabi, homework, and classroom learning materials.",
    ["Resource", "Subject · type", "Due / updated"],
    [
      [
        "Fractions lesson plan",
        "Mathematics · Plan",
        "21 September",
        "Draft",
        "Learning objective: identify equivalent fractions.",
      ],
      [
        "Reading comprehension",
        "English · Homework",
        "24 September",
        "Published",
        "Read the passage and answer questions 1–5.",
      ],
      [
        "Term 1 syllabus",
        "Science · Syllabus",
        "14 September",
        "Submitted",
        "Week 1–12 learning outcomes and assessment schedule.",
      ],
    ],
    "Add resource",
  ),
  children: panel(
    "My children",
    "Only children linked to this preview parent are shown.",
    ["Child", "School · class", "Attendance"],
    [
      [
        "Abena Osei",
        "Fastrack International · Primary 2",
        "98%",
        "On track",
        "Class teacher: Kofi Mensah. Average 86%.",
      ],
      [
        "Kwesi Osei",
        "Fastrack International · Primary 4",
        "95%",
        "On track",
        "Class teacher: Adjoa Asante. Average 78%.",
      ],
    ],
  ),
  schools: panel(
    "School directory",
    "Tenant status, enrollment, and school contacts.",
    ["School", "Students · staff", "Subscription"],
    [
      [
        "Fastrack International",
        "520 students · 32 staff",
        "Professional",
        "Active",
        "FIS-001 · Accra · Principal Kwame Mensah.",
      ],
      [
        "Riverside Academy",
        "284 students · 21 staff",
        "Standard",
        "Active",
        "RIV-002 · Kumasi · Principal Efua Owusu.",
      ],
      [
        "Greenfield School",
        "160 students · 14 staff",
        "Trial",
        "Trial",
        "GRN-003 · Tema · Trial ends 30 September.",
      ],
    ],
    "Add school",
  ),
  subscriptions: panel(
    "Subscriptions & modules",
    "School plans, renewals, and enabled services.",
    ["School", "Enabled modules", "Renewal"],
    [
      [
        "Fastrack International",
        "Students · Fees · Attendance · Academics",
        "01 Oct 2026",
        "Active",
        "Professional · GH₵ 1,200 / month.",
      ],
      [
        "Riverside Academy",
        "Students · Fees · Attendance",
        "25 Sep 2026",
        "Due soon",
        "Standard · GH₵ 800 / month.",
      ],
      [
        "Greenfield School",
        "Students · Attendance",
        "30 Sep 2026",
        "Trial",
        "Trial · No payment method recorded.",
      ],
    ],
  ),
  access: panel(
    "Users & role assignments",
    "Platform administrators and school-scoped staff accounts.",
    ["User", "School · role", "Access"],
    [
      [
        "Ama Mensah",
        "Fastrack International · Account Officer",
        "Finance",
        "Active",
        "Backend role ADMIN. Fee collection and expenses.",
      ],
      [
        "Akosua Mensah",
        "Fastrack International · Academic Head",
        "Academics",
        "Pending integration",
        "New backend role ACADEMIC_HEAD required.",
      ],
      [
        "Kofi Mensah",
        "Fastrack International · Teacher",
        "Assigned classes",
        "Active",
        "Classroom attendance and grade entry.",
      ],
    ],
    "Invite user",
  ),
  activity: panel(
    "Platform activity",
    "Sample audit events. Live events must come from the server.",
    ["Event", "Actor · school", "Time"],
    [
      [
        "Payment recorded",
        "Ama Mensah · FIS-001",
        "08:42 GMT",
        "Success",
        "Receipt REC-1042 · GH₵ 600.",
      ],
      [
        "Attendance saved",
        "Kofi Mensah · FIS-001",
        "08:15 GMT",
        "Success",
        "Primary 2 · 28 students.",
      ],
      [
        "School subscription updated",
        "Caleb Mensah · Platform",
        "Yesterday",
        "Success",
        "RIV-002 renewed Standard plan.",
      ],
    ],
  ),
};
const metrics: Record<Role, Metric[]> = {
  ADMIN: [
    {
      label: "Tuition collected",
      value: "GH₵ 82,400",
      detail: "82.4% of GH₵ 100,000 target",
      tone: "green",
    },
    {
      label: "Outstanding tuition",
      value: "GH₵ 17,600",
      detail: "GH₵ 5,100 overdue",
      tone: "orange",
    },
    {
      label: "Other income",
      value: "GH₵ 12,600",
      detail: "Transport, meals & activities",
      tone: "blue",
    },
    {
      label: "Expenses to date",
      value: "GH₵ 54,000",
      detail: "GH₵ 60,000 budget · 90% used",
      tone: "orange",
    },
  ],
  SCHOOL_HEAD: [
    {
      label: "Active students",
      value: "520",
      detail: "45 admissions · 11 withdrawals",
      tone: "blue",
    },
    {
      label: "Tuition collected",
      value: "GH₵ 82,400",
      detail: "GH₵ 17,600 still outstanding",
      tone: "green",
    },
    {
      label: "Student attendance",
      value: "94.5%",
      detail: "Staff attendance 96.8%",
      tone: "blue",
    },
    {
      label: "School pass rate",
      value: "89%",
      detail: "+4 percentage points from last term",
      tone: "green",
    },
  ],
  ACADEMIC_HEAD: [
    {
      label: "Average performance",
      value: "72.8%",
      detail: "+3.2 points from last term",
      tone: "green",
    },
    {
      label: "Students at risk",
      value: "14",
      detail: "Below 50% average · 6 chronic absences",
      tone: "orange",
    },
    {
      label: "Overall attendance",
      value: "94.5%",
      detail: "Across 520 active students",
      tone: "blue",
    },
    {
      label: "Reports complete",
      value: "87%",
      detail: "452 of 520 ready for review",
      tone: "green",
    },
  ],
  TEACHER: [
    {
      label: "My students",
      value: "28",
      detail: "Primary 2 · class teacher",
      tone: "blue",
    },
    {
      label: "Present today",
      value: "26 / 28",
      detail: "1 absent · 1 late",
      tone: "green",
    },
    {
      label: "Class average",
      value: "72%",
      detail: "+4 points from last term",
      tone: "green",
    },
    {
      label: "Needs attention",
      value: "3",
      detail: "Learning support & missing work",
      tone: "orange",
    },
  ],
  PARENT: [
    {
      label: "Attendance",
      value: "98%",
      detail: "Abena · 1 absence this term",
      tone: "green",
    },
    {
      label: "Term average",
      value: "86%",
      detail: "+5 points from last term",
      tone: "blue",
    },
    {
      label: "Fees remaining",
      value: "GH₵ 850",
      detail: "Due 30 September 2026",
      tone: "orange",
    },
    {
      label: "New messages",
      value: "2",
      detail: "From your school & class teacher",
      tone: "blue",
    },
  ],
  SUPER_ADMIN: [
    {
      label: "Schools",
      value: "3",
      detail: "2 active · 1 trial",
      tone: "blue",
    },
    {
      label: "Students on platform",
      value: "964",
      detail: "Across all 3 schools",
      tone: "green",
    },
    {
      label: "Monthly subscriptions",
      value: "GH₵ 2,000",
      detail: "2 paid school plans",
      tone: "green",
    },
    {
      label: "Upcoming renewals",
      value: "2",
      detail: "Within the next 14 days",
      tone: "orange",
    },
  ],
};
export const sampleTerms = [
  { value: "2026-1", label: "Term 1 · 2026/27" },
  { value: "2025-3", label: "Term 3 · 2025/26" },
];

export const previewRepository: DashboardRepository = {
  async load({ user, termId, childId, signal }) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, 180);
      signal?.addEventListener("abort", abort, { once: true });
    });
    const role = user.role;
    const data: DashboardData = {
      metrics: structuredClone(metrics[role]),
      panels: {},
      chartTitle: roleConfig[role].chart,
      chartLegend: ["This term", "Last term"],
      bars: [],
      priorities: [],
    };
    for (const area of roleConfig[role].areas)
      data.panels[area] = structuredClone(panels[area]);
    const academic = ["TEACHER", "ACADEMIC_HEAD", "PARENT"].includes(role);
    data.bars = (
      academic
        ? ["English", "Maths", "Science", "ICT", "Social studies"]
        : ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
    ).map((label, i) => ({
      label,
      value: [78, 64, 86, 72, 90][i],
      secondary: [66, 59, 72, 68, 76][i],
    }));
    if (!academic)
      data.chartLegend =
        role === "SUPER_ADMIN"
          ? ["Active seats (×10)", "Previous period (×10)"]
          : ["Revenue (GH₵ ×100)", "Expenses (GH₵ ×100)"];
    if (role === "PARENT") {
      const second = childId === "kwesi";
      const name = second ? "Kwesi Osei" : "Abena Osei";
      const classroom = second ? "Primary 4" : "Primary 2";
      data.metrics[0] = {
        label: "Attendance",
        value: second ? "95%" : "98%",
        detail: `${name} · ${classroom}`,
        tone: "green",
      };
      data.metrics[1].value = second ? "78%" : "86%";
      data.metrics[1].detail = `${name} · term performance`;
      data.metrics[2].value = second ? "GH₵ 400" : "GH₵ 850";
      data.panels.finance = panel(
        "Fees & receipts",
        `${name} · ${classroom}`,
        ["Invoice / receipt", "Description", "Amount"],
        [
          [
            `INV-${second ? "052" : "042"}`,
            "Term tuition · due 30 September",
            data.metrics[2].value,
            "Pending",
            "Contact the school accounts office to arrange payment.",
          ],
          [
            "REC-1028",
            "Tuition payment · 10 September",
            "GH₵ 600",
            "Paid",
            "Payment method: MoMo. This is a sample receipt.",
          ],
        ],
      );
      data.panels.reports = panel(
        "Results & progress",
        `${name} · ${classroom}`,
        ["Subject", "Previous term", "This term"],
        ["English", "Mathematics", "Science"].map((subject, i) => [
          subject,
          `${[78, 75, 84][i] - (second ? 8 : 0)}%`,
          `${[86, 82, 90][i] - (second ? 8 : 0)}%`,
          "Published",
          "Teacher comment: Consistent progress; keep up daily revision.",
        ]),
      );
      data.panels.attendance = panel(
        "Attendance history",
        `${name} · ${classroom}`,
        ["Date", "Class", "Arrival"],
        [
          [
            "21 September 2026",
            classroom,
            "07:35",
            "Present",
            "Morning register.",
          ],
          [
            "18 September 2026",
            classroom,
            "07:42",
            "Present",
            "Morning register.",
          ],
          [
            "17 September 2026",
            classroom,
            "—",
            "Absent",
            "Excused · family appointment.",
          ],
        ],
      );
      data.panels.communication = panel(
        "Messages from school",
        "Announcements and conversations for your family.",
        ["Message", "From", "Date"],
        [
          [
            "PTA meeting · 26 September",
            "School office",
            "18 September",
            "Unread",
            "Please join us at 10:00 in the assembly hall.",
          ],
          [
            "Reading practice",
            "Class teacher",
            "17 September",
            "Unread",
            "Please support 20 minutes of reading at home each day.",
          ],
        ],
        "Compose message",
      );
      data.panels.schedule = panel(
        "Child’s timetable",
        `${name} · ${classroom}`,
        ["Subject", "Day · time", "Room"],
        [
          ["Mathematics", "Monday · 08:00", classroom, "Lesson", "Fractions"],
          ["English", "Tuesday · 10:00", classroom, "Lesson", "Reading"],
        ],
      );
      if (second)
        data.bars = data.bars.map((b) => ({
          ...b,
          value: b.value - 8,
          secondary: b.secondary - 8,
        }));
    }
    if (role === "SCHOOL_HEAD")
      data.panels.attendance = panel(
        "Attendance & staff availability",
        "School attendance and unexcused leave summaries.",
        ["Group", "Present / expected", "Attendance"],
        [
          [
            "Primary students",
            "234 / 248",
            "94.4%",
            "Review",
            "9 excused · 5 unexcused absences.",
          ],
          [
            "JHS students",
            "136 / 144",
            "94.4%",
            "Review",
            "6 excused · 2 unexcused absences.",
          ],
          [
            "Teaching staff",
            "30 / 31",
            "96.8%",
            "Review",
            "1 unexcused absence. Cover required for JHS 1.",
          ],
        ],
      );
    if (role === "ACADEMIC_HEAD")
      data.panels.attendance = panel(
        "Attendance & engagement",
        "Class attendance alongside academic averages.",
        ["Class", "Attendance", "Average grade"],
        [
          [
            "Primary 2",
            "92.9%",
            "72%",
            "Review",
            "2 students with chronic absences.",
          ],
          ["Primary 3", "97%", "76%", "On track", "No chronic absences."],
          [
            "JHS 1",
            "88%",
            "65%",
            "At risk",
            "4 students with chronic absences; average fell 2 points.",
          ],
        ],
      );
    data.priorities = roleConfig[role].featured
      .slice(0, 3)
      .map((area) => ({
        title: data.panels[area]!.title,
        detail: data.panels[area]!.description,
        area,
      }));
    if (termId === "2025-3") {
      // Archived fixture deliberately contains no current-term records or writable actions.
      data.metrics = [
        { label: "Period", value: "Term 3", detail: "2025/26 · Archived" },
        {
          label: "Data availability",
          value: "Archive",
          detail: "Sample historical records not loaded",
        },
      ];
      data.bars = data.bars.map((b) => ({
        ...b,
        value: b.secondary,
        secondary: Math.max(0, b.secondary - 7),
      }));
      data.chartLegend = ["Archived term", "Previous term"];
      Object.values(data.panels).forEach((p) => {
        p.rows = [];
        p.action = undefined;
      });
      data.priorities = [];
    }
    return data;
  },
};
