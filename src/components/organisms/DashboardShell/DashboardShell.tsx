'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Card,
  Drawer,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  BookOpen,
  Bell,
  CalendarClock,
  CreditCard,
  LayoutGrid,
  Megaphone,
  Search,
  Settings,
  UserCheck,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/atoms';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export type SidebarKey =
  | 'overview'
  | 'students'
  | 'attendance'
  | 'fees'
  | 'academics'
  | 'announcements'
  | 'settings';

const sidebarSections: {
  heading: string;
  items: { label: string; key: SidebarKey; href: string; icon: typeof Users }[];
}[] = [
  {
    heading: 'Main',
    items: [
      { label: 'Overview', key: 'overview', href: '/school-admin/dashboard', icon: LayoutGrid },
      { label: 'Students', key: 'students', href: '/school-admin/students', icon: Users },
      { label: 'Attendance', key: 'attendance', href: '/school-admin/attendance', icon: UserCheck },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Fees & Billing', key: 'fees', href: '/school-admin/fees', icon: CreditCard },
      { label: 'Academics', key: 'academics', href: '/coming-soon?module=academics', icon: BookOpen },
      { label: 'Announcements', key: 'announcements', href: '/coming-soon?module=announcements', icon: Megaphone },
    ],
  },
  {
    heading: 'System',
    items: [
      { label: 'Settings', key: 'settings', href: '/coming-soon?module=settings', icon: Settings },
    ],
  },
];

function SidebarContent({
  active,
  academicInfo,
}: {
  active: SidebarKey;
  academicInfo?: { year: string; term: string } | null;
}) {
  return (
    <Stack justify="space-between" h="100%" gap="lg">
      <Stack gap="lg">
        {sidebarSections.map((section) => (
          <Box key={section.heading}>
            <Text
              size="10px"
              fw={700}
              c="dimmed"
              mb={8}
              pl={12}
              style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              {section.heading}
            </Text>
            <Stack gap={4}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === active;
                return (
                  <UnstyledButton
                    key={item.key}
                    component={Link}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: 10,
                      padding: '9px 12px',
                      background: isActive ? '#fff0f2' : 'transparent',
                      color: isActive ? '#0f172a' : '#475569',
                      fontWeight: isActive ? 700 : 500,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Icon size={17} color={isActive ? '#e01a2b' : '#94a3b8'} />
                    <Text size="sm" style={{ color: 'inherit' }}>
                      {item.label}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Paper
        radius="lg"
        p="md"
        style={{
          background: 'linear-gradient(160deg, #0b0f17 0%, #131a26 100%)',
          color: '#f8fafc',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <Badge size="xs" color="fastrackRed" variant="filled" radius="sm" mb={8} tt="none">
          {academicInfo ? `${academicInfo.term} • ${academicInfo.year}` : 'Active Session'}
        </Badge>
        <Text fw={700} size="sm">
          Academic Session Active
        </Text>
        <Text size="xs" c="#94a3b8" mb="sm">
          Enrollment & attendance in sync.
        </Text>
        <Button size="xs" radius="md" color="fastrackRed" fullWidth component={Link} href="/school-admin/students">
          Manage Students
        </Button>
      </Paper>
    </Stack>
  );
}

export function DashboardShell({
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  active: SidebarKey;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const { user, school, logout } = useAuth();
  const [academicInfo, setAcademicInfo] = useState<{ year: string; term: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAcademicCalendar() {
      try {
        const [yearRes, termRes] = await Promise.allSettled([
          apiClient.get<{ yearLabel: string }>('/schools/me/academic-years/current'),
          apiClient.get<{ termLabel: string }>('/schools/me/academic-terms/current'),
        ]);

        if (isMounted) {
          const year = yearRes.status === 'fulfilled' && yearRes.value?.data?.yearLabel ? yearRes.value.data.yearLabel : '2026/27';
          const term = termRes.status === 'fulfilled' && termRes.value?.data?.termLabel ? termRes.value.data.termLabel : 'Term 2';
          setAcademicInfo({ year, term });
        }
      } catch {
        // Fallback default
      }
    }
    loadAcademicCalendar();
    return () => {
      isMounted = false;
    };
  }, []);

  const fullName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : (user?.email || 'Ama Owusu');
  const roleName = (user?.role || 'Principal').replace(/_/g, ' ');
  const initials = `${user?.firstName?.[0] || 'A'}${user?.lastName?.[0] || 'O'}`.toUpperCase();

  return (
    <Box style={{ minHeight: '100vh', background: '#f6f8fb' }}>
      {/* Top bar */}
      <Box
        style={{
          borderBottom: '1px solid #e8edf3',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Group justify="space-between" px={{ base: 'md', md: 'xl' }} py="sm">
          <Group gap="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" aria-label="Toggle sidebar" />
            <BrandLogo size="sm" />
            {school?.name ? (
              <Box visibleFrom="sm" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 12 }}>
                <Text size="xs" fw={700} c="#0f172a" lh={1.1}>
                  {school.name}
                </Text>
                <Text size="10px" c="dimmed">
                  Code: {school.code}
                </Text>
              </Box>
            ) : null}
            {academicInfo ? (
              <Badge variant="light" color="blue" radius="md" size="sm" visibleFrom="md" tt="none">
                {academicInfo.year} • {academicInfo.term}
              </Badge>
            ) : null}
          </Group>

          <Group gap="sm">
            <TextInput
              placeholder="Search students, invoices, classes…"
              leftSection={<Search size={15} />}
              visibleFrom="sm"
              radius="md"
              w={260}
            />
            <ActionIcon variant="default" radius="md" size={38} pos="relative">
              <Bell size={17} />
              <Box
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#e01a2b',
                  border: '1.5px solid #fff',
                }}
              />
            </ActionIcon>
            <Group gap={8} visibleFrom="sm">
              <Avatar radius="xl" color="fastrackRed" size={36}>
                {initials}
              </Avatar>
              <Box>
                <Text size="sm" fw={700} lh={1.1}>
                  {fullName}
                </Text>
                <Text size="xs" c="dimmed" lh={1.1} tt="capitalize">
                  {roleName.toLowerCase()}
                </Text>
              </Box>
            </Group>
            <Button
              onClick={logout}
              variant="subtle"
              color="gray"
              size="sm"
            >
              Sign Out
            </Button>
          </Group>
        </Group>
      </Box>

      <Grid gutter={0}>
        {/* Sidebar */}
        <Grid.Col span={{ base: 12, md: 3, lg: 2.4 }} visibleFrom="md" p="lg">
          <Paper
            radius="lg"
            p="md"
            withBorder
            h="calc(100vh - 96px)"
            style={{ position: 'sticky', top: 88, borderColor: '#e8edf3' }}
          >
            <SidebarContent active={active} academicInfo={academicInfo} />
          </Paper>
        </Grid.Col>

        {/* Main */}
        <Grid.Col span={{ base: 12, md: 9, lg: 9.6 }} p={{ base: 'md', md: 'lg' }}>
          <Stack gap="lg">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Box>
                <Text size="sm" c="dimmed">
                  {pathname.startsWith('/school-admin') ? 'Academic Portal • Live Operations' : null}
                </Text>
                <Title order={2} style={{ fontFamily: 'var(--font-heading)' }}>
                  {title}
                </Title>
                {subtitle ? (
                  <Text size="sm" c="dimmed" mt={2}>
                    {subtitle}
                  </Text>
                ) : null}
              </Box>
              {actions ? <Group gap="xs">{actions}</Group> : null}
            </Group>
            {children}
          </Stack>
        </Grid.Col>
      </Grid>

      <Drawer opened={opened} onClose={close} hiddenFrom="md" title="Navigation" padding="md" size="xs">
        <SidebarContent active={active} academicInfo={academicInfo} />
      </Drawer>
    </Box>
  );
}
