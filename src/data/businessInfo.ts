export interface CorporateService {
  id: string;
  title: string;
  shortDesc: string;
  coreObjective: string;
  iconName: string;
  bulletPoints: string[];
  badge: string;
}

export interface BusinessInfo {
  name: string;
  shortName: string;
  tagline: string;
  foundedYear: number;
  location: string;
  digitalAddress: string;
  poBox: string;
  phone: string;
  phoneRaw: string;
  email: string;
  about: string;
  mission: string;
  vision: string;
  values: string[];
  benefits: {
    title: string;
    description: string;
  }[];
  services: CorporateService[];
  infrastructure: {
    title: string;
    subtitle: string;
    description: string;
    complianceBadge: string;
    pillars: {
      title: string;
      desc: string;
      badge: string;
    }[];
    supportHighlight: string;
  };
  stats: {
    value: string;
    label: string;
    sublabel: string;
  }[];
}

export const businessInfo: BusinessInfo = {
  name: 'Fastrack Management Services',
  shortName: 'Fastrack',
  tagline: 'Simple, Reliable & Trusted Software Solutions for Education & Enterprise',
  foundedYear: 2014,
  location: 'Mallam – Accra, Ghana',
  digitalAddress: 'GS-102-212-1555 Accra',
  poBox: 'P.O. Box 742 Mallam – Accra, Ghana',
  phone: '0243-630-648',
  phoneRaw: '+233243630648',
  email: 'fastrackus@gmail.com',
  about:
    'Since 2014, Fastrack Management Services has been transforming how organizations operate, leveraging cutting-edge technology to help you work smarter, accomplish more, and eliminate workplace stress. Based in Accra, the capital city of Ghana, we are a leading ICT consultancy dedicated to delivering high-impact, affordable, and value-driven technology solutions tailored to your unique operational needs.',
  mission:
    'To be the preferred Software Providers: providing simple, reliable, and trusted solutions to clients.',
  vision:
    'To be the trusted Software Providers in Ghana and beyond.',
  values: ['Excellence', 'Integrity', 'Innovation', 'Teamwork'],
  stats: [
    {
      value: '10+',
      label: 'Years of Excellence',
      sublabel: 'Transforming Ghanaian institutions since 2014',
    },
    {
      value: '99.9%',
      label: 'Platform Reliability',
      sublabel: 'High data availability & continuous monitoring',
    },
    {
      value: 'Instant',
      label: 'Bulk SMS Delivery',
      sublabel: 'High-throughput carrier grade gateway',
    },
    {
      value: '256-Bit',
      label: 'Bank-Grade Security',
      sublabel: 'Encrypted cloud storage with automated daily backups',
    },
  ],
  benefits: [
    {
      title: 'Anywhere, Anytime Access with Mobile',
      description:
        'Fastrack ERP empowers you to work seamlessly on your mobile phone and tablet so you can access your school, business, and operational data in real time while you’re on the go.',
    },
    {
      title: 'Actionable Business Insights',
      description:
        'You want more than just raw data; you need actionable insights. Fastrack Cloud ERP includes hundreds of standard financial and operational reports customizable to your institution, including interactive Dashboards, Pivot tables, and Advanced Reporting Tools.',
    },
    {
      title: 'Business Intelligence (BI) Engine',
      description:
        'Business Intelligence goes beyond simple reporting to help you spot attendance and fee payment trends, identify operational inefficiencies, and make data-driven administrative decisions.',
    },
  ],
  services: [
    {
      id: 'it-consultancy',
      title: 'IT Consultancy Services',
      shortDesc: 'Technology strategy, IT roadmaps, and digital transformation.',
      coreObjective:
        'Aligns IT investments with organizational growth while reducing operational downtime and security risks.',
      iconName: 'ShieldCheck',
      badge: 'Strategic',
      bulletPoints: [
        'Technology strategy and IT roadmap planning',
        'Infrastructure audits and system integrations',
        'Digital transformation and cloud adoption guidance',
      ],
    },
    {
      id: 'database-management',
      title: 'Database Management Services',
      shortDesc: 'Relational database design, disaster recovery, and query tuning.',
      coreObjective:
        'Ensures high data availability, protects critical business assets, and optimizes system performance.',
      iconName: 'Database',
      badge: 'High Security',
      bulletPoints: [
        'Relational database design, installation, and optimization',
        'Data backup, disaster recovery, and continuous monitoring',
        'Query tuning, data migration, and access control',
      ],
    },
    {
      id: 'software-engineering',
      title: 'Software Engineering',
      shortDesc: 'Custom software, web applications, and modern API architectures.',
      coreObjective:
        'Delivers tailored, scalable software solutions that automate workflows and address specific operational bottlenecks.',
      iconName: 'Code',
      badge: 'Custom Built',
      bulletPoints: [
        'Custom software, web application, and API development',
        'Agile software development lifecycle (SDLC)',
        'Legacy system modernization and maintenance',
      ],
    },
    {
      id: 'mobile-apps',
      title: 'Mobile Apps Development',
      shortDesc: 'Cross-platform iOS & Android mobile apps for on-the-go access.',
      coreObjective:
        'Extends customer engagement, enhances brand accessibility, and supports workforce mobility on the go.',
      iconName: 'Smartphone',
      badge: 'iOS & Android',
      bulletPoints: [
        'Cross-platform (iOS & Android) mobile development',
        'Native mobile app architecture and UX/UI design',
        'Secure mobile backend integrations and ongoing app support',
      ],
    },
    {
      id: 'bulk-sms',
      title: 'Bulk SMS Services',
      shortDesc: 'Automated transactional notifications and high-throughput messaging.',
      coreObjective:
        'Provides direct, immediate customer and parent communication with high delivery and open rates.',
      iconName: 'MessageSquare',
      badge: 'High Speed',
      bulletPoints: [
        'Automated transactional notifications and alerts',
        'High-throughput promotional SMS campaign tools',
        'API integrations for two-factor authentication (2FA)',
      ],
    },
    {
      id: 'accounting-auditing',
      title: 'Accounting & Auditing Services',
      shortDesc: 'Full-scope bookkeeping, financial reporting, and risk audits.',
      coreObjective:
        'Guarantees regulatory compliance, safeguards against financial risk, and provides clear visibility into business performance.',
      iconName: 'Calculator',
      badge: 'Compliance',
      bulletPoints: [
        'Full-scope bookkeeping, financial reporting, and payroll',
        'Internal operational and financial risk audits',
        'Statutory audit support and tax compliance assistance',
      ],
    },
  ],
  infrastructure: {
    title: 'Enterprise Cloud & Data Security Architecture',
    subtitle: 'Institutional Security & Reliability',
    description:
      'Engineered specifically for Ghanaian educational institutions and corporate enterprises. Fastrack delivers bank-grade 256-bit encryption, automated daily off-site cloud backups, role-based staff access controls, and GES curriculum compliance so your institution operates without interruption.',
    complianceBadge: 'Data Protection Act 2012 (Act 843) Compliant',
    pillars: [
      {
        title: 'Bank-Grade Data Encryption',
        desc: 'End-to-end 256-bit SSL encryption across all student records, fee transactions, and staff data.',
        badge: '256-Bit SSL',
      },
      {
        title: 'Automated Daily Cloud Backups',
        desc: 'Multi-region snapshot redundancy ensuring instant disaster recovery and zero data loss.',
        badge: 'Zero Data Loss',
      },
      {
        title: 'Ghana GES & Cambridge Scale Aligned',
        desc: 'Built-in grading algorithms pre-configured for GES National Curriculum, WAEC, Cambridge, and IB frameworks.',
        badge: 'GES Aligned',
      },
      {
        title: 'Granular Role-Based Access Control',
        desc: 'Strict permission boundaries separating Proprietors, Headmasters, Accountants, Teachers, and Parents.',
        badge: 'RBAC Security',
      },
    ],
    supportHighlight:
      'Dedicated Accra-based technical team providing onsite staff onboarding, zero-downtime spreadsheet migration, and direct WhatsApp hotline support.',
  },
};
