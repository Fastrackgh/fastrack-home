'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Badge, Button, Group, Text } from '@mantine/core';
import { ArrowRight, CheckCheck, ChevronRight, ClipboardList, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  areaHref,
  areaLabel,
  areaPage,
  canAccess,
  isPhaseArea,
  roleConfig,
  type DashboardData,
  type RecordRow,
} from './model';
import { sampleTerms } from './fixtures';
import { PhaseShortcuts, phaseMetrics } from './phase-one/Workspace';
import { RecordDetail, RecordTable } from './RecordTable';
import { WorkspaceContent, useWorkspace } from './WorkspaceProvider';
import { WorkspaceHeader } from './WorkspaceHeader';
import styles from './Dashboard.module.css';

const metricIcons = [Users, Wallet, CheckCheck, ClipboardList];

/** The landing page for every school user: their role's summary of the school. */
export function Overview() {
  const { user } = useAuth();
  const { viewer } = useWorkspace();
  return (
    <>
      <WorkspaceHeader
        title={`Welcome back, ${user?.firstName ?? ''}`}
        subtitle={roleConfig[viewer.role].subtitle}
      />
      <WorkspaceContent>{(data) => <OverviewBody data={data} />}</WorkspaceContent>
    </>
  );
}

function OverviewBody({ data }: { data: DashboardData }) {
  const { viewer, term, phase } = useWorkspace();
  const [detail, setDetail] = useState<RecordRow | null>(null);
  // Areas that open the same live page are featured once.
  const featured = roleConfig[viewer.role].featured
    .filter((area) => canAccess(viewer, area))
    .filter(
      (area, i, all) => all.findIndex((a) => areaHref(viewer, a) === areaHref(viewer, area)) === i,
    );
  return (
    <>
      <section className={styles.kpis} aria-label="Key metrics">
        {(phaseMetrics(viewer, term, phase) ?? data.metrics).map((m, i) => {
          const Icon = metricIcons[i % metricIcons.length];
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
                c={m.tone === 'green' ? '#168168' : m.tone === 'orange' ? '#b47731' : 'dimmed'}
              >
                {m.detail}
              </Text>
            </article>
          );
        })}
      </section>
      <PhaseShortcuts viewer={viewer} />
      <div className={styles.middle}>
        <section className={styles.card}>
          <Group justify="space-between">
            <div>
              <h2 className={styles.cardTitle}>{data.chartTitle}</h2>
              <Text size="xs" c="dimmed" mt={4}>
                Sample comparison · {sampleTerms.find((t) => t.value === term)?.label}
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
                    background: i === 0 ? '#df3547' : '#f3c4ca',
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
              .join('. ')}
          >
            {data.bars.map((b) => (
              <div className={styles.barGroup} key={b.label}>
                <div className={styles.bar} style={{ height: `${b.value}%` }}>
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
            <Link className={styles.priority} key={p.area} href={areaHref(viewer, p.area)}>
              <span className={styles.priorityNumber}>0{i + 1}</span>
              <span>
                <strong style={{ fontSize: 12 }}>{p.title}</strong>
                <Text size="11px" c="dimmed" mt={5}>
                  {p.detail}
                </Text>
              </span>
              <ChevronRight size={15} style={{ flexShrink: 0, marginLeft: 'auto', marginTop: 5 }} />
            </Link>
          ))}
          {data.priorities.length === 0 && (
            <Text mt="xl" c="dimmed" size="sm">
              No current actions for this archived term.
            </Text>
          )}
        </section>
      </div>
      <div className={styles.grid}>
        {featured.map((area) => {
          const href = areaHref(viewer, area);
          if (areaPage(viewer, area))
            return (
              <FeatureCard key={area} title={areaLabel(viewer, area)} href={href} action="Open">
                <Text size="sm" c="dimmed">
                  Your school’s live records. Open this page to review and act on them.
                </Text>
              </FeatureCard>
            );
          const panel = data.panels[area];
          if (!panel) return null;
          return (
            <FeatureCard key={area} title={panel.title} href={href} action="View all">
              {isPhaseArea(area, viewer) ? (
                <Text size="sm" c="dimmed">
                  Open this workspace to review current preview records, reports, and available
                  actions. Changes are shared across the phase-one screens.
                </Text>
              ) : (
                <RecordTable panel={panel} rows={panel.rows.slice(0, 3)} onDetail={setDetail} />
              )}
            </FeatureCard>
          );
        })}
      </div>
      <RecordDetail record={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function FeatureCard({
  title,
  href,
  action,
  children,
}: {
  title: string;
  href: string;
  action: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <Group justify="space-between" mb="md">
        <h2 className={styles.cardTitle}>{title}</h2>
        <Button
          size="compact-xs"
          variant="subtle"
          color="red"
          rightSection={<ArrowRight size={13} />}
          component={Link}
          href={href}
        >
          {action}
        </Button>
      </Group>
      {children}
    </section>
  );
}
