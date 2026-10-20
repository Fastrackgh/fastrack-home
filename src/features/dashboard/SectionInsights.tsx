'use client';
import { useState } from 'react';
import { Badge, Group, Progress, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { dataScopeOf } from '@/lib/rbac';
import { Area, Panel, Viewer } from './model';
import styles from './Dashboard.module.css';

/** Supplemental sample aggregates. Replace alongside the repository when connecting live data. */
export function SectionInsights({
  area,
  viewer,
  panel,
}: {
  area: Area;
  viewer: Viewer;
  panel: Panel;
}) {
  const [day, setDay] = useState('Week');
  if (!panel.rows.length) return null;
  if (area === 'schedule') {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return (
      <section className={styles.card} style={{ marginTop: 24 }}>
        <Group justify="space-between" mb="lg">
          <h2 className={styles.cardTitle}>
            {dataScopeOf(viewer.role) === 'assigned_classes'
              ? 'Your teaching week'
              : 'Weekly timetable'}
          </h2>
          <SegmentedControl
            aria-label="Timetable view"
            size="xs"
            value={day}
            onChange={setDay}
            data={['Week', ...days]}
          />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: day === 'Week' ? 5 : 1 }}>
          {(day === 'Week' ? days : [day]).map((d) => {
            const lessons = panel.rows.filter((r) => r.group.startsWith(d));
            return (
              <div key={d} style={{ background: '#fafbfc', borderRadius: 8, padding: 12 }}>
                <Text size="xs" fw={700} mb="md">
                  {d}
                </Text>
                <Stack gap="sm">
                  {lessons.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        borderLeft: `3px solid ${r.status === 'Free period' ? '#8b9bac' : '#df3547'}`,
                        padding: '8px 10px',
                        background: 'white',
                        borderRadius: 4,
                      }}
                    >
                      <Text size="10px" c="dimmed">
                        {r.group.split(' · ')[1]}
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
  let title = '';
  if (area === 'performance') {
    title = 'Subject rankings · proficiency';
    items = [
      {
        label: 'Science · #1',
        value: 86,
        detail: 'Pass 94% · 4% below proficiency',
      },
      {
        label: 'English · #2',
        value: 78,
        detail: 'Pass 90% · 8% below proficiency',
      },
      {
        label: 'ICT · #3',
        value: 72,
        detail: 'Pass 87% · 11% below proficiency',
      },
      {
        label: 'Mathematics · #4',
        value: 64,
        detail: 'Pass 78% · 18% below proficiency',
        color: 'orange',
      },
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
              color={item.color ?? 'teal'}
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
