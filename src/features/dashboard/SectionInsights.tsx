"use client";
import { useState } from "react";
import {
  Badge,
  Group,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { Area, Panel, Role } from "./model";
import styles from "./Dashboard.module.css";

/** Supplemental sample aggregates. Replace alongside the repository when connecting live data. */
export function SectionInsights({
  area,
  role,
  panel,
}: {
  area: Area;
  role: Role;
  panel: Panel;
}) {
  const [day, setDay] = useState("Week");
  if (!panel.rows.length) return null;
  if (area === "schedule") {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    return (
      <section className={styles.card} style={{ marginTop: 24 }}>
        <Group justify="space-between" mb="lg">
          <h2 className={styles.cardTitle}>Your teaching week</h2>
          <SegmentedControl
            aria-label="Timetable view"
            size="xs"
            value={day}
            onChange={setDay}
            data={["Week", ...days]}
          />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: day === "Week" ? 5 : 1 }}>
          {(day === "Week" ? days : [day]).map((d) => {
            const lessons = panel.rows.filter((r) => r.group.startsWith(d));
            return (
              <div
                key={d}
                style={{ background: "#fafbfc", borderRadius: 8, padding: 12 }}
              >
                <Text size="xs" fw={700} mb="md">
                  {d}
                </Text>
                <Stack gap="sm">
                  {lessons.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        borderLeft: `3px solid ${r.status === "Free period" ? "#8b9bac" : "#df3547"}`,
                        padding: "8px 10px",
                        background: "white",
                        borderRadius: 4,
                      }}
                    >
                      <Text size="10px" c="dimmed">
                        {r.group.split(" · ")[1]}
                      </Text>
                      <Text size="xs" fw={600} my={5}>
                        {r.name}
                      </Text>
                      <Text size="10px" c="dimmed">
                        {r.value}
                      </Text>
                    </div>
                  ))}
                  {!lessons.length && (
                    <Text size="xs" c="dimmed">
                      No lessons scheduled.
                    </Text>
                  )}
                </Stack>
              </div>
            );
          })}
        </SimpleGrid>
      </section>
    );
  }
  let items: {
    label: string;
    value: number;
    detail: string;
    color?: string;
  }[] = [];
  let title = "";
  if (area === "enrollment") {
    title = "Class capacity";
    items = [
      { label: "Creche", value: 84, detail: "42 of 50 places" },
      { label: "Nursery", value: 86, detail: "86 of 100 places" },
      {
        label: "Primary",
        value: 95.4,
        detail: "248 of 260 places",
        color: "orange",
      },
      { label: "Junior high", value: 80, detail: "144 of 180 places" },
    ];
  }
  if (area === "budgets") {
    title = "Budget utilization";
    items = [
      { label: "Primary department", value: 75, detail: "GH₵ 6,250 available" },
      {
        label: "Science department",
        value: 95,
        detail: "GH₵ 750 available",
        color: "orange",
      },
      {
        label: "Facilities",
        value: 105,
        detail: "GH₵ 1,000 over budget",
        color: "red",
      },
    ];
  }
  if (area === "debts") {
    title = "Overdue balance aging";
    items = [
      { label: "1–30 days", value: 24, detail: "GH₵ 1,200" },
      { label: "31–60 days", value: 17, detail: "GH₵ 850" },
      { label: "61–90 days", value: 41, detail: "GH₵ 2,100", color: "orange" },
      { label: "Over 90 days", value: 18, detail: "GH₵ 950", color: "red" },
    ];
  }
  if (area === "performance") {
    title = "Subject rankings · proficiency";
    items = [
      {
        label: "Science · #1",
        value: 86,
        detail: "Pass 94% · 4% below proficiency",
      },
      {
        label: "English · #2",
        value: 78,
        detail: "Pass 90% · 8% below proficiency",
      },
      {
        label: "ICT · #3",
        value: 72,
        detail: "Pass 87% · 11% below proficiency",
      },
      {
        label: "Mathematics · #4",
        value: 64,
        detail: "Pass 78% · 18% below proficiency",
        color: "orange",
      },
    ];
  }
  if (area === "finance" && role !== "PARENT") {
    title = "Collection against target";
    items = [
      {
        label: "Tuition collected",
        value: 82.4,
        detail: "GH₵ 82,400 of GH₵ 100,000",
      },
      {
        label: "Outstanding tuition",
        value: 17.6,
        detail: "GH₵ 17,600 remaining",
        color: "orange",
      },
      {
        label: "Budget spent",
        value: 90,
        detail: "GH₵ 54,000 of GH₵ 60,000",
        color: "orange",
      },
    ];
  }
  if (area === "reports" && role !== "PARENT") {
    title = "Report generation progress";
    items = [
      { label: "Primary 2", value: 93, detail: "26 of 28 reports" },
      { label: "Primary 3", value: 100, detail: "30 of 30 reports" },
      {
        label: "JHS 1",
        value: 81,
        detail: "29 of 36 reports",
        color: "orange",
      },
      { label: "JHS 2", value: 100, detail: "32 of 32 reports" },
    ];
  }
  if (!items.length) return null;
  return (
    <section className={styles.card} style={{ marginTop: 24 }}>
      <Group justify="space-between" mb="lg">
        <h2 className={styles.cardTitle}>{title}</h2>
        <Badge color="gray" variant="light" size="xs">
          Sample aggregates
        </Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: items.length }}>
        {items.map((item) => (
          <div key={item.label}>
            <Group justify="space-between">
              <Text size="xs" fw={600}>
                {item.label}
              </Text>
              <Text size="xs" fw={700}>
                {item.value}%
              </Text>
            </Group>
            <Progress
              my="sm"
              aria-label={`${item.label}: ${item.value}%`}
              value={Math.min(100, item.value)}
              color={item.color ?? "teal"}
              size={7}
              radius="xl"
            />
            <Text size="11px" c="dimmed">
              {item.detail}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </section>
  );
}
