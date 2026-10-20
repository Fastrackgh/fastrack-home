'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ActionIcon, Avatar, Badge, Drawer, Group, Modal, Stack, Text } from '@mantine/core';
import {
  Archive,
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CreditCard,
  FileQuestion,
  GraduationCap,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  NotebookPen,
  SlidersHorizontal,
  UserPlus,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '@/components/atoms';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS, dataScopeOf } from '@/lib/rbac';
import { activeNavItem, workspaceNavigation, type NavItem } from './navigation';
import { useViewer } from './useViewer';
import styles from './AppShell.module.css';

const icons: Record<NavItem['id'], typeof Users> = {
  overview: LayoutDashboard,
  finance: Wallet,
  debts: CreditCard,
  budgets: ClipboardList,
  plans: CalendarClock,
  enrollment: Users,
  admissions: UserPlus,
  enquiries: Inbox,
  staffing: BriefcaseBusiness,
  performance: GraduationCap,
  faculty: Users,
  attendance: CheckCheck,
  reports: BookOpen,
  communication: MessageSquare,
  gradebook: NotebookPen,
  grading: SlidersHorizontal,
  schedule: CalendarDays,
  children: Baby,
  meals: Utensils,
  gallery: Images,
  calendar: CalendarRange,
  archive: Archive,
  questions: FileQuestion,
};

/** The school's current academic year and term, when the school has them set. */
function useAcademicSession(schoolId: string | null) {
  const [session, setSession] = useState<{
    year: string;
    term: string;
  } | null>(null);
  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    Promise.allSettled([
      apiClient.get<{ yearLabel: string }>('/schools/me/academic-years/current'),
      apiClient.get<{ termLabel: string }>('/schools/me/academic-terms/current'),
    ]).then(([year, term]) => {
      if (!active) return;
      const yearLabel = year.status === 'fulfilled' ? year.value.data?.yearLabel : undefined;
      const termLabel = term.status === 'fulfilled' ? term.value.data?.termLabel : undefined;
      setSession(yearLabel && termLabel ? { year: yearLabel, term: termLabel } : null);
    });
    return () => {
      active = false;
    };
  }, [schoolId]);
  return session;
}

/**
 * The frame around every school page: the role's navigation, the signed-in
 * user and their school. Rendered once by the school layout, so moving
 * between the overview, preview areas and live pages keeps one skeleton.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, school, logout } = useAuth();
  const viewer = useViewer();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [help, setHelp] = useState(false);
  const session = useAcademicSession(viewer?.schoolId ?? null);

  // Close the mobile drawer once a link has navigated.
  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  if (!user || !viewer) return null;
  const items = workspaceNavigation(viewer);
  const active = activeNavItem(items, pathname);
  const [overview, ...areas] = items;
  const initials = `${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`.toUpperCase();

  const link = (item: NavItem) => {
    const Icon = icons[item.id];
    const current = item === active;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.navItem} ${current ? styles.active : ''}`}
        aria-current={current ? 'page' : undefined}
      >
        <Icon size={17} />
        {item.label}
      </Link>
    );
  };
  const nav = (
    <>
      <div className={styles.school}>
        <div className={styles.schoolIcon}>
          <Building2 size={20} />
        </div>
        <div>
          <Text size="xs" fw={700}>
            {school?.name ?? 'Your school'}
          </Text>
          {school && (
            <Text size="10px" c="dimmed">
              {[school.address, school.code].filter(Boolean).join(' · ')}
            </Text>
          )}
        </div>
      </div>
      <nav className={styles.nav} aria-label="Workspace navigation">
        <div className={styles.eyebrow}>Workspace</div>
        {link(overview)}
        {areas.length > 0 && (
          <div className={styles.eyebrow}>
            {dataScopeOf(viewer.role) === 'own_children' ? 'My family' : 'Management'}
          </div>
        )}
        {areas.map(link)}
      </nav>
      <div className={styles.sidebarFoot}>
        <button className={styles.navItem} onClick={() => setHelp(true)}>
          <CircleHelp size={17} />
          Workspace guide
        </button>
        <Text size="10px" c="dimmed">
          FASTRACK MANAGEMENT SERVICES
        </Text>
        <Text size="10px" c="dimmed" mt={4}>
          School management, made simpler.
        </Text>
      </div>
    </>
  );

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <BrandLogo size="sm" />
        </div>
        {nav}
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              color="gray"
              className={styles.mobileMenu}
              aria-label="Open navigation"
              onClick={() => setDrawer(true)}
            >
              <Menu size={21} />
            </ActionIcon>
            <Text size="sm" c="dimmed">
              Workspace
            </Text>
            <ChevronRight size={13} color="#a8b0ba" />
            <Text size="sm" fw={600}>
              {active?.label}
            </Text>
          </Group>
          <Group gap="md">
            {session && (
              <Badge
                variant="light"
                color="blue"
                radius="md"
                size="sm"
                tt="none"
                className={styles.desktopOnly}
              >
                {session.year} · {session.term}
              </Badge>
            )}
            <Avatar radius="xl" size={34} color="red">
              {initials}
            </Avatar>
            <div className={styles.desktopOnly}>
              <Text size="xs" fw={700}>
                {user.firstName} {user.lastName}
              </Text>
              <Text size="10px" c="dimmed">
                {ROLE_LABELS[viewer.role]}
              </Text>
            </div>
            <ActionIcon variant="subtle" color="gray" aria-label="Sign out" onClick={logout}>
              <LogOut size={17} />
            </ActionIcon>
          </Group>
        </header>
        <main className={styles.content}>
          {children}
          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} Fastrack Management Services</span>
            <span>Ghana cedi (GH₵) · Africa/Accra</span>
          </footer>
        </main>
      </div>
      <Drawer
        opened={drawer}
        onClose={() => setDrawer(false)}
        title={<BrandLogo size="sm" />}
        size={280}
      >
        {nav}
      </Drawer>
      <Modal opened={help} onClose={() => setHelp(false)} title="Your workspace guide" centered>
        <Stack>
          <Text size="sm">
            Navigation and actions follow your role’s responsibilities. You only see the sections
            and buttons your role is allowed to use.
          </Text>
          <Text size="sm">
            Pages without a “UI preview” banner show your school’s live records.
          </Text>
          <Text size="sm">
            Sections marked “UI preview” use sample data. Their forms save temporary drafts that
            clear when you switch child or term, or reload. No payments, invitations, messages or
            uploads are sent.
          </Text>
        </Stack>
      </Modal>
    </div>
  );
}
