'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Card,
  Divider,
  Drawer,
  Grid,
  Group,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarClock,
  CreditCard,
  LayoutGrid,
  Megaphone,
  ReceiptText,
  Search,
  Settings,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '@/components/atoms';

const sidebarSections = [
  {
    heading: 'Main',
    items: [
      { label: 'Overview', icon: LayoutGrid, active: true },
      { label: 'Students', icon: Users },
      { label: 'Attendance', icon: UserCheck },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Fees & Billing', icon: CreditCard },
      { label: 'Academics', icon: BookOpen },
      { label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    heading: 'System',
    items: [{ label: 'Settings', icon: Settings }],
  },
];

const metrics = [
  {
    title: 'Total Students',
    value: '1,447',
    trend: '+4.2%',
    up: true,
    icon: Users,
    color: '#2563eb',
    tint: 'rgba(37, 99, 235, 0.1)',
  },
  {
    title: 'Fee Collection',
    value: 'GHS 824k',
    trend: '+11.8%',
    up: true,
    icon: Wallet,
    color: '#16a34a',
    tint: 'rgba(22, 163, 74, 0.1)',
  },
  {
    title: 'Attendance Today',
    value: '97.9%',
    trend: '+1.1%',
    up: true,
    icon: UserCheck,
    color: '#0d9488',
    tint: 'rgba(13, 148, 136, 0.1)',
  },
  {
    title: 'Pending Approvals',
    value: '18',
    trend: '-2',
    up: false,
    icon: ReceiptText,
    color: '#ea580c',
    tint: 'rgba(234, 88, 12, 0.1)',
  },
];

const feeRows = [
  { grade: 'JHS 1', paid: '312', pending: '14', total: '326', completion: 96 },
  { grade: 'JHS 2', paid: '294', pending: '21', total: '315', completion: 93 },
  { grade: 'SHS 1', paid: '251', pending: '33', total: '284', completion: 88 },
  { grade: 'SHS 2', paid: '233', pending: '24', total: '257', completion: 91 },
];

const schedule = [
  { time: '09:30', title: 'PTA Briefing', place: 'Conference Room A', color: '#e01a2b' },
  { time: '12:00', title: 'Staff Payroll Review', place: 'Finance Office', color: '#2563eb' },
  { time: '15:30', title: 'Mock Exam Checkpoint', place: 'Academic Board', color: '#16a34a' },
];

function SidebarContent() {
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
                return (
                  <UnstyledButton
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: 10,
                      padding: '9px 12px',
                      background: item.active ? '#fff0f2' : 'transparent',
                      color: item.active ? '#0f172a' : '#475569',
                      fontWeight: item.active ? 700 : 500,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <Icon size={17} color={item.active ? '#e01a2b' : '#94a3b8'} />
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
          Academic Week 4
        </Badge>
        <Text fw={700} size="sm">
          Mid-term reports due
        </Text>
        <Text size="xs" c="#94a3b8" mb="sm">
          3 days remaining to finalize.
        </Text>
        <Button size="xs" radius="md" color="fastrackRed" fullWidth>
          Open Planner
        </Button>
      </Paper>
    </Stack>
  );
}

export default function SchoolAdminDashboardPage() {
  const [opened, { toggle, close }] = useDisclosure(false);

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
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" aria-label="Toggle sidebar" />
            <BrandLogo size="sm" />
          </Group>

          <Group gap="sm">
            <TextInput
              placeholder="Search students, invoices, classes…"
              leftSection={<Search size={15} />}
              visibleFrom="sm"
              radius="md"
              w={300}
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
                AA
              </Avatar>
              <Box>
                <Text size="sm" fw={700} lh={1.1}>
                  Ama Adjei
                </Text>
                <Text size="xs" c="dimmed" lh={1.1}>
                  Administrator
                </Text>
              </Box>
            </Group>
            <Button
              component={Link}
              href="/school-admin/login"
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
            <SidebarContent />
          </Paper>
        </Grid.Col>

        {/* Main */}
        <Grid.Col span={{ base: 12, md: 9, lg: 9.6 }} p={{ base: 'md', md: 'lg' }}>
          <Stack gap="lg">
            {/* Greeting */}
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Box>
                <Text size="sm" c="dimmed">
                  Monday, 8 September 2026
                </Text>
                <Title order={2} style={{ fontFamily: 'var(--font-heading)' }}>
                  Good morning, Ama 👋
                </Title>
                <Text size="sm" c="dimmed" mt={2}>
                  Here&apos;s what&apos;s happening across your school today.
                </Text>
              </Box>
              <Group gap="xs">
                <Button variant="default" radius="md" leftSection={<CalendarClock size={15} />}>
                  This Term
                </Button>
                <Button
                  radius="md"
                  color="fastrackRed"
                  leftSection={<Megaphone size={15} />}
                >
                  New Broadcast
                </Button>
              </Group>
            </Group>

            {/* Metrics */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {metrics.map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <motion.div
                    key={metric.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                  >
                    <Card
                      radius="lg"
                      p="lg"
                      withBorder
                      style={{ borderColor: '#e8edf3', height: '100%' }}
                    >
                      <Group justify="space-between" align="flex-start">
                        <Box
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: metric.tint,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={20} color={metric.color} />
                        </Box>
                        <Badge
                          variant="light"
                          color={metric.up ? 'green' : 'orange'}
                          radius="sm"
                          leftSection={
                            metric.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />
                          }
                        >
                          {metric.trend}
                        </Badge>
                      </Group>
                      <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
                        {metric.value}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {metric.title}
                      </Text>
                    </Card>
                  </motion.div>
                );
              })}
            </SimpleGrid>

            <Grid gutter="md">
              {/* Fees table */}
              <Grid.Col span={{ base: 12, lg: 8 }}>
                <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
                  <Group justify="space-between" mb="md">
                    <div>
                      <Title order={4}>Fees Collection by Grade</Title>
                      <Text size="sm" c="dimmed">
                        Updated today at 08:45 GMT
                      </Text>
                    </div>
                    <Button size="xs" variant="light" color="gray" leftSection={<ReceiptText size={14} />}>
                      Export
                    </Button>
                  </Group>

                  <ScrollArea>
                    <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 460 }}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Grade</Table.Th>
                          <Table.Th>Paid</Table.Th>
                          <Table.Th>Pending</Table.Th>
                          <Table.Th>Total</Table.Th>
                          <Table.Th>Completion</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {feeRows.map((row) => (
                          <Table.Tr key={row.grade}>
                            <Table.Td>
                              <Text fw={600} size="sm">
                                {row.grade}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{row.paid}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={row.pending === '0' ? 'green' : 'orange'} variant="light" radius="sm">
                                {row.pending}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{row.total}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <Progress
                                  value={row.completion}
                                  w={110}
                                  radius="xl"
                                  color="fastrackRed"
                                />
                                <Text size="xs" fw={600}>
                                  {row.completion}%
                                </Text>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Card>
              </Grid.Col>

              {/* Right column */}
              <Grid.Col span={{ base: 12, lg: 4 }}>
                <Stack gap="md">
                  <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
                    <Group justify="space-between">
                      <div>
                        <Title order={5}>Collection Rate</Title>
                        <Text size="xs" c="dimmed">
                          Term target: 90%
                        </Text>
                      </div>
                      <RingProgress
                        size={78}
                        thickness={8}
                        roundCaps
                        sections={[{ value: 92, color: 'fastrackRed' }]}
                        label={
                          <Text ta="center" fw={800} size="sm">
                            92%
                          </Text>
                        }
                      />
                    </Group>
                  </Card>

                  <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
                    <Group justify="space-between" mb="sm">
                      <Title order={5}>Today&apos;s Schedule</Title>
                      <CalendarClock size={16} color="#94a3b8" />
                    </Group>
                    <Stack gap="sm">
                      {schedule.map((event) => (
                        <Group key={event.title} gap="sm" wrap="nowrap" align="flex-start">
                          <Box
                            style={{
                              width: 4,
                              alignSelf: 'stretch',
                              borderRadius: 4,
                              background: event.color,
                            }}
                          />
                          <Box style={{ flex: 1 }}>
                            <Group justify="space-between" gap={4}>
                              <Text fw={600} size="sm">
                                {event.title}
                              </Text>
                              <Text size="xs" c="dimmed" fw={600}>
                                {event.time}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {event.place}
                            </Text>
                          </Box>
                        </Group>
                      ))}
                    </Stack>
                  </Card>

                  <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
                    <Title order={5} mb={4}>
                      Broadcast Queue
                    </Title>
                    <Text size="sm" c="dimmed" mb="sm">
                      3 parent alerts waiting for approval.
                    </Text>
                    <Divider mb="sm" />
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        Fee Reminder SMS
                      </Text>
                      <Badge color="orange" variant="light" tt="none">
                        Pending
                      </Badge>
                    </Group>
                    <Button mt="md" fullWidth color="fastrackRed" radius="md" leftSection={<Megaphone size={14} />}>
                      Review Messages
                    </Button>
                  </Card>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Grid.Col>
      </Grid>

      <Drawer opened={opened} onClose={close} hiddenFrom="md" title="Navigation" padding="md" size="xs">
        <SidebarContent />
      </Drawer>
    </Box>
  );
}
