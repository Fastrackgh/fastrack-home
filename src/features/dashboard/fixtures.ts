import {
  Area,
  DashboardData,
  DashboardRepository,
  Metric,
  Panel,
  roleConfig,
  areaLabels,
  previewAreas,
} from './model';
import type { SchoolRole } from '@/lib/rbac';

const panel = (
  title: string,
  description: string,
  columns: Panel['columns'],
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
const panels: Partial<Record<Area, Panel>> = {
  budgets: panel(
    'Budgets & spending',
    'Department allocations, committed invoices, and available balances.',
    ['Department / invoice', 'Budget / category', 'Spent / amount'],
    [
      [
        'Primary department',
        'GH₵ 25,000 allocated',
        'GH₵ 18,750',
        'On track',
        '75% used. GH₵ 6,250 available.',
      ],
      [
        'Science department',
        'GH₵ 15,000 allocated',
        'GH₵ 14,250',
        'Near limit',
        '95% used. GH₵ 750 available.',
      ],
      [
        'Facilities',
        'GH₵ 20,000 allocated',
        'GH₵ 21,000',
        'Over budget',
        '105% used. GH₵ 1,000 over allocation.',
      ],
      [
        'INV-SUP-018 · Lab supplies',
        'Supplies · invoice',
        'GH₵ 3,400',
        'Pending',
        'Awaiting approval. Due 25 September.',
      ],
      [
        'INV-SUP-019 · Maintenance',
        'Facilities · invoice',
        'GH₵ 1,850',
        'Pending',
        'Awaiting payment. Due 28 September.',
      ],
    ],
    'Add expense',
  ),
  performance: panel(
    'Students needing support',
    'Review academic and attendance risk factors together.',
    ['Student', 'Class · risk factor', 'Average'],
    [
      [
        'Kofi Ansah',
        'Primary 2 · Low attainment',
        '46%',
        'At risk',
        'Mathematics 42%, English 50%. Attendance 88%. Recommend weekly revision.',
      ],
      [
        'Yaw Agyemang',
        'Primary 2 · Absenteeism',
        '49%',
        'At risk',
        'Attendance 72%. Average fell 8 points from last term.',
      ],
      [
        'Adwoa Boateng',
        'Primary 2 · Missing work',
        '54%',
        'Review',
        '3 assignments overdue. Attendance 96%.',
      ],
      [
        'Kwesi Addo',
        'Primary 2 · Improving',
        '67%',
        'On track',
        'Average increased 9 points following learning support.',
      ],
    ],
  ),
  faculty: panel(
    'Faculty workload',
    'Teaching hours, class sizes, and syllabus readiness.',
    ['Teacher', 'Allocation', 'Hours / week'],
    [
      [
        'Kofi Mensah',
        'Primary 2 · 28 students',
        '24 / 30',
        'Submitted',
        'Syllabus submitted 14 September. Teacher-to-student ratio 1:28.',
      ],
      [
        'Efua Owusu',
        'JHS 1 · 36 students',
        '32 / 30',
        'Overloaded',
        'Two hours above planned workload. Syllabus submitted.',
      ],
      [
        'Adjoa Asante',
        'Primary 4 · 30 students',
        '26 / 30',
        'Late',
        'Syllabus due 16 September. Follow up required.',
      ],
      [
        'Kojo Appiah',
        'JHS 2 · 32 students',
        '22 / 30',
        'Submitted',
        'Available for 8 additional teaching hours.',
      ],
    ],
  ),
  reports: panel(
    'Academic quality & reports',
    'Term averages, pass rates, and report card readiness.',
    ['Class / subject', 'Average · pass rate', 'Reports ready'],
    [
      [
        'Primary 2',
        '72% · 89% pass',
        '26 / 28',
        'In progress',
        'Average last term 68%. Two teacher comments outstanding.',
      ],
      [
        'Primary 3',
        '76% · 94% pass',
        '30 / 30',
        'Ready',
        'Average last term 73%. All comments complete.',
      ],
      [
        'JHS 1',
        '65% · 81% pass',
        '29 / 36',
        'In progress',
        'Average last term 67%. Mathematics review recommended.',
      ],
      [
        'JHS 2',
        '78% · 96% pass',
        '32 / 32',
        'Ready',
        'Average last term 75%. Ready for academic review.',
      ],
    ],
  ),
  communication: panel(
    'Parent communication',
    'Delivery health, announcements, and open inquiries.',
    ['Message / inquiry', 'Audience', 'Delivery / replies'],
    [
      [
        'Term 1 fee reminder',
        'SMS · 420 guardians',
        '98% delivered',
        'Delivered',
        '412 delivered, 8 failed. Sent 18 September.',
      ],
      [
        'PTA meeting · 26 September',
        'Email · 380 guardians',
        '94% delivered',
        'Delivered',
        '357 delivered, 23 failed. 186 opened.',
      ],
      [
        'Transport route question',
        'Mercy Osei',
        'Awaiting reply',
        'Open',
        'Parent asks about the revised morning pickup time.',
      ],
      [
        'Mid-term assessment dates',
        'All parents',
        'Not sent',
        'Draft',
        'Scheduled draft for academic review.',
      ],
    ],
    'Compose message',
  ),
  gradebook: panel(
    'Gradebook',
    'Primary 2 · Mathematics · CA 40 + examination 60.',
    ['Student', 'CA / 40 · exam / 60', 'Total / 100'],
    [
      ['Kofi Ansah', '20 · 26', '46', 'Review', 'Needs practice with fractions.'],
      [
        'Abena Osei',
        '35 · 51',
        '86',
        'Complete',
        'Excellent progress and consistent participation.',
      ],
      ['Yaw Agyemang', '22 · 27', '49', 'Review', 'Missing assignments affecting progress.'],
      ['Adwoa Boateng', '26 · 28', '54', 'Complete', 'Build confidence with word problems.'],
    ],
    'Enter marks',
  ),
  schedule: panel(
    'Weekly timetable',
    'Assigned lessons, rooms, and free periods.',
    ['Lesson', 'Day · time', 'Location'],
    [
      [
        'Mathematics · Primary 2',
        'Monday · 08:00–09:00',
        'Room P2',
        'Lesson',
        'Fractions and equivalent values.',
      ],
      [
        'English · Primary 2',
        'Monday · 10:00–11:00',
        'Room P2',
        'Lesson',
        'Reading comprehension.',
      ],
      [
        'Planning period',
        'Monday · 11:30–12:30',
        'Staff room',
        'Free period',
        'Prepare continuous assessment tasks.',
      ],
      [
        'Science · Primary 2',
        'Tuesday · 09:00–10:00',
        'Science lab',
        'Lesson',
        'Living things and their habitats.',
      ],
      [
        'Mathematics · Primary 2',
        'Wednesday · 08:00–09:00',
        'Room P2',
        'Lesson',
        'Fraction exercises and group work.',
      ],
      [
        'English · Primary 2',
        'Thursday · 10:00–11:00',
        'Library',
        'Lesson',
        'Independent reading.',
      ],
      [
        'Class assessment',
        'Friday · 09:00–10:00',
        'Room P2',
        'Assessment',
        'Weekly mathematics quiz.',
      ],
    ],
  ),
  children: panel(
    'My children',
    'Only children linked to this preview parent are shown.',
    ['Child', 'School · class', 'Attendance'],
    [
      [
        'Abena Osei',
        'Fastrack International · Primary 2',
        '98%',
        'On track',
        'Class teacher: Kofi Mensah. Average 86%.',
      ],
      [
        'Kwesi Osei',
        'Fastrack International · Primary 4',
        '95%',
        'On track',
        'Class teacher: Adjoa Asante. Average 78%.',
      ],
    ],
  ),
};
const metrics: Record<SchoolRole, Metric[]> = {
  SECRETARY: [
    {
      label: 'Active students',
      value: '520',
      detail: 'School enrollment',
      tone: 'blue',
    },
    {
      label: 'New admissions',
      value: '45',
      detail: 'Current term',
      tone: 'green',
    },
    {
      label: 'Open enquiries',
      value: '12',
      detail: 'Admissions follow-up',
      tone: 'orange',
    },
    {
      label: 'School staff',
      value: '32',
      detail: 'Teaching and administration',
      tone: 'blue',
    },
  ],
  ACCOUNT_OFFICER: [
    {
      label: 'Tuition collected',
      value: 'GH₵ 82,400',
      detail: '82.4% of GH₵ 100,000 target',
      tone: 'green',
    },
    {
      label: 'Outstanding tuition',
      value: 'GH₵ 17,600',
      detail: 'GH₵ 5,100 overdue',
      tone: 'orange',
    },
    {
      label: 'Other income',
      value: 'GH₵ 12,600',
      detail: 'Transport, meals & activities',
      tone: 'blue',
    },
    {
      label: 'Expenses to date',
      value: 'GH₵ 54,000',
      detail: 'GH₵ 60,000 budget · 90% used',
      tone: 'orange',
    },
  ],
  PRINCIPAL: [
    {
      label: 'Active students',
      value: '520',
      detail: '45 admissions · 11 withdrawals',
      tone: 'blue',
    },
    {
      label: 'Tuition collected',
      value: 'GH₵ 82,400',
      detail: 'GH₵ 17,600 still outstanding',
      tone: 'green',
    },
    {
      label: 'Student attendance',
      value: '94.5%',
      detail: 'Staff attendance 96.8%',
      tone: 'blue',
    },
    {
      label: 'School pass rate',
      value: '89%',
      detail: '+4 percentage points from last term',
      tone: 'green',
    },
  ],
  ACADEMIC_HEAD: [
    {
      label: 'Average performance',
      value: '72.8%',
      detail: '+3.2 points from last term',
      tone: 'green',
    },
    {
      label: 'Students at risk',
      value: '14',
      detail: 'Below 50% average · 6 chronic absences',
      tone: 'orange',
    },
    {
      label: 'Overall attendance',
      value: '94.5%',
      detail: 'Across 520 active students',
      tone: 'blue',
    },
    {
      label: 'Reports complete',
      value: '87%',
      detail: '452 of 520 ready for review',
      tone: 'green',
    },
  ],
  TEACHER: [
    {
      label: 'My students',
      value: '28',
      detail: 'Primary 2 · class teacher',
      tone: 'blue',
    },
    {
      label: 'Present today',
      value: '26 / 28',
      detail: '1 absent · 1 late',
      tone: 'green',
    },
    {
      label: 'Class average',
      value: '72%',
      detail: '+4 points from last term',
      tone: 'green',
    },
    {
      label: 'Needs attention',
      value: '3',
      detail: 'Learning support & missing work',
      tone: 'orange',
    },
  ],
  PARENT: [
    {
      label: 'Attendance',
      value: '98%',
      detail: 'Abena · 1 absence this term',
      tone: 'green',
    },
    {
      label: 'Term average',
      value: '86%',
      detail: '+5 points from last term',
      tone: 'blue',
    },
    {
      label: 'Fees remaining',
      value: 'GH₵ 850',
      detail: 'Due 30 September 2026',
      tone: 'orange',
    },
    {
      label: 'New messages',
      value: '2',
      detail: 'From your school & class teacher',
      tone: 'blue',
    },
  ],
};
export const sampleTerms = [
  { value: '2026-1', label: 'Term 1 · 2026/27' },
  { value: '2025-3', label: 'Term 3 · 2025/26' },
];

export const previewRepository: DashboardRepository = {
  async load({ viewer, termId, childId, signal }) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, 180);
      signal?.addEventListener('abort', abort, { once: true });
    });
    const role = viewer.role;
    const data: DashboardData = {
      metrics: structuredClone(metrics[role]),
      panels: {},
      chartTitle: roleConfig[role].chart,
      chartLegend: ['This term', 'Last term'],
      bars: [],
      priorities: [],
    };
    // Like the live API, return only what the viewer may see.
    for (const area of previewAreas(viewer))
      data.panels[area] = panels[area]
        ? structuredClone(panels[area])
        : {
            title: areaLabels[area],
            description: 'Phase-one workspace · open to review records and actions.',
            columns: ['Record', 'Scope', 'Status'],
            rows: [],
          };
    const academic = ['TEACHER', 'ACADEMIC_HEAD', 'PARENT'].includes(role);
    data.bars = (
      academic
        ? ['English', 'Maths', 'Science', 'ICT', 'Social studies']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']
    ).map((label, i) => ({
      label,
      value: [78, 64, 86, 72, 90][i],
      secondary: [66, 59, 72, 68, 76][i],
    }));
    if (!academic) data.chartLegend = ['Revenue (GH₵ ×100)', 'Expenses (GH₵ ×100)'];
    if (role === 'PARENT') {
      const second = childId === 'kwesi';
      const name = second ? 'Kwesi Osei' : 'Abena Osei';
      const classroom = second ? 'Primary 4' : 'Primary 2';
      data.metrics[0] = {
        label: 'Attendance',
        value: second ? '95%' : '98%',
        detail: `${name} · ${classroom}`,
        tone: 'green',
      };
      data.metrics[1].value = second ? '78%' : '86%';
      data.metrics[1].detail = `${name} · term performance`;
      data.metrics[2].value = second ? 'GH₵ 400' : 'GH₵ 850';
      data.panels.finance = panel(
        'Fees & receipts',
        `${name} · ${classroom}`,
        ['Invoice / receipt', 'Description', 'Amount'],
        [
          [
            `INV-${second ? '052' : '042'}`,
            'Term tuition · due 30 September',
            data.metrics[2].value,
            'Pending',
            'Contact the school accounts office to arrange payment.',
          ],
          [
            'REC-1028',
            'Tuition payment · 10 September',
            'GH₵ 600',
            'Paid',
            'Payment method: MoMo. This is a sample receipt.',
          ],
        ],
      );
      data.panels.reports = panel(
        'Results & progress',
        `${name} · ${classroom}`,
        ['Subject', 'Previous term', 'This term'],
        ['English', 'Mathematics', 'Science'].map((subject, i) => [
          subject,
          `${[78, 75, 84][i] - (second ? 8 : 0)}%`,
          `${[86, 82, 90][i] - (second ? 8 : 0)}%`,
          'Published',
          'Teacher comment: Consistent progress; keep up daily revision.',
        ]),
      );
      data.panels.attendance = panel(
        'Attendance history',
        `${name} · ${classroom}`,
        ['Date', 'Class', 'Arrival'],
        [
          ['21 September 2026', classroom, '07:35', 'Present', 'Morning register.'],
          ['18 September 2026', classroom, '07:42', 'Present', 'Morning register.'],
          ['17 September 2026', classroom, '—', 'Absent', 'Excused · family appointment.'],
        ],
      );
      data.panels.communication = panel(
        'Messages from school',
        'Announcements and conversations for your family.',
        ['Message', 'From', 'Date'],
        [
          [
            'PTA meeting · 26 September',
            'School office',
            '18 September',
            'Unread',
            'Please join us at 10:00 in the assembly hall.',
          ],
          [
            'Reading practice',
            'Class teacher',
            '17 September',
            'Unread',
            'Please support 20 minutes of reading at home each day.',
          ],
        ],
        'Compose message',
      );
      data.panels.schedule = panel(
        'Child’s timetable',
        `${name} · ${classroom}`,
        ['Subject', 'Day · time', 'Room'],
        [
          ['Mathematics', 'Monday · 08:00', classroom, 'Lesson', 'Fractions'],
          ['English', 'Tuesday · 10:00', classroom, 'Lesson', 'Reading'],
        ],
      );
      if (second)
        data.bars = data.bars.map((b) => ({
          ...b,
          value: b.value - 8,
          secondary: b.secondary - 8,
        }));
    }
    data.priorities = roleConfig[role].featured
      .flatMap((area) => {
        const p = data.panels[area];
        return p ? [{ title: p.title, detail: p.description, area }] : [];
      })
      .slice(0, 3);
    if (termId === '2025-3') {
      // Archived fixture deliberately contains no current-term records or writable actions.
      data.metrics = [
        { label: 'Period', value: 'Term 3', detail: '2025/26 · Archived' },
        {
          label: 'Data availability',
          value: 'Archive',
          detail: 'Sample historical records not loaded',
        },
      ];
      data.bars = data.bars.map((b) => ({
        ...b,
        value: b.secondary,
        secondary: Math.max(0, b.secondary - 7),
      }));
      data.chartLegend = ['Archived term', 'Previous term'];
      Object.values(data.panels).forEach((p) => {
        p.rows = [];
        p.action = undefined;
      });
      data.priorities = [];
    }
    return data;
  },
};
