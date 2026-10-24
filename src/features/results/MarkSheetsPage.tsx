'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { errorMessage } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import { marksApi, type SheetCard } from './marks-api';
import { TermPicker, useTerms } from './TermPicker';

export const STATUS: Record<SheetCard['status'], { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'gray' },
  draft: { label: 'In progress', color: 'blue' },
  submitted: { label: 'Submitted', color: 'teal' },
  approved: { label: 'Approved', color: 'green' },
};

export const sheetHref = (termId: string, classId: string, subjectId: string) =>
  `${APP_ROUTES.marks.path}/sheet?${new URLSearchParams({ termId, classId, subjectId })}`;

/**
 * A teacher's mark sheets for a term, one card per class and subject they
 * teach, plus unassigned subjects in their own class. Heads, and teachers
 * looking for an unassigned subject, switch to every class.
 */
export function MarkSheetsPage() {
  const { can } = useAuth();
  const isHead = can('reports:approve');
  const { terms, termId, setTermId, error: termsError } = useTerms();
  const [all, setAll] = useState(isHead);
  const [cards, setCards] = useState<SheetCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!termId) return;
    setError(null);
    setCards(null);
    try {
      setCards(await marksApi.list(termId, !all));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the mark sheets.'));
    }
  }, [termId, all]);

  useEffect(() => {
    load();
  }, [load]);

  const byClass = useMemo(() => {
    const groups = new Map<string, SheetCard[]>();
    for (const card of cards ?? [])
      groups.set(card.className, [...(groups.get(card.className) ?? []), card]);
    return [...groups.entries()];
  }, [cards]);

  return (
    <>
      <PageHeader
        title="Mark sheets"
        subtitle="Enter each class's marks for the term, then submit them."
      />
      <Group justify="space-between" mb="md" align="flex-end">
        <TermPicker terms={terms} termId={termId} onChange={setTermId} />
        <Switch
          label="All classes"
          description={isHead ? undefined : 'Find a subject nobody teaches yet'}
          checked={all}
          onChange={(e) => setAll(e.currentTarget.checked)}
          color="fastrackRed"
        />
      </Group>
      {error || termsError ? (
        <Alert color="red" title="Unable to load the mark sheets">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error ?? termsError}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !cards ? (
        <Loader />
      ) : cards.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {all
            ? 'No classes take subjects yet. Set them up in School setup → Subjects.'
            : "You aren't assigned to any subject, and your class has no unassigned ones. Turn on All classes to find one."}
        </Text>
      ) : (
        <Stack gap="lg">
          {byClass.map(([className, list]) => (
            <Stack key={className} gap="xs">
              <Text fw={700}>{className}</Text>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {list.map((card) => (
                  <Card
                    key={card.subjectId}
                    withBorder
                    radius="lg"
                    p="md"
                    component={Link}
                    href={sheetHref(termId!, card.classId, card.subjectId)}
                  >
                    <Group justify="space-between" wrap="nowrap" mb={6}>
                      <Text fw={600} truncate>
                        {card.subjectName}
                      </Text>
                      <Badge size="sm" variant="light" color={STATUS[card.status].color}>
                        {STATUS[card.status].label}
                      </Badge>
                    </Group>
                    <Progress
                      value={card.expected ? (card.entered / card.expected) * 100 : 0}
                      color={card.entered >= card.expected && card.expected > 0 ? 'green' : 'blue'}
                      size="sm"
                    />
                    <Group justify="space-between" mt={6}>
                      <Text size="xs" c="dimmed">
                        {card.entered} of {card.expected} marks
                      </Text>
                      <Text size="xs" c="dimmed" truncate maw="60%">
                        {card.anyTeacher
                          ? 'Any teacher can mark'
                          : card.teachers.map((t) => t.name).join(', ')}
                      </Text>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          ))}
        </Stack>
      )}
    </>
  );
}
