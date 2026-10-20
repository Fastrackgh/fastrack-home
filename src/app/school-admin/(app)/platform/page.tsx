'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Group,
  LoadingOverlay,
  Menu,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Layers,
  LogOut,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { ModuleEntitlement } from '@/features/platform-schools/model';

interface SchoolItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  studentsCount?: number;
  staffCount?: number;
}

interface PlatformAnalytics {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  totalSchools: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
  netOperatingCashflow: number;
  attendanceRate: number;
  staffStudentRatio: string;
}

interface PlatformModule {
  id: string;
  moduleKey: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
}

export default function PlatformConsolePage() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<string | null>('schools');
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [platformModules, setPlatformModules] = useState<PlatformModule[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Provision School Modal
  const [provisionOpened, { open: openProvision, close: closeProvision }] = useDisclosure(false);
  const [provisionSubmitting, setProvisionSubmitting] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolWebsite, setNewSchoolWebsite] = useState('');

  // Module Entitlements Drawer
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);
  const [schoolModules, setSchoolModules] = useState<ModuleEntitlement[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [togglingModuleId, setTogglingModuleId] = useState<string | null>(null);

  // Load Data
  const loadPlatformData = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolsRes, analyticsRes, modulesRes] = await Promise.allSettled([
        apiClient.get<SchoolItem[]>('/super-admin/schools?limit=50'),
        apiClient.get<PlatformAnalytics>('/super-admin/analytics/overview'),
        apiClient.get<PlatformModule[]>('/super-admin/modules?limit=50'),
      ]);

      if (schoolsRes.status === 'fulfilled' && schoolsRes.value.data) {
        setSchools(schoolsRes.value.data || []);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data) {
        setAnalytics(analyticsRes.value.data);
      }
      if (modulesRes.status === 'fulfilled' && modulesRes.value.data) {
        setPlatformModules(modulesRes.value.data || []);
      }
    } catch {
      notifications.show({
        color: 'red',
        title: 'Error Loading Data',
        message: 'Could not fetch platform administration data.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Access is enforced by the guarded app layout before this page renders.
  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // Open Modules Drawer
  const handleOpenModules = async (school: SchoolItem) => {
    setSelectedSchool(school);
    setDrawerLoading(true);
    openDrawer();
    try {
      const res = await apiClient.get<ModuleEntitlement[]>(
        `/super-admin/modules/schools/${school.id}`,
      );
      setSchoolModules(res.data || []);
    } catch {
      notifications.show({
        color: 'red',
        title: 'Failed to load modules',
        message: 'Could not fetch module entitlements for this school.',
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  // Toggle Module
  const handleToggleModule = async (moduleId: string, currentEnabled: boolean) => {
    if (!selectedSchool) return;
    const nextState = !currentEnabled;
    setTogglingModuleId(moduleId);

    // Optimistic update
    setSchoolModules((prev) =>
      prev.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled: nextState } : m)),
    );

    try {
      await apiClient.post(`/super-admin/modules/schools/${selectedSchool.id}/toggle`, {
        moduleId,
        isEnabled: nextState,
      });
      notifications.show({
        color: 'green',
        title: 'Module Entitlement Updated',
        message: `Module ${nextState ? 'enabled' : 'disabled'} for ${selectedSchool.name}.`,
      });
    } catch (err: unknown) {
      // Revert optimistic update
      setSchoolModules((prev) =>
        prev.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled: currentEnabled } : m)),
      );
      const msg = err instanceof Error ? err.message : 'Failed to update module entitlement';
      notifications.show({
        color: 'red',
        title: 'Update Failed',
        message: msg,
      });
    } finally {
      setTogglingModuleId(null);
    }
  };

  // Toggle School Activation
  const handleToggleSchoolStatus = async (school: SchoolItem) => {
    const action = school.isActive ? 'deactivate' : 'activate';
    try {
      await apiClient.patch(`/super-admin/schools/${school.id}/${action}`, {});
      notifications.show({
        color: 'green',
        title: `School ${school.isActive ? 'Deactivated' : 'Activated'}`,
        message: `${school.name} is now ${school.isActive ? 'inactive' : 'active'}.`,
      });
      loadPlatformData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      notifications.show({
        color: 'red',
        title: 'Error',
        message: msg,
      });
    }
  };

  // Provision School Submit
  const handleProvisionSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'School name is required.',
      });
      return;
    }

    setProvisionSubmitting(true);
    try {
      await apiClient.post('/super-admin/schools', {
        name: newSchoolName.trim(),
        code: newSchoolCode.trim() || undefined,
        address: newSchoolAddress.trim() || undefined,
        phone: newSchoolPhone.trim() || undefined,
        email: newSchoolEmail.trim() || undefined,
        website: newSchoolWebsite.trim() || undefined,
      });

      notifications.show({
        color: 'green',
        title: 'School Provisioned',
        message: `${newSchoolName} has been successfully created.`,
      });

      closeProvision();
      setNewSchoolName('');
      setNewSchoolCode('');
      setNewSchoolAddress('');
      setNewSchoolPhone('');
      setNewSchoolEmail('');
      setNewSchoolWebsite('');
      loadPlatformData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to provision school';
      notifications.show({
        color: 'red',
        title: 'Provisioning Failed',
        message: msg,
      });
    } finally {
      setProvisionSubmitting(false);
    }
  };

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ? true : statusFilter === 'ACTIVE' ? s.isActive : !s.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [schools, searchQuery, statusFilter]);

  return (
    <Box style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      {/* Platform Topbar */}
      <Box
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 10px 20px -18px rgba(15, 23, 42, 0.2)',
        }}
        px="xl"
        py="md"
      >
        <Group justify="space-between">
          <Group gap="md">
            <Group gap="xs">
              <ThemeIcon size={34} radius="md" color="red" variant="filled">
                <Building2 size={20} />
              </ThemeIcon>
              <div>
                <Group gap="xs">
                  <Text fw={800} size="md" c="white">
                    Fastrack
                  </Text>
                  <Badge color="red" variant="filled" size="sm">
                    Platform Super Admin
                  </Badge>
                </Group>
                <Text size="11px" c="dimmed">
                  Multi-Tenant Infrastructure Console
                </Text>
              </div>
            </Group>
          </Group>

          <Group gap="md">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={loadPlatformData}
              title="Refresh Platform Data"
            >
              <RefreshCw size={18} color="#94a3b8" />
            </ActionIcon>
            <Divider orientation="vertical" color="rgba(255,255,255,0.1)" />
            <Group gap="xs">
              <ThemeIcon radius="xl" size={32} color="red" variant="light">
                <ShieldCheck size={18} />
              </ThemeIcon>
              <div>
                <Text size="xs" fw={700} c="white">
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text size="10px" c="dimmed">
                  {user?.email}
                </Text>
              </div>
            </Group>
            <ActionIcon variant="subtle" color="red" size="lg" onClick={logout} title="Sign Out">
              <LogOut size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      <Container size="xl" mt="xl">
        {/* Header Title & Actions */}
        <Group justify="space-between" align="center" mb="lg">
          <div>
            <Title order={2} fw={800} style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
              Platform Overview & Tenants
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Provision school workspaces, control module entitlements, and inspect platform
              analytics.
            </Text>
          </div>
          <Group>
            <Button
              onClick={openProvision}
              leftSection={<Plus size={16} />}
              color="fastrackRed"
              radius="md"
              size="sm"
              style={{
                background: 'linear-gradient(135deg, #e01a2b 0%, #b31422 100%)',
                boxShadow: '0 4px 14px rgba(224, 26, 43, 0.35)',
              }}
            >
              Provision School Tenant
            </Button>
          </Group>
        </Group>

        {/* Analytics Stat Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
          <Card
            radius="md"
            padding="lg"
            withBorder
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <Group justify="space-between" align="start">
              <div>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Total Schools
                </Text>
                <Title order={3} fw={800} mt={6} style={{ color: '#0f172a' }}>
                  {analytics?.totalSchools ?? schools.length}
                </Title>
                <Text size="xs" c="teal" fw={600} mt={4}>
                  All provisioned tenants
                </Text>
              </div>
              <ThemeIcon size={44} radius="md" color="blue" variant="light">
                <Building2 size={24} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            radius="md"
            padding="lg"
            withBorder
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <Group justify="space-between" align="start">
              <div>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Active Students
                </Text>
                <Title order={3} fw={800} mt={6} style={{ color: '#0f172a' }}>
                  {analytics?.activeStudents ?? 0}
                </Title>
                <Text size="xs" c="dimmed" mt={4}>
                  Across all active schools
                </Text>
              </div>
              <ThemeIcon size={44} radius="md" color="teal" variant="light">
                <GraduationCap size={24} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            radius="md"
            padding="lg"
            withBorder
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <Group justify="space-between" align="start">
              <div>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Platform Invoiced
                </Text>
                <Title order={3} fw={800} mt={6} style={{ color: '#0f172a' }}>
                  GHS{' '}
                  {(analytics?.totalInvoiced ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </Title>
                <Text size="xs" c="teal" fw={600} mt={4}>
                  GHS{' '}
                  {(analytics?.totalCollected ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{' '}
                  collected ({analytics?.collectionRate ?? 0}%)
                </Text>
              </div>
              <ThemeIcon size={44} radius="md" color="violet" variant="light">
                <CreditCard size={24} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            radius="md"
            padding="lg"
            withBorder
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <Group justify="space-between" align="start">
              <div>
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Total Staff
                </Text>
                <Title order={3} fw={800} mt={6} style={{ color: '#0f172a' }}>
                  {analytics?.totalStaff ?? 0}
                </Title>
                <Text size="xs" c="dimmed" mt={4}>
                  Staff ratio: {analytics?.staffStudentRatio ?? '1:10'}
                </Text>
              </div>
              <ThemeIcon size={44} radius="md" color="orange" variant="light">
                <Users size={24} />
              </ThemeIcon>
            </Group>
          </Card>
        </SimpleGrid>

        {/* Main Content Tabs */}
        <Paper
          radius="md"
          withBorder
          style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
          p="lg"
        >
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="lg">
              <Tabs.Tab value="schools" leftSection={<Building2 size={16} />}>
                Tenant Schools ({filteredSchools.length})
              </Tabs.Tab>
              <Tabs.Tab value="modules" leftSection={<Layers size={16} />}>
                Platform Modules ({platformModules.length})
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB 1: TENANT SCHOOLS DIRECTORY */}
            <Tabs.Panel value="schools">
              <Stack gap="md">
                {/* Search & Filters */}
                <Group justify="space-between" align="center">
                  <TextInput
                    placeholder="Search schools by name, code, or email..."
                    leftSection={<Search size={16} color="#94a3b8" />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    style={{ flex: 1, maxWidth: 400 }}
                    radius="md"
                  />
                  <Group gap="xs">
                    {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
                      <Button
                        key={filter}
                        size="xs"
                        variant={statusFilter === filter ? 'filled' : 'subtle'}
                        color={statusFilter === filter ? 'dark' : 'gray'}
                        radius="md"
                        onClick={() => setStatusFilter(filter)}
                      >
                        {filter.charAt(0) + filter.slice(1).toLowerCase()}
                      </Button>
                    ))}
                  </Group>
                </Group>

                {/* Schools Table */}
                <Box pos="relative">
                  <LoadingOverlay visible={loading} />
                  <ScrollArea>
                    <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                      <Table.Thead style={{ background: '#f8fafc' }}>
                        <Table.Tr>
                          <Table.Th>School</Table.Th>
                          <Table.Th>Code</Table.Th>
                          <Table.Th>Contact</Table.Th>
                          <Table.Th>Created</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredSchools.length === 0 ? (
                          <Table.Tr>
                            <Table.Td
                              colSpan={6}
                              style={{ textAlign: 'center', padding: '40px 0' }}
                            >
                              <Text c="dimmed">No tenant schools match your criteria.</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          filteredSchools.map((school) => (
                            <Table.Tr key={school.id}>
                              <Table.Td>
                                <Group gap="sm">
                                  <ThemeIcon size={38} radius="md" color="red" variant="light">
                                    <Building2 size={20} />
                                  </ThemeIcon>
                                  <div>
                                    <Text fw={700} size="sm" style={{ color: '#0f172a' }}>
                                      {school.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {school.address || 'Address not specified'}
                                    </Text>
                                  </div>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="outline" color="gray" radius="sm">
                                  {school.code}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  {school.email && (
                                    <Group gap={4}>
                                      <Mail size={12} color="#94a3b8" />
                                      <Text size="xs" c="dimmed">
                                        {school.email}
                                      </Text>
                                    </Group>
                                  )}
                                  {school.phone && (
                                    <Group gap={4}>
                                      <Phone size={12} color="#94a3b8" />
                                      <Text size="xs" c="dimmed">
                                        {school.phone}
                                      </Text>
                                    </Group>
                                  )}
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Text size="xs" c="dimmed">
                                  {new Date(school.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={school.isActive ? 'teal' : 'gray'}
                                  variant="light"
                                  radius="sm"
                                >
                                  {school.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right' }}>
                                <Group gap="xs" justify="flex-end">
                                  <Button
                                    size="xs"
                                    variant="light"
                                    color="blue"
                                    leftSection={<Settings2 size={13} />}
                                    onClick={() => handleOpenModules(school)}
                                  >
                                    Modules
                                  </Button>
                                  <Button
                                    component={Link}
                                    href={`/school-admin/platform/schools/${school.id}`}
                                    size="xs"
                                    variant="subtle"
                                    color="gray"
                                    rightSection={<ExternalLink size={13} />}
                                  >
                                    Details
                                  </Button>
                                  <Menu position="bottom-end" shadow="md" width={180}>
                                    <Menu.Target>
                                      <ActionIcon variant="subtle" color="gray" size="sm">
                                        <MoreVertical size={16} />
                                      </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                      <Menu.Item
                                        onClick={() => handleToggleSchoolStatus(school)}
                                        color={school.isActive ? 'red' : 'green'}
                                        leftSection={
                                          school.isActive ? (
                                            <XCircle size={14} />
                                          ) : (
                                            <CheckCircle2 size={14} />
                                          )
                                        }
                                      >
                                        {school.isActive ? 'Deactivate School' : 'Activate School'}
                                      </Menu.Item>
                                    </Menu.Dropdown>
                                  </Menu>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Box>
              </Stack>
            </Tabs.Panel>

            {/* TAB 2: PLATFORM MODULES CATALOG */}
            <Tabs.Panel value="modules">
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  Global catalog of application modules provisioned across all school tenants.
                </Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {platformModules.map((mod) => (
                    <Card key={mod.id} radius="md" withBorder p="md">
                      <Group justify="space-between" align="start">
                        <Group gap="sm">
                          <ThemeIcon size={38} radius="md" color="red" variant="light">
                            <Layers size={18} />
                          </ThemeIcon>
                          <div>
                            <Group gap="xs">
                              <Text fw={700} size="sm">
                                {mod.name}
                              </Text>
                              {mod.isCore && (
                                <Badge size="xs" color="blue" variant="light">
                                  Core
                                </Badge>
                              )}
                            </Group>
                            <Text size="xs" c="dimmed" mt={2}>
                              Code: <code style={{ color: '#e01a2b' }}>{mod.moduleKey}</code> ·{' '}
                              {mod.category}
                            </Text>
                          </div>
                        </Group>
                      </Group>
                      <Text size="xs" c="dimmed" mt="sm">
                        {mod.description ||
                          'Enables operational workflows for this functional area.'}
                      </Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Container>

      {/* PROVISION SCHOOL MODAL */}
      <Modal
        opened={provisionOpened}
        onClose={closeProvision}
        title={
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="red" variant="light">
              <Building2 size={16} />
            </ThemeIcon>
            <Text fw={700} size="md">
              Provision New Tenant School
            </Text>
          </Group>
        }
        centered
        size="md"
        radius="md"
        closeOnClickOutside={false}
      >
        <form onSubmit={handleProvisionSchool}>
          <Stack gap="md">
            <TextInput
              label="School Name"
              placeholder="e.g. Morning Star International"
              required
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.currentTarget.value)}
            />
            <TextInput
              label="School Code (Optional)"
              placeholder="e.g. MSI-001 (auto-generated if empty)"
              value={newSchoolCode}
              onChange={(e) => setNewSchoolCode(e.currentTarget.value)}
            />
            <TextInput
              label="Contact Email"
              placeholder="admin@morningstar.edu.gh"
              type="email"
              value={newSchoolEmail}
              onChange={(e) => setNewSchoolEmail(e.currentTarget.value)}
            />
            <TextInput
              label="Phone Number"
              placeholder="+233 24 000 1122"
              value={newSchoolPhone}
              onChange={(e) => setNewSchoolPhone(e.currentTarget.value)}
            />
            <TextInput
              label="Physical Address / Campus"
              placeholder="10 Cantonments Road, Accra"
              value={newSchoolAddress}
              onChange={(e) => setNewSchoolAddress(e.currentTarget.value)}
            />
            <TextInput
              label="Website URL"
              placeholder="https://morningstar.edu.gh"
              value={newSchoolWebsite}
              onChange={(e) => setNewSchoolWebsite(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeProvision}>
                Cancel
              </Button>
              <Button
                type="submit"
                color="fastrackRed"
                loading={provisionSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #e01a2b 0%, #b31422 100%)',
                }}
              >
                Provision School
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* MODULE ENTITLEMENTS DRAWER */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size="md"
        title={
          <Group gap="xs">
            <ThemeIcon size={28} radius="md" color="blue" variant="light">
              <Settings2 size={16} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm">
                Module Entitlements
              </Text>
              <Text size="xs" c="dimmed">
                {selectedSchool?.name} ({selectedSchool?.code})
              </Text>
            </div>
          </Group>
        }
      >
        <Box pos="relative" pt="xs">
          <LoadingOverlay visible={drawerLoading} />
          <Text size="xs" c="dimmed" mb="md">
            Enable or disable platform feature modules for this school tenant. Changes take effect
            immediately.
          </Text>

          <Stack gap="sm">
            {schoolModules.map((item) => (
              <Card
                key={item.moduleId}
                radius="md"
                withBorder
                padding="sm"
                style={{
                  background: item.isEnabled ? '#f0fdf4' : '#ffffff',
                  borderColor: item.isEnabled ? '#bbf7d0' : '#e2e8f0',
                  transition: 'all 0.2s ease',
                }}
              >
                <Group justify="space-between" align="center">
                  <div>
                    <Group gap="xs">
                      <Text fw={700} size="sm" style={{ color: '#0f172a' }}>
                        {item.moduleName}
                      </Text>
                      <Badge size="xs" color={item.isEnabled ? 'teal' : 'gray'} variant="light">
                        {item.isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                      {item.description || item.moduleKey}
                    </Text>
                  </div>
                  <Switch
                    checked={item.isEnabled}
                    disabled={togglingModuleId === item.moduleId}
                    onChange={() => handleToggleModule(item.moduleId, item.isEnabled)}
                    color="teal"
                    size="md"
                  />
                </Group>
              </Card>
            ))}
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}
