"use client";
import {
  Alert,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  Area,
  Role,
  areaLabels,
  canAccess,
  roleConfig,
  Metric,
} from "../model";
import { PhaseStore } from "./usePhaseState";
import { Finance } from "./Finance";
import { Enrollment } from "./Enrollment";
import { SchoolLife } from "./SchoolLife";
import { Academics } from "./Academics";
import { billTotals, money } from "./domain";
export function isPhaseArea(area: Area | "overview", role: Role) {
  return (
    [
      "meals",
      "gallery",
      "calendar",
      "archive",
      "questions",
      "enquiries",
      "staffing",
      "plans",
      "admissions",
      "grading",
      "enrollment",
      "budgets",
      "debts",
    ].includes(area) ||
    (area === "finance" && ["ADMIN", "SCHOOL_HEAD"].includes(role)) ||
    (["reports", "gradebook"].includes(area) &&
      ["TEACHER", "ACADEMIC_HEAD", "SCHOOL_HEAD"].includes(role)) ||
    (area === "schedule" && role === "ACADEMIC_HEAD")
  );
}
export function PhaseWorkspace({
  area,
  role,
  term,
  store,
}: {
  area: Area;
  role: Role;
  term: string;
  store: PhaseStore;
}) {
  if (!canAccess(role, area))
    return <Alert color="red">This area is not available to your role.</Alert>;
  return (
    <Paper withBorder radius="lg" p={{ base: "sm", md: "xl" }} mt="lg">
      {["finance", "budgets", "plans", "debts"].includes(area) ? (
        <Finance
          key={`${area}-${term}`}
          store={store}
          role={role}
          term={term}
          area={area as "finance" | "budgets" | "plans" | "debts"}
        />
      ) : ["enrollment", "enquiries", "admissions", "staffing"].includes(
          area,
        ) ? (
        <Enrollment
          key={`${area}-${term}`}
          store={store}
          role={role}
          term={term}
          area={area as "enrollment" | "enquiries" | "admissions" | "staffing"}
        />
      ) : ["calendar", "meals", "gallery", "archive", "questions"].includes(
          area,
        ) ? (
        <SchoolLife
          key={`${area}-${term}`}
          store={store}
          role={role}
          term={term}
          area={
            area as "calendar" | "meals" | "gallery" | "archive" | "questions"
          }
        />
      ) : (
        <Academics
          key={`${area}-${term}`}
          store={store}
          role={role}
          term={term}
          area={area as "schedule" | "grading" | "reports" | "gradebook"}
        />
      )}
    </Paper>
  );
}
export function PhaseShortcuts({
  role,
  onOpen,
}: {
  role: Role;
  onOpen: (area: Area) => void;
}) {
  const areas = roleConfig[role].areas.filter((a) => isPhaseArea(a, role));
  if (!areas.length) return null;
  return (
    <Stack mt="lg" mb="lg">
      <Group justify="space-between">
        <Text fw={700}>Phase-one workflows</Text>
        <Text c="dimmed" size="xs">
          Forms, reports & school services
        </Text>
      </Group>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {areas.map((a) => (
          <Button key={a} variant="default" onClick={() => onOpen(a)}>
            {areaLabels[a]}
          </Button>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
export function phaseMetrics(
  role: Role,
  term: string,
  store: PhaseStore,
): Metric[] | undefined {
  if (!["ADMIN", "SCHOOL_HEAD", "SECRETARY"].includes(role)) return;
  const s = store.state;
  const totals = s.bills
    .filter((b) => b.termId === term)
    .map((b) => billTotals(b, s.payments));
  return [
    {
      label: "Active sample students",
      value: String(s.students.filter((x) => x.status === "Active").length),
      detail: "Local enrollment register",
      tone: "blue",
    },
    {
      label:
        role === "SECRETARY" ? "Admission enquiries" : "School fees collected",
      value:
        role === "SECRETARY"
          ? String(s.enquiries.filter((e) => e.termId === term).length)
          : money(totals.reduce((n, t) => n + t.paid, 0)),
      detail:
        role === "SECRETARY"
          ? "Admission enquiries this term"
          : "Updates when payments are recorded",
      tone: "green",
    },
    {
      label: role === "SECRETARY" ? "School staff" : "Outstanding fees",
      value:
        role === "SECRETARY"
          ? String(s.staff.length)
          : money(totals.reduce((n, t) => n + t.balance, 0)),
      detail: "Current preview records",
      tone: "orange",
    },
    {
      label: role === "SECRETARY" ? "New admissions" : "Expenses this term",
      value:
        role === "SECRETARY"
          ? String(s.students.filter((x) => x.termId === term).length)
          : money(
              s.expenses
                .filter((e) => e.termId === term)
                .reduce((n, e) => n + e.amount, 0),
            ),
      detail: "Selected academic term",
      tone: "blue",
    },
  ];
}
