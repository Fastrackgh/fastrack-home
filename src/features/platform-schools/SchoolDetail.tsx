'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Pagination,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  ArrowLeft,
  Building2,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  Power,
  School,
  Settings2,
  Users,
} from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { APP_ROUTES } from '@/lib/rbac';
import { platformSchoolsApi as api } from './api';
import type {
  ModuleEntitlement,
  PageMeta,
  PlatformSchool,
  PlatformStaff,
  PlatformStudent,
  SchoolProfileUpdate,
} from './model';
import styles from './SchoolDetail.module.css';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** One school as the platform sees it, loaded from the Super Admin API. */
export function PlatformSchoolDetail({ schoolId }: { schoolId: string }) {
  const [school, setSchool] = useState<PlatformSchool | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setSchool(await api.getSchool(schoolId));
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.statusCode === 404
          ? 'This school does not exist.'
          : errorMessage(e, 'Could not load this school.'),
      );
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async () => {
    if (!school) return;
    setStatusSaving(true);
    try {
      await api.setActive(school.id, !school.isActive);
      await load();
      notifications.show({
        color: 'teal',
        title: school.isActive ? 'School deactivated' : 'School activated',
        message: school.name,
      });
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Status update failed',
        message: errorMessage(e, 'Try again.'),
      });
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Button
          component={Link}
          href={APP_ROUTES.platform.path}
          variant="subtle"
          color="gray"
          leftSection={<ArrowLeft size={16} />}
        >
          Platform console
        </Button>
        <Badge color="violet" variant="light">
          Super Admin only
        </Badge>
      </div>

      {error ? (
        <Alert className={styles.section} color="red" title="Unable to open school">
          {error}
        </Alert>
      ) : !school ? (
        <Group className={styles.section} justify="center" py={80}>
          <Loader color="red" />
        </Group>
      ) : (
        <>
          <section className={styles.hero}>
            <div className={styles.schoolMark}>
              <School size={30} />
            </div>
            <div className={styles.heroCopy}>
              <Group gap="sm">
                <h1>{school.name}</h1>
                <Badge color={school.isActive ? 'teal' : 'red'} variant="light">
                  {school.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                {[school.code, school.address, `Joined ${formatDate(school.createdAt)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </div>
            <Group gap="sm">
              <Button
                variant="default"
                leftSection={<Power size={15} />}
                loading={statusSaving}
                onClick={toggleActive}
              >
                {school.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                color="fastrackRed"
                leftSection={<Edit3 size={15} />}
                onClick={() => setEditing(true)}
              >
                Edit school details
              </Button>
            </Group>
          </section>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" className={styles.section}>
            {[
              ['Students', school.studentsCount],
              ['Staff', school.staffCount],
              ['Enabled modules', school.enabledModules.length],
              [
                'Principal',
                school.schoolHead
                  ? `${school.schoolHead.firstName} ${school.schoolHead.lastName}`
                  : 'Not assigned',
              ],
            ].map(([label, value]) => (
              <Card withBorder radius="md" padding="md" key={label}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  {label}
                </Text>
                <Text size="xl" fw={800} mt={5}>
                  {value}
                </Text>
              </Card>
            ))}
          </SimpleGrid>

          <Tabs defaultValue="overview" className={styles.section} keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<Building2 size={14} />}>
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="students" leftSection={<Users size={14} />}>
                Students
              </Tabs.Tab>
              <Tabs.Tab value="staff" leftSection={<School size={14} />}>
                Staff
              </Tabs.Tab>
              <Tabs.Tab value="modules" leftSection={<Settings2 size={14} />}>
                Modules
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview" pt="lg">
              <OverviewTab school={school} />
            </Tabs.Panel>
            <Tabs.Panel value="students" pt="lg">
              <StudentsTab schoolId={school.id} />
            </Tabs.Panel>
            <Tabs.Panel value="staff" pt="lg">
              <StaffTab schoolId={school.id} />
            </Tabs.Panel>
            <Tabs.Panel value="modules" pt="lg">
              <ModulesTab schoolId={school.id} onChange={load} />
            </Tabs.Panel>
          </Tabs>

          {editing && (
            <ProfileEditor
              school={school}
              onClose={() => setEditing(false)}
              onSaved={async () => {
                setEditing(false);
                await load();
              }}
            />
          )}
        </>
      )}
    </main>
  );
}

function OverviewTab({ school }: { school: PlatformSchool }) {
  const head = school.schoolHead;
  const contact: [typeof Mail, string | null][] = [
    [Mail, school.email],
    [Phone, school.phone],
    [MapPin, school.address],
    [Globe, school.website],
  ];
  return (
    <div className={styles.overviewGrid}>
      <Card withBorder radius="md" padding="lg">
        <Text fw={800} mb="md">
          School profile
        </Text>
        <Stack gap="sm" className={styles.details}>
          {contact.map(([Icon, value], i) => (
            <span key={i}>
              <Icon size={15} />
              {value || 'Not provided'}
            </span>
          ))}
        </Stack>
      </Card>
      <Card withBorder radius="md" padding="lg">
        <Text fw={800} mb="md">
          Principal
        </Text>
        {head ? (
          <Group gap="sm">
            <Avatar color="red" radius="xl">
              {`${head.firstName[0] ?? ''}${head.lastName[0] ?? ''}`}
            </Avatar>
            <div>
              <Text fw={700} size="sm">
                {head.firstName} {head.lastName}
              </Text>
              <Text size="xs" c="dimmed">
                {head.email}
              </Text>
            </div>
          </Group>
        ) : (
          <Text c="dimmed" size="sm">
            Not assigned
          </Text>
        )}
      </Card>
    </div>
  );
}

function StudentsTab({ schoolId }: { schoolId: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<PlatformStudent[] | null>(null);
  const [meta, setMeta] = useState<PageMeta | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Debounce typing so each keystroke doesn't hit the API.
    const timer = setTimeout(() => {
      api
        .listStudents(schoolId, page, search)
        .then((res) => {
          if (!active) return;
          setRows(res.items);
          setMeta(res.meta);
          setError(null);
        })
        .catch((e) => active && setError(errorMessage(e, 'Could not load students.')));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [schoolId, page, search]);

  return (
    <RecordSection
      title="Students"
      count={meta ? `${meta.total} students` : undefined}
      action={
        <TextInput
          placeholder="Search students"
          aria-label="Search students"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
        />
      }
      error={error}
      loading={rows === null}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Guardian</th>
            <th>Admitted</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((s) => (
            <tr key={s.id}>
              <td>
                <Text fw={700} size="sm">
                  {s.fullName}
                </Text>
                <Text size="xs" c="dimmed">
                  {s.studentCode}
                </Text>
              </td>
              <td>{s.className ?? '—'}</td>
              <td>
                <Text size="sm">{s.guardianName ?? '—'}</Text>
                <Text size="xs" c="dimmed">
                  {s.guardianContact}
                </Text>
              </td>
              <td>{s.admissionDate ? formatDate(s.admissionDate) : '—'}</td>
              <td>
                <Badge color={s.status === 'Active' ? 'teal' : 'gray'} variant="light">
                  {s.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <EmptyRow text="No students found." />}
      {meta && meta.totalPages > 1 && (
        <Pagination mt="md" total={meta.totalPages} value={page} onChange={setPage} />
      )}
    </RecordSection>
  );
}

function StaffTab({ schoolId }: { schoolId: string }) {
  const [rows, setRows] = useState<PlatformStaff[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listStaff(schoolId)
      .then((staff) => active && setRows(staff))
      .catch((e) => active && setError(errorMessage(e, 'Could not load staff.')));
    return () => {
      active = false;
    };
  }, [schoolId]);

  return (
    <RecordSection
      title="Staff"
      count={rows ? `${rows.length} staff` : undefined}
      error={error}
      loading={rows === null && !error}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Position</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((p) => (
            <tr key={p.id}>
              <td>
                <Text fw={700} size="sm">
                  {p.firstName} {p.lastName}
                </Text>
              </td>
              <td>{p.role}</td>
              <td>{[p.position, p.department].filter(Boolean).join(' · ') || '—'}</td>
              <td>
                <Text size="sm">{p.email}</Text>
                <Text size="xs" c="dimmed">
                  {p.phone}
                </Text>
              </td>
              <td>
                <Badge color={p.isActive ? 'teal' : 'gray'} variant="light">
                  {p.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows?.length === 0 && <EmptyRow text="No staff accounts yet." />}
    </RecordSection>
  );
}

function ModulesTab({ schoolId, onChange }: { schoolId: string; onChange: () => void }) {
  const [modules, setModules] = useState<ModuleEntitlement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listModules(schoolId)
      .then((list) => active && setModules(list))
      .catch((e) => active && setError(errorMessage(e, 'Could not load modules.')));
    return () => {
      active = false;
    };
  }, [schoolId]);

  const toggle = async (module: ModuleEntitlement) => {
    const isEnabled = !module.isEnabled;
    setSaving(module.moduleId);
    try {
      await api.setModule(schoolId, module.moduleId, isEnabled);
      setModules(
        (list) =>
          list?.map((m) => (m.moduleId === module.moduleId ? { ...m, isEnabled } : m)) ?? null,
      );
      onChange();
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Module update failed',
        message: errorMessage(e, 'Try again.'),
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <RecordSection
      title="Modules"
      count={
        modules
          ? `${modules.filter((m) => m.isEnabled).length} of ${modules.length} enabled`
          : undefined
      }
      error={error}
      loading={modules === null && !error}
    >
      <Stack gap="md">
        {modules?.map((m) => (
          <Group justify="space-between" key={m.moduleId}>
            <div>
              <Text fw={700} size="sm">
                {m.moduleName}
              </Text>
              <Text size="xs" c="dimmed">
                {m.description}
              </Text>
            </div>
            <Switch
              checked={m.isEnabled}
              disabled={saving === m.moduleId}
              onChange={() => toggle(m)}
              aria-label={`Toggle ${m.moduleName}`}
            />
          </Group>
        ))}
      </Stack>
    </RecordSection>
  );
}

function ProfileEditor({
  school,
  onClose,
  onSaved,
}: {
  school: PlatformSchool;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<keyof SchoolProfileUpdate, string>>({
    name: school.name,
    code: school.code,
    address: school.address ?? '',
    phone: school.phone ?? '',
    email: school.email ?? '',
    website: school.website ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields: [keyof SchoolProfileUpdate, string][] = [
    ['name', 'School name'],
    ['code', 'School code'],
    ['email', 'School email'],
    ['phone', 'Phone'],
    ['address', 'Address'],
    ['website', 'Website'],
  ];

  const save = async () => {
    if (!draft.name.trim() || !draft.code.trim()) {
      setError('School name and code are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Blank optional fields are omitted rather than sent as empty strings.
      await api.updateSchool(school.id, {
        name: draft.name.trim(),
        code: draft.code.trim(),
        address: draft.address.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        website: draft.website.trim() || undefined,
      });
      notifications.show({
        color: 'teal',
        title: 'School details saved',
        message: draft.name,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'Could not save the school details.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Edit school details" centered size="lg">
      <Stack>
        <div className={styles.formGrid}>
          {fields.map(([key, label]) => (
            <TextInput
              key={key}
              label={label}
              required={key === 'name' || key === 'code'}
              value={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.currentTarget.value })}
            />
          ))}
        </div>
        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button color="fastrackRed" onClick={save} loading={saving}>
            Save school details
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RecordSection({
  title,
  count,
  action,
  error,
  loading,
  children,
}: {
  title: string;
  count?: string;
  action?: ReactNode;
  error: string | null;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" align="end" mb="lg">
        <div>
          <Text fw={800}>{title}</Text>
          {count && (
            <Text size="sm" c="dimmed">
              {count}
            </Text>
          )}
        </div>
        {action}
      </Group>
      {error ? (
        <Alert color="red">{error}</Alert>
      ) : loading ? (
        <Group justify="center" py="xl">
          <Loader color="red" size="sm" />
        </Group>
      ) : (
        <div style={{ overflowX: 'auto' }}>{children}</div>
      )}
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Text c="dimmed" size="sm" ta="center" py="lg">
      {text}
    </Text>
  );
}
