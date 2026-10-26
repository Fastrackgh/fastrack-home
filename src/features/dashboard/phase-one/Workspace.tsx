'use client';
import Link from 'next/link';
import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { Area, Viewer, areaHref, areaLabels, canAccess, isPhaseArea, previewAreas } from '../model';
import { PhaseStore } from './usePhaseState';
import { Finance } from './Finance';
import { Enrollment } from './Enrollment';
import { SchoolLife } from './SchoolLife';
import { Academics } from './Academics';
export function PhaseWorkspace({
  area,
  viewer,
  term,
  store,
}: {
  area: Area;
  viewer: Viewer;
  term: string;
  store: PhaseStore;
}) {
  if (!canAccess(viewer, area))
    return <Alert color="red">This area is not available to your role.</Alert>;
  return (
    <Paper withBorder radius="lg" p={{ base: 'sm', md: 'xl' }} mt="lg">
      {area === 'budgets' || area === 'plans' ? (
        <Finance key={`${area}-${term}`} store={store} viewer={viewer} term={term} area={area} />
      ) : area === 'enquiries' || area === 'admissions' ? (
        <Enrollment key={`${area}-${term}`} store={store} viewer={viewer} term={term} area={area} />
      ) : ['calendar', 'meals', 'gallery', 'archive', 'questions'].includes(area) ? (
        <SchoolLife
          key={`${area}-${term}`}
          store={store}
          viewer={viewer}
          term={term}
          area={area as 'calendar' | 'meals' | 'gallery' | 'archive' | 'questions'}
        />
      ) : (
        <Academics
          key={`${area}-${term}`}
          store={store}
          viewer={viewer}
          term={term}
          area={area as 'schedule' | 'grading' | 'reports' | 'gradebook'}
        />
      )}
    </Paper>
  );
}
export function PhaseShortcuts({ viewer }: { viewer: Viewer }) {
  const areas = previewAreas(viewer).filter((a) => isPhaseArea(a, viewer));
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
          <Button key={a} variant="default" component={Link} href={areaHref(viewer, a)}>
            {areaLabels[a]}
          </Button>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
