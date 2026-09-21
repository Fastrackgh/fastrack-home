"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  NativeSelect,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { BrandLogo } from "@/components/atoms";
import {
  Area,
  DashboardData,
  DashboardRepository,
  Panel,
  RecordRow,
  Role,
  areaLabels,
  canAccess,
  roleConfig,
  roles,
  sampleUser,
} from "./model";
import { previewRepository, sampleTerms } from "./fixtures";
import { Workflow, workflowAllowed } from "./Workflow";
import { SectionInsights } from "./SectionInsights";
import styles from "./Dashboard.module.css";

const icons: Partial<Record<Area, typeof Users>> = {
  finance: Wallet,
  debts: CreditCard,
  budgets: ClipboardList,
  performance: GraduationCap,
  faculty: Users,
  reports: BookOpen,
  attendance: CheckCheck,
  schedule: CalendarDays,
  resources: BookOpen,
  communication: MessageSquare,
  schools: Building2,
  access: ShieldCheck,
};
const tone = (status: string) =>
  /overdue|risk|over budget|overloaded|absent|late/i.test(status)
    ? "red"
    : /pending|review|progress|near|draft|trial|unread|open|due/i.test(status)
      ? "orange"
      : "teal";

function downloadPanel(panel: Panel, rows: RecordRow[]) {
  const escape = (v: string) =>
    `"${(/^[=+@\-]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  const csv = [
    [...panel.columns, "Status", "Notes"],
    ...rows.map((r) => [r.name, r.group, r.value, r.status, r.note]),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `sample-${panel.title.toLowerCase().replaceAll(" ", "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RecordTable({
  panel,
  rows,
  onDetail,
}: {
  panel: Panel;
  rows: RecordRow[];
  onDetail: (row: RecordRow) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.table}>
        <thead>
          <tr>
            {panel.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button
                  className={styles.recordButton}
                  onClick={() => onDetail(row)}
                >
                  {row.name}
                </button>
              </td>
              <td>{row.group}</td>
              <td>{row.value}</td>
              <td>
                <Badge
                  size="sm"
                  radius="sm"
                  variant="light"
                  color={tone(row.status)}
                  tt="none"
                >
                  {row.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className={styles.state}>
          <Search size={24} color="#94a3b8" />
          <Text mt="sm" fw={600}>
            No records to show
          </Text>
          <Text size="sm" c="dimmed">
            Try another filter or academic term.
          </Text>
        </div>
      )}
    </div>
  );
}

/** Preview-only composition root. Production must use a verified identity and scoped repository. */
export function Dashboard({
  repository = previewRepository,
}: {
  repository?: DashboardRepository;
}) {
  const [role, setRole] = useState<Role>("SCHOOL_HEAD");
  const [area, setArea] = useState<Area | "overview">("overview");
  const [term, setTerm] = useState("2026-1");
  const [child, setChild] = useState("abena");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState<RecordRow | null>(null);
  const [workflow, setWorkflow] = useState<Area | null>(null);
  const [help, setHelp] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const config = roleConfig[role];
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    repository
      .load({
        user: sampleUser(role),
        termId: term,
        childId: role === "PARENT" ? child : undefined,
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load dashboard");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [role, term, child, reload, repository]);
  const navigate = (next: Area | "overview") => {
    if (next !== "overview" && !canAccess(role, next)) return;
    setArea(next);
    setSearch("");
    setStatus("All");
    setDetail(null);
    setWorkflow(null);
    setDrawer(false);
  };
  const changeRole = (value: string) => {
    if (!roles.includes(value as Role)) return;
    setRole(value as Role);
    setArea("overview");
    setSearch("");
    setStatus("All");
    setDetail(null);
    setWorkflow(null);
    setData(null);
    setAlerts(false);
  };
  const panel =
    area !== "overview" && canAccess(role, area)
      ? data?.panels[area]
      : undefined;
  const filtered =
    panel?.rows.filter(
      (row) =>
        [row.name, row.group, row.value, row.note]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "All" || row.status === status),
    ) ?? [];
  const nav = (
    <>
      <div className={styles.school}>
        <div className={styles.schoolIcon}>
          <Building2 size={20} />
        </div>
        <div>
          <Text size="xs" fw={700}>
            {role === "SUPER_ADMIN"
              ? "Fastrack network"
              : "Fastrack International"}
          </Text>
          <Text size="10px" c="dimmed">
            {role === "SUPER_ADMIN"
              ? "Platform management"
              : "Accra, Ghana · FIS-001"}
          </Text>
        </div>
      </div>
      <nav className={styles.nav} aria-label="Dashboard navigation">
        <div className={styles.eyebrow}>Workspace</div>
        <button
          onClick={() => navigate("overview")}
          className={`${styles.navItem} ${area === "overview" ? styles.active : ""}`}
          aria-current={area === "overview" ? "page" : undefined}
        >
          <LayoutDashboard size={17} />
          Overview
        </button>
        <div className={styles.eyebrow}>
          {role === "PARENT" ? "My family" : "Management"}
        </div>
        {config.areas.map((item) => {
          const Icon = icons[item] ?? Users;
          return (
            <button
              key={item}
              onClick={() => navigate(item)}
              className={`${styles.navItem} ${item === area ? styles.active : ""}`}
              aria-current={item === area ? "page" : undefined}
            >
              <Icon size={17} />
              {areaLabels[item]}
            </button>
          );
        })}
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
              {area === "overview" ? "Overview" : areaLabels[area]}
            </Text>
          </Group>
          <Group gap="md">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Open notifications"
              onClick={() => setAlerts(true)}
            >
              <Bell size={19} />
            </ActionIcon>
            <Avatar radius="xl" size={34} color="red">
              {config.name.slice(0, 1)}M
            </Avatar>
            <div className={styles.desktopName}>
              <Text size="xs" fw={700}>
                {config.name} Mensah
              </Text>
              <Text size="10px" c="dimmed">
                {config.label}
              </Text>
            </div>
            <ActionIcon
              component={Link}
              href="/school-admin/login"
              variant="subtle"
              color="gray"
              aria-label="Exit preview"
            >
              <LogOut size={17} />
            </ActionIcon>
          </Group>
        </header>
        <main className={styles.content}>
          <div className={styles.preview}>
            <Badge color="orange" size="sm" variant="light">
              UI preview
            </Badge>
            <span>
              Sample data · Changes last until you switch role, child, term, or
              reload.
            </span>
            <NativeSelect
              aria-label="Preview role"
              value={role}
              onChange={(e) => changeRole(e.target.value)}
              data={roles.map((r) => ({
                value: r,
                label: roleConfig[r].label,
              }))}
              size="xs"
              style={{ marginLeft: "auto", minWidth: 185 }}
            />
          </div>
          <Group justify="space-between" align="end">
            <div>
              <Text
                size="10px"
                c="dimmed"
                fw={700}
                tt="uppercase"
                style={{ letterSpacing: 1.5 }}
              >
                {config.label} workspace
              </Text>
              <h1 className={styles.heading}>
                {area === "overview"
                  ? `Welcome back, ${config.name}`
                  : areaLabels[area]}
              </h1>
              <Text size="sm" c="dimmed">
                {area === "overview"
                  ? config.subtitle
                  : (panel?.description ??
                    "Your workspace records and actions.")}
              </Text>
            </div>
            <Group gap="sm">
              {role === "PARENT" && (
                <NativeSelect
                  aria-label="Selected child"
                  value={child}
                  onChange={(e) => {
                    setChild(e.target.value);
                    setDetail(null);
                    setWorkflow(null);
                    setSearch("");
                    setStatus("All");
                  }}
                  data={[
                    { value: "abena", label: "Abena Osei · Primary 2" },
                    { value: "kwesi", label: "Kwesi Osei · Primary 4" },
                  ]}
                />
              )}
              <NativeSelect
                aria-label="Academic term"
                leftSection={<CalendarDays size={15} />}
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  setDetail(null);
                  setWorkflow(null);
                  setStatus("All");
                  setSearch("");
                }}
                data={sampleTerms}
              />
            </Group>
          </Group>
          {!loading && !error && panel && area !== "overview" && (
            <SectionInsights
              key={`${role}-${area}-${term}-${child}`}
              area={area}
              role={role}
              panel={panel}
            />
          )}
          {loading ? (
            <div className={styles.state} role="status">
              <Loader color="red" />
              <Text mt="md">Loading your workspace…</Text>
            </div>
          ) : error ? (
            <Alert mt="lg" color="red" title="Unable to load workspace">
              <Text>{error}</Text>
              <Button mt="sm" onClick={() => setReload((v) => v + 1)}>
                Try again
              </Button>
            </Alert>
          ) : (
            data && (
              <>
                {area === "overview" ? (
                  <>
                    <section className={styles.kpis} aria-label="Key metrics">
                      {data.metrics.map((m, i) => {
                        const Icon = [Users, Wallet, CheckCheck, ClipboardList][
                          i % 4
                        ];
                        return (
                          <article className={styles.metric} key={m.label}>
                            <Group justify="space-between" gap="xs">
                              <Text size="xs" fw={600} c="#748092">
                                {m.label}
                              </Text>
                              <div className={styles.metricIcon}>
                                <Icon size={17} />
                              </div>
                            </Group>
                            <div className={styles.metricValue}>{m.value}</div>
                            <Text
                              size="10px"
                              c={
                                m.tone === "green"
                                  ? "#168168"
                                  : m.tone === "orange"
                                    ? "#b47731"
                                    : "dimmed"
                              }
                            >
                              {m.detail}
                            </Text>
                          </article>
                        );
                      })}
                    </section>
                    <div className={styles.middle}>
                      <section className={styles.card}>
                        <Group justify="space-between">
                          <div>
                            <h2 className={styles.cardTitle}>
                              {data.chartTitle}
                            </h2>
                            <Text size="xs" c="dimmed" mt={4}>
                              Sample comparison ·{" "}
                              {sampleTerms.find((t) => t.value === term)?.label}
                            </Text>
                          </div>
                          <Badge variant="light" color="gray" size="xs">
                            Illustrative
                          </Badge>
                        </Group>
                        <Group gap="lg" mt="lg">
                          {data.chartLegend.map((l, i) => (
                            <Group gap={6} key={l}>
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 2,
                                  background: i === 0 ? "#df3547" : "#f3c4ca",
                                }}
                              />
                              <Text size="10px" c="dimmed">
                                {l}
                              </Text>
                            </Group>
                          ))}
                        </Group>
                        <div
                          className={styles.chart}
                          role="img"
                          aria-label={data.bars
                            .map(
                              (b) =>
                                `${b.label}: ${data.chartLegend[0]} ${b.value}; ${data.chartLegend[1]} ${b.secondary}`,
                            )
                            .join(". ")}
                        >
                          {data.bars.map((b) => (
                            <div className={styles.barGroup} key={b.label}>
                              <div
                                className={styles.bar}
                                style={{ height: `${b.value}%` }}
                              >
                                <span>{b.value}</span>
                              </div>
                              <div
                                className={`${styles.bar} ${styles.alt}`}
                                style={{ height: `${b.secondary}%` }}
                              >
                                <span>{b.secondary}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className={styles.chartLabels}>
                          {data.bars.map((b) => (
                            <span key={b.label}>{b.label}</span>
                          ))}
                        </div>
                      </section>
                      <section className={styles.card}>
                        <Group justify="space-between">
                          <h2 className={styles.cardTitle}>Your focus today</h2>
                          <Badge size="xs" color="red" variant="light">
                            {data.priorities.length} areas
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" mt={4}>
                          A few things worth a closer look.
                        </Text>
                        {data.priorities.map((p, i) => (
                          <button
                            className={styles.priority}
                            key={p.area}
                            onClick={() => navigate(p.area)}
                          >
                            <span className={styles.priorityNumber}>
                              0{i + 1}
                            </span>
                            <span>
                              <strong style={{ fontSize: 12 }}>
                                {p.title}
                              </strong>
                              <Text size="11px" c="dimmed" mt={5}>
                                {p.detail}
                              </Text>
                            </span>
                            <ChevronRight
                              size={15}
                              style={{
                                flexShrink: 0,
                                marginLeft: "auto",
                                marginTop: 5,
                              }}
                            />
                          </button>
                        ))}
                        {data.priorities.length === 0 && (
                          <Text mt="xl" c="dimmed" size="sm">
                            No current actions for this archived term.
                          </Text>
                        )}
                      </section>
                    </div>
                    <div className={styles.grid}>
                      {config.featured.map((key) => {
                        const p = data.panels[key];
                        if (!p) return null;
                        return (
                          <section key={key} className={styles.card}>
                            <Group justify="space-between" mb="md">
                              <h2 className={styles.cardTitle}>{p.title}</h2>
                              <Button
                                size="compact-xs"
                                variant="subtle"
                                color="red"
                                rightSection={<ArrowRight size={13} />}
                                onClick={() => navigate(key)}
                              >
                                View all
                              </Button>
                            </Group>
                            <RecordTable
                              panel={p}
                              rows={p.rows.slice(0, 3)}
                              onDetail={setDetail}
                            />
                          </section>
                        );
                      })}
                    </div>
                  </>
                ) : panel ? (
                  <section className={styles.card} style={{ marginTop: 26 }}>
                    <Group justify="space-between" mb="lg">
                      <Group>
                        <TextInput
                          aria-label="Search records"
                          placeholder="Search records…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          leftSection={<Search size={15} />}
                        />
                        <NativeSelect
                          aria-label="Filter status"
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          data={[
                            "All",
                            ...new Set(panel.rows.map((r) => r.status)),
                          ]}
                        />
                      </Group>
                      <Group gap="xs">
                        <Button
                          variant="default"
                          size="sm"
                          leftSection={<ArrowDownToLine size={14} />}
                          onClick={() => downloadPanel(panel, filtered)}
                          disabled={!filtered.length}
                        >
                          Export CSV
                        </Button>
                        {panel.action && workflowAllowed(role, area) && (
                          <Button
                            color="fastrackRed"
                            size="sm"
                            leftSection={<Plus size={14} />}
                            onClick={() => setWorkflow(area)}
                          >
                            {panel.action}
                          </Button>
                        )}
                      </Group>
                    </Group>
                    <RecordTable
                      panel={panel}
                      rows={filtered}
                      onDetail={setDetail}
                    />
                    <Text size="xs" c="dimmed" mt="md">
                      {filtered.length} of {panel.rows.length} records · Sample
                      data
                    </Text>
                  </section>
                ) : (
                  <Alert color="orange" mt="lg">
                    This section is not available for your role.
                  </Alert>
                )}
              </>
            )
          )}
          <footer className={styles.footer}>
            <span>© 2026 Fastrack Management Services</span>
            <span>Ghana cedi (GH₵) · Africa/Accra · Preview environment</span>
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
      <Drawer
        opened={!!detail}
        onClose={() => setDetail(null)}
        title="Record details"
        position="right"
        size="md"
      >
        {detail && (
          <Stack>
            <Badge w="fit-content" color={tone(detail.status)}>
              {detail.status}
            </Badge>
            <Text size="xl" fw={700}>
              {detail.name}
            </Text>
            <Text c="dimmed">{detail.group}</Text>
            <Text size="xl" fw={600}>
              {detail.value}
            </Text>
            <Text size="sm">{detail.note}</Text>
            <Alert color="gray">
              Sample record. Values shown here do not represent live school
              records.
            </Alert>
            <Button variant="default" onClick={() => setDetail(null)}>
              Close details
            </Button>
          </Stack>
        )}
      </Drawer>
      {workflow &&
        data?.panels[workflow] &&
        canAccess(role, workflow) &&
        workflowAllowed(role, workflow) && (
          <Workflow
            key={`${role}-${workflow}-${term}-${child}`}
            area={workflow}
            panel={data.panels[workflow]!}
            role={role}
            onClose={() => setWorkflow(null)}
            onSave={(rows) => {
              setData((current) =>
                current
                  ? {
                      ...current,
                      panels: {
                        ...current.panels,
                        [workflow]: { ...current.panels[workflow]!, rows },
                      },
                    }
                  : current,
              );
              setWorkflow(null);
              notifications.show({
                title: "Saved in preview",
                message:
                  "Your changes are visible in this workspace. Overview metrics remain illustrative.",
                color: "teal",
              });
            }}
          />
        )}
      <Drawer
        opened={alerts}
        onClose={() => setAlerts(false)}
        title="Workspace notifications"
        position="right"
      >
        <Alert color="orange" mb="md">
          Sample notifications for {config.label}.
        </Alert>
        {data?.priorities.map((p) => (
          <button
            key={p.area}
            className={styles.priority}
            onClick={() => {
              setAlerts(false);
              navigate(p.area);
            }}
          >
            <div>
              <Text fw={600} size="sm">
                {p.title}
              </Text>
              <Text c="dimmed" size="xs">
                {p.detail}
              </Text>
            </div>
            <ArrowRight size={16} />
          </button>
        ))}
        {!data?.priorities.length && (
          <Text c="dimmed">No notifications for this term.</Text>
        )}
      </Drawer>
      <Modal
        opened={help}
        onClose={() => setHelp(false)}
        title="Your workspace guide"
        centered
      >
        <Stack>
          <Text size="sm">
            Use the preview role selector to review all six workspaces.
            Navigation and actions follow each role’s responsibilities.
          </Text>
          <Text size="sm">
            Open any record for details. Search and status filters apply to the
            current section; CSV export includes only the filtered records.
          </Text>
          <Text size="sm">
            Forms save temporary preview drafts. Switching role, child, term, or
            reloading clears them. No live payments, invitations, messages, or
            uploads occur.
          </Text>
          <Alert color="blue">
            Live integration must use the authenticated user’s role,
            permissions, school, and linked children. The preview role selector
            is not an authentication mechanism.
          </Alert>
        </Stack>
      </Modal>
    </div>
  );
}
