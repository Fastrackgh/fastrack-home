'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { Button, Group, NativeSelect, Text, TextInput } from '@mantine/core';
import { ArrowDownToLine, Plus, Search } from 'lucide-react';
import { APP_ROUTES, can } from '@/lib/rbac';
import {
  OVERVIEW_PATH,
  areaLabels,
  areaPage,
  canAccess,
  isArea,
  isPhaseArea,
  type Area,
  type Panel,
  type RecordRow,
} from './model';
import { SectionInsights } from './SectionInsights';
import { Workflow, workflowAllowed } from './Workflow';
import { PhaseWorkspace } from './phase-one/Workspace';
import { RecordDetail, RecordTable, downloadPanel } from './RecordTable';
import { WorkspaceContent, useWorkspace } from './WorkspaceProvider';
import { WorkspaceHeader } from './WorkspaceHeader';
import styles from './Dashboard.module.css';

/**
 * One preview area, addressed by `/dashboard/<area>`. An unknown area, one
 * the viewer may not open, or one served by a live page redirects instead
 * of rendering.
 */
export function AreaView({ slug }: { slug: string }) {
  const router = useRouter();
  const { viewer, term, child, data } = useWorkspace();
  const area = isArea(slug) && canAccess(viewer, slug) ? slug : null;
  const page = area ? areaPage(viewer, area) : undefined;
  const redirect = !area ? OVERVIEW_PATH : page && APP_ROUTES[page].path;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (!area || redirect) return null;
  const panel = data?.panels[area];
  return (
    <>
      <WorkspaceHeader
        title={areaLabels[area]}
        subtitle={panel?.description ?? 'Your workspace records and actions.'}
      />
      <WorkspaceContent>
        {(loaded) => {
          const current = loaded.panels[area];
          if (isPhaseArea(area, viewer)) return <PhaseArea area={area} />;
          if (!current) return null;
          return (
            // Re-keyed so filters and open records reset with the term or child.
            <PanelArea key={`${area}-${term}-${child}`} area={area} panel={current} />
          );
        }}
      </WorkspaceContent>
    </>
  );
}

function PhaseArea({ area }: { area: Area }) {
  const { actor, term, child, phase } = useWorkspace();
  return (
    <PhaseWorkspace
      key={`${child}-${term}-${area}`}
      area={area}
      viewer={actor}
      term={term}
      store={phase}
    />
  );
}

function PanelArea({ area, panel }: { area: Area; panel: Panel }) {
  const { actor, savePanelRows } = useWorkspace();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [detail, setDetail] = useState<RecordRow | null>(null);
  const [composing, setComposing] = useState(false);
  const filtered = panel.rows.filter(
    (row) =>
      [row.name, row.group, row.value, row.note]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === 'All' || row.status === status),
  );
  const mayAct = Boolean(panel.action) && workflowAllowed(actor, area);
  return (
    <>
      <SectionInsights area={area} viewer={actor} panel={panel} />
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
              data={['All', ...new Set(panel.rows.map((r) => r.status))]}
            />
          </Group>
          <Group gap="xs">
            {can(actor, 'data:export') && (
              <Button
                variant="default"
                size="sm"
                leftSection={<ArrowDownToLine size={14} />}
                onClick={() => downloadPanel(panel, filtered)}
                disabled={!filtered.length}
              >
                Export CSV
              </Button>
            )}
            {mayAct && (
              <Button
                color="fastrackRed"
                size="sm"
                leftSection={<Plus size={14} />}
                onClick={() => setComposing(true)}
              >
                {panel.action}
              </Button>
            )}
          </Group>
        </Group>
        <RecordTable panel={panel} rows={filtered} onDetail={setDetail} />
        <Text size="xs" c="dimmed" mt="md">
          {filtered.length} of {panel.rows.length} records · Sample data
        </Text>
      </section>
      <RecordDetail record={detail} onClose={() => setDetail(null)} />
      {composing && mayAct && (
        <Workflow
          area={area}
          panel={panel}
          viewer={actor}
          onClose={() => setComposing(false)}
          onSave={(rows) => {
            savePanelRows(area, rows);
            setComposing(false);
            notifications.show({
              title: 'Saved in preview',
              message:
                'Your changes are visible in this workspace. Overview metrics remain illustrative.',
              color: 'teal',
            });
          }}
        />
      )}
    </>
  );
}
