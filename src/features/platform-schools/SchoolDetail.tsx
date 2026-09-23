"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NativeSelect,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowLeft,
  Building2,
  Check,
  ClipboardList,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  School,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  PlatformSchoolSnapshot,
  SchoolPerson,
  SchoolRole,
  SchoolStudent,
} from "./model";
import styles from "./SchoolDetail.module.css";

const roles: SchoolRole[] = [
  "Owner",
  "Principal",
  "Administrator",
  "Academic Head",
  "Teacher",
  "Account Officer",
  "Secretary",
];

const statusColor = (status: string) =>
  /active|enabled/i.test(status)
    ? "teal"
    : /trial|invited|pending/i.test(status)
      ? "orange"
      : "red";

const emptyPerson = (): SchoolPerson => ({
  id: "",
  name: "",
  email: "",
  phone: "",
  role: "Teacher",
  status: "Invited",
  lastActive: "Invitation pending",
});

export function PlatformSchoolDetail({
  initialSchool,
}: {
  initialSchool: PlatformSchoolSnapshot;
}) {
  const [school, setSchool] = useState(initialSchool);
  const [tab, setTab] = useState("overview");
  const [profileOpen, setProfileOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [personDraft, setPersonDraft] = useState<SchoolPerson>(emptyPerson());
  const [studentDraft, setStudentDraft] = useState<SchoolStudent | null>(null);
  const [profileDraft, setProfileDraft] = useState(school.profile);
  const [studentSearch, setStudentSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const owner = school.users.find((user) => user.id === school.ownerId);
  const principal = school.users.find((user) => user.id === school.principalId);
  const activeStudents = school.students.filter((student) => student.status === "Active").length;
  const activeStaff = school.staff.filter((person) => person.status === "Active").length;
  const enabledModules = school.modules.filter((module) => module.enabled).length;
  const filteredStudents = useMemo(
    () =>
      school.students.filter((student) =>
        [student.name, student.className, student.guardian]
          .join(" ")
          .toLowerCase()
          .includes(studentSearch.toLowerCase()),
      ),
    [school.students, studentSearch],
  );
  const filteredUsers = useMemo(
    () =>
      school.users.filter((user) =>
        [user.name, user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(userSearch.toLowerCase()),
      ),
    [school.users, userSearch],
  );

  const recordActivity = (summary: string) => {
    setSchool((current) => ({
      ...current,
      activity: [
        {
          id: `local-${Date.now()}`,
          summary,
          actor: "Platform Super Admin",
          occurredAt: "Just now · preview",
        },
        ...current.activity,
      ],
    }));
  };
  const toast = (title: string, message: string) =>
    notifications.show({ title, message, color: "teal", icon: <Check size={15} /> });
  const updateMembership = (key: "ownerId" | "principalId", id: string) => {
    setSchool((current) => ({ ...current, [key]: id }));
    recordActivity(`${key === "ownerId" ? "School owner" : "Principal"} assignment updated`);
    toast("Assignment updated", "The change is saved in this preview only.");
  };
  const openPerson = (person?: SchoolPerson) => {
    setPersonDraft(person ? { ...person } : emptyPerson());
    setPersonOpen(true);
  };
  const savePerson = () => {
    if (!personDraft.name.trim() || !personDraft.email.trim()) return;
    const isNew = !personDraft.id;
    const saved = isNew
      ? { ...personDraft, id: `user-${Date.now()}` }
      : personDraft;
    setSchool((current) => ({
      ...current,
      users: isNew
        ? [...current.users, saved]
        : current.users.map((user) => (user.id === saved.id ? saved : user)),
      staff:
        saved.role === "Teacher" || saved.role === "Principal" || saved.role === "Academic Head"
          ? isNew
            ? [...current.staff, saved]
            : current.staff.some((person) => person.id === saved.id)
              ? current.staff.map((person) => (person.id === saved.id ? saved : person))
              : [...current.staff, saved]
          : current.staff.filter((person) => person.id !== saved.id),
    }));
    recordActivity(isNew ? `${saved.name} invited to the school` : `${saved.name}'s account details updated`);
    setPersonOpen(false);
    toast(isNew ? "User invited" : "User updated", "The account change is saved in this preview only.");
  };
  const saveStudent = () => {
    if (!studentDraft?.name.trim()) return;
    setSchool((current) => ({
      ...current,
      students: current.students.map((student) =>
        student.id === studentDraft.id ? studentDraft : student,
      ),
    }));
    recordActivity(`${studentDraft.name}'s student record updated`);
    setStudentOpen(false);
    toast("Student updated", "The student record change is saved in this preview only.");
  };
  const saveProfile = () => {
    setSchool((current) => ({ ...current, profile: profileDraft }));
    recordActivity("School profile updated");
    setProfileOpen(false);
    toast("School profile updated", "The change is saved in this preview only.");
  };

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Group gap="sm">
          <Button component={Link} href="/school-admin/dashboard" variant="subtle" color="gray" leftSection={<ArrowLeft size={16} />}>
            Platform dashboard
          </Button>
          <Divider orientation="vertical" />
          <Badge color="violet" variant="light">Super Admin only</Badge>
        </Group>
        <Badge color="orange" variant="light">Preview data</Badge>
      </div>

      <section className={styles.hero}>
        <div className={styles.schoolMark}><School size={30} /></div>
        <div className={styles.heroCopy}>
          <Group gap="sm">
            <h1>{school.profile.name}</h1>
            <Badge color={statusColor(school.profile.status)} variant="light">{school.profile.status}</Badge>
          </Group>
          <Text c="dimmed" size="sm">{school.profile.code} · {school.profile.city}, {school.profile.region} · Joined {school.profile.createdAt}</Text>
        </div>
        <Button color="fastrackRed" leftSection={<Edit3 size={15} />} onClick={() => { setProfileDraft(school.profile); setProfileOpen(true); }}>
          Edit school details
        </Button>
      </section>

      <Alert className={styles.previewAlert} color="orange" title="Independent platform workspace">
        This view is intentionally separate from a school dashboard. Changes update local preview state; connect the repository contract to authenticated Super Admin APIs when integration begins.
      </Alert>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" className={styles.metrics}>
        {[
          ["Active students", activeStudents.toString(), "Student records"],
          ["Active staff", activeStaff.toString(), "Teachers & leadership"],
          ["User accounts", school.users.length.toString(), "School-scoped access"],
          ["Enabled modules", enabledModules.toString(), `${school.subscription.plan} plan`],
        ].map(([label, value, detail]) => (
          <Card withBorder radius="md" padding="md" key={label}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">{label}</Text>
            <Text size="xl" fw={800} mt={5}>{value}</Text>
            <Text size="xs" c="dimmed">{detail}</Text>
          </Card>
        ))}
      </SimpleGrid>

      <Tabs value={tab} onChange={(value) => setTab(value ?? "overview")} className={styles.tabs}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<Building2 size={14} />}>Overview</Tabs.Tab>
          <Tabs.Tab value="students" leftSection={<Users size={14} />}>Students</Tabs.Tab>
          <Tabs.Tab value="staff" leftSection={<School size={14} />}>Teachers & staff</Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<ShieldCheck size={14} />}>Users & access</Tabs.Tab>
          <Tabs.Tab value="modules" leftSection={<Settings2 size={14} />}>Modules & plan</Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<ClipboardList size={14} />}>Activity</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="lg">
          <div className={styles.overviewGrid}>
            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="md"><Text fw={800}>School profile</Text><ActionIcon variant="subtle" color="gray" onClick={() => setProfileOpen(true)} aria-label="Edit school profile"><Edit3 size={16} /></ActionIcon></Group>
              <Stack gap="sm" className={styles.details}>
                <span><Mail size={15} />{school.profile.email}</span>
                <span><Phone size={15} />{school.profile.phone}</span>
                <span><MapPin size={15} />{school.profile.address}, {school.profile.city}</span>
                <span><Building2 size={15} />{school.profile.website}</span>
              </Stack>
            </Card>
            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="md"><Text fw={800}>Ownership & leadership</Text><Button size="compact-sm" variant="light" onClick={() => setMembershipOpen(true)}>Manage</Button></Group>
              <div className={styles.peoplePair}>
                <PersonSummary label="School owner" person={owner} />
                <PersonSummary label="Principal" person={principal} />
              </div>
            </Card>
            <Card withBorder radius="md" padding="lg">
              <Group justify="space-between" mb="md"><Text fw={800}>Subscription</Text><Button size="compact-sm" variant="light" onClick={() => setSubscriptionOpen(true)}>Edit plan</Button></Group>
              <Text fw={700}>{school.subscription.plan} · {school.subscription.monthlyFee}/month</Text>
              <Text size="sm" c="dimmed" mt={4}>{school.subscription.seats} seats · Renews {school.subscription.renewalDate}</Text>
              <Badge mt="md" color={statusColor(school.subscription.status)} variant="light">{school.subscription.status}</Badge>
            </Card>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="students" pt="lg">
          <RecordSection title="Students" description="School student records are visible here without entering the school workspace." search={studentSearch} onSearch={setStudentSearch} searchLabel="Search students" count={`${filteredStudents.length} of ${school.students.length}`}>
            <table className={styles.table}><thead><tr><th>Student</th><th>Class</th><th>Guardian</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{filteredStudents.map((student) => <tr key={student.id}><td><Text fw={700} size="sm">{student.name}</Text></td><td>{student.className}</td><td><Text size="sm">{student.guardian}</Text><Text size="xs" c="dimmed">{student.guardianPhone}</Text></td><td>{student.balance}</td><td><Badge color={statusColor(student.status)} variant="light">{student.status}</Badge></td><td><Button size="compact-xs" variant="subtle" onClick={() => { setStudentDraft({ ...student }); setStudentOpen(true); }}>Edit</Button></td></tr>)}</tbody></table>
          </RecordSection>
        </Tabs.Panel>

        <Tabs.Panel value="staff" pt="lg">
          <RecordSection title="Teachers & staff" description="Employment-facing summary of the accounts attached to this school." count={`${school.staff.length} staff shown`}>
            <table className={styles.table}><thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Last active</th><th>Status</th></tr></thead><tbody>{school.staff.map((person) => <tr key={person.id}><td><Text fw={700} size="sm">{person.name}</Text></td><td>{person.role}</td><td><Text size="sm">{person.email}</Text><Text size="xs" c="dimmed">{person.phone}</Text></td><td>{person.lastActive}</td><td><Badge color={statusColor(person.status)} variant="light">{person.status}</Badge></td></tr>)}</tbody></table>
          </RecordSection>
        </Tabs.Panel>

        <Tabs.Panel value="users" pt="lg">
          <RecordSection title="Users & access" description="Create, update, invite, or deactivate only school-scoped user accounts." search={userSearch} onSearch={setUserSearch} searchLabel="Search users" count={`${filteredUsers.length} users`} action={<Button size="sm" color="fastrackRed" leftSection={<Plus size={14} />} onClick={() => openPerson()}>Invite user</Button>}>
            <table className={styles.table}><thead><tr><th>User</th><th>Role</th><th>Last active</th><th>Status</th><th /></tr></thead><tbody>{filteredUsers.map((person) => <tr key={person.id}><td><Text fw={700} size="sm">{person.name}</Text><Text size="xs" c="dimmed">{person.email}</Text></td><td>{person.role}</td><td>{person.lastActive}</td><td><Badge color={statusColor(person.status)} variant="light">{person.status}</Badge></td><td><Button size="compact-xs" variant="subtle" onClick={() => openPerson(person)}>Edit</Button></td></tr>)}</tbody></table>
          </RecordSection>
        </Tabs.Panel>

        <Tabs.Panel value="modules" pt="lg">
          <div className={styles.overviewGrid}>
            <Card withBorder radius="md" padding="lg"><Group justify="space-between"><div><Text fw={800}>Subscription controls</Text><Text size="sm" c="dimmed">Plan, seats, renewal, and status.</Text></div><Button variant="light" onClick={() => setSubscriptionOpen(true)}>Edit plan</Button></Group><Divider my="lg" /><Text fw={700}>{school.subscription.plan} plan</Text><Text size="sm" c="dimmed" mt={4}>{school.subscription.monthlyFee}/month · {school.subscription.seats} licensed seats</Text></Card>
            <Card withBorder radius="md" padding="lg"><Text fw={800} mb="md">Enabled services</Text><Stack gap="md">{school.modules.map((module) => <Group justify="space-between" key={module.id}><div><Text fw={700} size="sm">{module.name}</Text><Text size="xs" c="dimmed">{module.description}</Text></div><Switch checked={module.enabled} onChange={(event) => { const enabled = event.currentTarget.checked; setSchool((current) => ({ ...current, modules: current.modules.map((item) => item.id === module.id ? { ...item, enabled } : item) })); recordActivity(`${module.name} ${enabled ? "enabled" : "disabled"}`); }} aria-label={`Toggle ${module.name}`} /></Group>)}</Stack></Card>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="activity" pt="lg">
          <Card withBorder radius="md" padding="lg"><Text fw={800} mb="md">Platform audit trail</Text><Stack gap={0}>{school.activity.map((activity) => <div className={styles.activity} key={activity.id}><span className={styles.activityDot} /><div><Text fw={700} size="sm">{activity.summary}</Text><Text size="xs" c="dimmed">{activity.actor} · {activity.occurredAt}</Text></div></div>)}</Stack></Card>
        </Tabs.Panel>
      </Tabs>

      <Modal opened={profileOpen} onClose={() => setProfileOpen(false)} title="Edit school details" centered size="lg">
        <Stack><div className={styles.formGrid}><TextInput label="School name" value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.currentTarget.value })} /><TextInput label="School code" value={profileDraft.code} onChange={(event) => setProfileDraft({ ...profileDraft, code: event.currentTarget.value })} /><TextInput label="School email" value={profileDraft.email} onChange={(event) => setProfileDraft({ ...profileDraft, email: event.currentTarget.value })} /><TextInput label="Phone" value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.currentTarget.value })} /><TextInput label="Address" value={profileDraft.address} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.currentTarget.value })} /><TextInput label="City" value={profileDraft.city} onChange={(event) => setProfileDraft({ ...profileDraft, city: event.currentTarget.value })} /><TextInput label="Region" value={profileDraft.region} onChange={(event) => setProfileDraft({ ...profileDraft, region: event.currentTarget.value })} /><TextInput label="Website" value={profileDraft.website} onChange={(event) => setProfileDraft({ ...profileDraft, website: event.currentTarget.value })} /><NativeSelect label="School status" value={profileDraft.status} onChange={(event) => setProfileDraft({ ...profileDraft, status: event.currentTarget.value as typeof profileDraft.status })} data={["Active", "Trial", "Suspended"]} /></div><Group justify="flex-end"><Button variant="default" onClick={() => setProfileOpen(false)}>Cancel</Button><Button color="fastrackRed" onClick={saveProfile}>Save school details</Button></Group></Stack>
      </Modal>

      <Modal opened={membershipOpen} onClose={() => setMembershipOpen(false)} title="Assign owner & principal" centered>
        <Stack><Text size="sm" c="dimmed">Assignments use only user accounts already attached to this school.</Text><NativeSelect label="School owner" value={school.ownerId} data={school.users.map((user) => ({ value: user.id, label: `${user.name} · ${user.role}` }))} onChange={(event) => updateMembership("ownerId", event.currentTarget.value)} /><NativeSelect label="Principal" value={school.principalId} data={school.users.map((user) => ({ value: user.id, label: `${user.name} · ${user.role}` }))} onChange={(event) => updateMembership("principalId", event.currentTarget.value)} /></Stack>
      </Modal>

      <Modal opened={personOpen} onClose={() => setPersonOpen(false)} title={personDraft.id ? "Edit school user" : "Invite school user"} centered>
        <Stack><TextInput label="Full name" value={personDraft.name} onChange={(event) => setPersonDraft({ ...personDraft, name: event.currentTarget.value })} /><TextInput label="Email" type="email" value={personDraft.email} onChange={(event) => setPersonDraft({ ...personDraft, email: event.currentTarget.value })} /><TextInput label="Phone" value={personDraft.phone} onChange={(event) => setPersonDraft({ ...personDraft, phone: event.currentTarget.value })} /><NativeSelect label="School role" value={personDraft.role} data={roles} onChange={(event) => setPersonDraft({ ...personDraft, role: event.currentTarget.value as SchoolRole })} /><NativeSelect label="Account status" value={personDraft.status} data={["Active", "Invited", "Inactive"]} onChange={(event) => setPersonDraft({ ...personDraft, status: event.currentTarget.value as SchoolPerson["status"] })} /><Group justify="flex-end"><Button variant="default" onClick={() => setPersonOpen(false)}>Cancel</Button><Button color="fastrackRed" disabled={!personDraft.name || !personDraft.email} onClick={savePerson}>{personDraft.id ? "Save user" : "Send invitation"}</Button></Group></Stack>
      </Modal>

      <Modal opened={studentOpen} onClose={() => setStudentOpen(false)} title="Edit student record" centered>
        {studentDraft && <Stack><TextInput label="Student name" value={studentDraft.name} onChange={(event) => setStudentDraft({ ...studentDraft, name: event.currentTarget.value })} /><TextInput label="Class" value={studentDraft.className} onChange={(event) => setStudentDraft({ ...studentDraft, className: event.currentTarget.value })} /><TextInput label="Guardian" value={studentDraft.guardian} onChange={(event) => setStudentDraft({ ...studentDraft, guardian: event.currentTarget.value })} /><TextInput label="Guardian phone" value={studentDraft.guardianPhone} onChange={(event) => setStudentDraft({ ...studentDraft, guardianPhone: event.currentTarget.value })} /><NativeSelect label="Student status" value={studentDraft.status} data={["Active", "Inactive", "Pending"]} onChange={(event) => setStudentDraft({ ...studentDraft, status: event.currentTarget.value as SchoolStudent["status"] })} /><Group justify="flex-end"><Button variant="default" onClick={() => setStudentOpen(false)}>Cancel</Button><Button color="fastrackRed" onClick={saveStudent}>Save student</Button></Group></Stack>}
      </Modal>

      <Modal opened={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} title="Edit subscription" centered>
        <Stack><NativeSelect label="Plan" value={school.subscription.plan} data={["Trial", "Standard", "Professional", "Enterprise"]} onChange={(event) => setSchool((current) => ({ ...current, subscription: { ...current.subscription, plan: event.currentTarget.value as typeof current.subscription.plan } }))} /><NativeSelect label="Subscription status" value={school.subscription.status} data={["Active", "Trial", "Past due", "Paused"]} onChange={(event) => setSchool((current) => ({ ...current, subscription: { ...current.subscription, status: event.currentTarget.value as typeof current.subscription.status } }))} /><TextInput label="Renewal date" value={school.subscription.renewalDate} onChange={(event) => setSchool((current) => ({ ...current, subscription: { ...current.subscription, renewalDate: event.currentTarget.value } }))} /><TextInput label="Licensed seats" type="number" value={school.subscription.seats} onChange={(event) => setSchool((current) => ({ ...current, subscription: { ...current.subscription, seats: Number(event.currentTarget.value) || 0 } }))} /><Group justify="flex-end"><Button variant="default" onClick={() => setSubscriptionOpen(false)}>Cancel</Button><Button color="fastrackRed" onClick={() => { recordActivity("Subscription settings updated"); setSubscriptionOpen(false); toast("Subscription updated", "The plan change is saved in this preview only."); }}>Save subscription</Button></Group></Stack>
      </Modal>
    </main>
  );
}

function PersonSummary({ label, person }: { label: string; person?: SchoolPerson }) {
  return <div><Text size="xs" fw={700} c="dimmed" tt="uppercase">{label}</Text>{person ? <Group gap="sm" mt={7}><Avatar color="red" radius="xl">{person.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Avatar><div><Text fw={700} size="sm">{person.name}</Text><Text size="xs" c="dimmed">{person.email}</Text></div></Group> : <Text c="dimmed" size="sm" mt={7}>Not assigned</Text>}</div>;
}

function RecordSection({ title, description, search, onSearch, searchLabel, count, action, children }: { title: string; description: string; search?: string; onSearch?: (value: string) => void; searchLabel?: string; count: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <Card withBorder radius="md" padding="lg"><Group justify="space-between" align="end" mb="lg"><div><Text fw={800}>{title}</Text><Text size="sm" c="dimmed">{description}</Text></div><Group>{search !== undefined && <TextInput value={search} onChange={(event) => onSearch?.(event.currentTarget.value)} placeholder={searchLabel} aria-label={searchLabel} />}{action}</Group></Group>{children}<Text size="xs" c="dimmed" mt="md">{count} · Preview data</Text></Card>;
}
