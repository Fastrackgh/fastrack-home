'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, Group, Text } from '@mantine/core';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageHeader, useViewer } from '@/features/workspace';
import { setupApi, type CurrentTerm } from '@/features/school-setup/api';
import { areaHref, areaLabel, areaPage, canAccess, roleConfig, type Viewer } from './model';
import { PhaseShortcuts } from './phase-one/Workspace';
import { OverviewTiles } from './OverviewTiles';
import styles from './Dashboard.module.css';

/**
 * The landing page for every school user: live figures for what their role
 * and the school's modules allow, and the pages they use most. Nothing here
 * is sample data; the preview areas keep their own notice.
 */
export function Overview() {
  const { user } = useAuth();
  const viewer = useViewer();
  // undefined while loading; null when no current term is set.
  const [term, setTerm] = useState<CurrentTerm | null | undefined>(undefined);

  useEffect(() => {
    setupApi
      .currentTerm()
      .then(setTerm)
      .catch(() => setTerm(null));
  }, []);

  if (!viewer) return null;
  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.firstName ?? ''}`}
        subtitle={
          term
            ? `${roleConfig[viewer.role].subtitle} · ${term.termLabel}, ${term.yearLabel}`
            : roleConfig[viewer.role].subtitle
        }
      />
      {term !== undefined && <OverviewTiles term={term} />}
      <PhaseShortcuts viewer={viewer} />
      <LivePages viewer={viewer} />
    </>
  );
}

/** The role's featured areas that open a live page; areas that open the same page show once. */
function LivePages({ viewer }: { viewer: Viewer }) {
  const featured = roleConfig[viewer.role].featured
    .filter((area) => canAccess(viewer, area) && areaPage(viewer, area))
    .filter(
      (area, i, all) => all.findIndex((a) => areaHref(viewer, a) === areaHref(viewer, area)) === i,
    );
  if (!featured.length) return null;
  return (
    <div className={styles.grid}>
      {featured.map((area) => (
        <FeatureCard
          key={area}
          title={areaLabel(viewer, area)}
          href={areaHref(viewer, area)}
          action="Open"
        >
          <Text size="sm" c="dimmed">
            Your school’s live records. Open this page to review and act on them.
          </Text>
        </FeatureCard>
      ))}
    </div>
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
