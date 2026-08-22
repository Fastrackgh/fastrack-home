export interface SchoolModule {
  id: string;
  title: string;
  shortTitle: string;
  badge: string;
  headline: string;
  description: string;
  iconName: string;
  features: string[];
  metricLabel: string;
  metricValue: string;
  previewDetails: {
    label: string;
    sublabel: string;
    status: string;
  }[];
}

export const schoolModules: SchoolModule[] = [
  {
    id: 'admissions',
    title: 'Admissions & Student Biodata',
    shortTitle: 'Admissions',
    badge: 'Core Foundation',
    headline: 'Seamless Digital Enrollment & Complete Student Lifecycles',
    description:
      'Digitize the entire enrollment journey from initial inquiry to graduation. Maintain comprehensive student profiles with medical records, emergency contacts, academic history, and digitized documents in one secure cloud repository.',
    iconName: 'UserCheck',
    features: [
      'Online application & admission processing portal',
      'Class allocation, section assignment & roll numbers',
      'Guardian & emergency contact profiling with photo capture',
      'Instant student ID card generator with QR codes',
    ],
    metricLabel: 'Admissions Processed',
    metricValue: '100% Paperless',
    previewDetails: [
      { label: 'New Enrollees (Term 3)', sublabel: 'Class 1 to SHS 3', status: 'Completed' },
      { label: 'Document Verification', sublabel: 'BECE & Health Records', status: 'Verified' },
      { label: 'Digital Student ID', sublabel: 'Auto QR code generated', status: 'Active' },
    ],
  },
  {
    id: 'academics',
    title: 'Academic Grading & Terminal Reports',
    shortTitle: 'Grading Engine',
    badge: 'Automated Scoring',
    headline: 'Effortless Continuous Assessment & Instant Report Cards',
    description:
      'Eliminate manual grade calculation errors. Teachers record continuous assessment scores (class tests, assignments, projects, exams) while Fastrack EduSuite automatically computes GPAs, class positions, remarks, and generates printable terminal report cards.',
    iconName: 'GraduationCap',
    features: [
      'Customizable grading scales (GES, Cambridge, IB, WASSCE)',
      'Automated terminal report sheet generation with one-click export',
      'Subject teacher comment banks and headmaster remarks',
      'Historical performance analytics and class subject rankings',
    ],
    metricLabel: 'Report Card Generation',
    metricValue: '10x Faster',
    previewDetails: [
      { label: 'Terminal Exams Computed', sublabel: 'All JHS & Primary classes', status: '99.4%' },
      { label: 'GPA Calculation', sublabel: 'Instant cumulative average', status: 'Ready' },
      { label: 'Parent PDF Reports', sublabel: 'Encrypted digital distribution', status: 'Sent' },
    ],
  },
  {
    id: 'fees',
    title: 'Tuition Fees & Financial Auditing',
    shortTitle: 'Fee Management',
    badge: 'Mobile Money Ready',
    headline: 'Zero-Leakage Fee Collection with Instant Reconciliation',
    description:
      'Manage school fee structures, discounts, scholarships, and installment plans with absolute transparency. Integrated with MTN MoMo, Vodafone Cash, AirtelTigo, and bank APIs for instant receipting and automated reconciliation.',
    iconName: 'CreditCard',
    features: [
      'Automated fee invoicing by class, boarder/day status, and bus route',
      'Direct Mobile Money (MoMo) and bank payment integrations',
      'Automated SMS payment receipts and outstanding balance alerts',
      'Internal audit reports, defalcation protection, and daily cashbook',
    ],
    metricLabel: 'Fee Collection Rate',
    metricValue: '96.8% On-Time',
    previewDetails: [
      { label: 'MoMo Direct Collection', sublabel: 'MTN & Telecel Gateways', status: 'Reconciled' },
      { label: 'Outstanding Balance SMS', sublabel: 'Automated gentle reminders', status: 'Scheduled' },
      { label: 'Audited Cashbook', sublabel: 'Zero-discrepancy daily logs', status: 'Balanced' },
    ],
  },
  {
    id: 'sms',
    title: 'Integrated Bulk SMS & Parent Portal',
    shortTitle: 'Bulk SMS',
    badge: 'Instant Delivery',
    headline: 'Direct, Real-Time Communication with Every Parent',
    description:
      'Keep parents actively involved with automated transactional notifications for daily attendance, emergency school announcements, fee reminders, PTA meetings, and homework updates via high-throughput Bulk SMS.',
    iconName: 'MessageSquare',
    features: [
      'Automated morning attendance SMS when student scans ID or is marked',
      'Custom sender ID (e.g. YOUR_SCHOOL_NAME) for maximum trust',
      'Personalized broadcast filters (by class, house, fee status, club)',
      'Parent mobile portal for checking report cards and fee history',
    ],
    metricLabel: 'SMS Open Rate',
    metricValue: '98.5%',
    previewDetails: [
      { label: 'Morning Attendance Alert', sublabel: 'Delivered to 1,420 parents', status: 'Delivered' },
      { label: 'PTA Meeting Notice', sublabel: 'Custom Sender ID: FASTRACK', status: 'Broadcast' },
      { label: 'Term Fee Due Notice', sublabel: 'Targeted to debtors list', status: 'Instant' },
    ],
  },
  {
    id: 'mobile-portals',
    title: 'Anywhere, Anytime Mobile Portals',
    shortTitle: 'Mobile ERP',
    badge: 'Cloud Powered',
    headline: 'Complete School Mobility on Smartphone, Tablet, or PC',
    description:
      'Empower headmasters, teachers, accountants, and parents to access real-time school information anywhere. Teachers take attendance and enter grades on their phones, while administrators monitor operations on the go.',
    iconName: 'Smartphone',
    features: [
      'Responsive cloud web app + native Android/iOS mobile interfaces',
      'Role-based security: Headmaster, Teacher, Bursar, Parent, Student',
      'Offline-capable attendance marking with automatic cloud sync',
      'Live dashboard KPIs for school owners and board members',
    ],
    metricLabel: 'Mobile Uptime',
    metricValue: '99.9%',
    previewDetails: [
      { label: 'Teacher Mobile App', sublabel: 'One-tap attendance & grades', status: 'Online' },
      { label: 'Parent Pocket Portal', sublabel: 'View grades & pay fees 24/7', status: 'Connected' },
      { label: 'Executive Dashboard', sublabel: 'Real-time revenue & enrollment', status: 'Live' },
    ],
  },
  {
    id: 'staff-payroll',
    title: 'Staff Payroll, HR & Multi-Branch Governance',
    shortTitle: 'Payroll & HR',
    badge: 'GRA & SSNIT Ready',
    headline: 'Automated Staff Compensation, SSNIT Tier Deductions & Branch Oversight',
    description:
      'Streamline educator compensation, automatic GRA PAYE and SSNIT statutory deductions, staff leave workflows, teacher attendance, and multi-campus administrative synchronization in one unified ledger.',
    iconName: 'Building2',
    features: [
      'Automated salary schedules with GRA PAYE and SSNIT Tier 1 & 2 computation',
      'Digital staff bio-profiles, contract tracking, and qualification records',
      'Leave management, duty rosters, and teacher attendance tracking',
      'Multi-campus consolidation for schools operating multiple branches',
    ],
    metricLabel: 'Payroll Automation',
    metricValue: '100% Error-Free',
    previewDetails: [
      { label: 'GRA PAYE Calculator', sublabel: 'Automated monthly tax schedules', status: 'Active' },
      { label: 'SSNIT Tier 1 & 2', sublabel: 'Statutory compliance exports', status: 'Ready' },
      { label: 'Multi-Campus Sync', sublabel: 'Consolidated executive view', status: 'Live' },
    ],
  },
];
