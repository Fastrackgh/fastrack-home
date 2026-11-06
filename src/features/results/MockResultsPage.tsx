'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/features/workspace';
import { APP_ROUTES } from '@/lib/rbac';
import { errorMessage } from '@/lib/api-client';
import {
  assessmentsApi,
  notifiedMessage,
  papersMessage,
  type AssessmentResults,
} from './assessments-api';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

const sheetHref = (r: AssessmentResults, subjectId: string) =>
  `${APP_ROUTES.marks.path}/sheet?${new URLSearchParams({
    termId: r.assessment.termId,
    classId: r.assessment.classId,
    subjectId,
  })}`;

/** One mock's results: marking progress per subject, the class broadsheet, and publishing to parents (heads). */
export function MockResultsPage() {
  const id = useSearchParams().get('id') ?? '';
  const { can } = useAuth();
  const isHead = can('reports:approve');
  const [data, setData] = useState<AssessmentResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await assessmentsApi.results(id));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the results.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = async () => {
    setPublishing(true);
    try {
      const { notified, ...results } = await assessmentsApi.publish(id);
      setData(results);
      const short =
        notified.email.failed + notified.sms.failed > 0 ||
        notified.email.sent + notified.sms.sent === 0;
      notifications.show({
        color: short ? 'orange' : 'green',
        title: 'Published to parents',
        message: notifiedMessage(notified),
        autoClose: short ? false : undefined,
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not published',
        message: errorMessage(err, 'Try again.'),
      });
    } finally {
      setPublishing(false);
    }
  };

  const addMissing = async () => {
    setAdding(true);
    try {
      const res = await assessmentsApi.addMissingPapers(id);
      notifications.show({
        color: res.skipped.length ? 'orange' : 'green',
        title: res.added.length ? 'Subjects added' : 'Nothing added',
        message: papersMessage(res),
        autoClose: false,
      });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not added',
        message: errorMessage(err, 'Try again.'),
      });
    } finally {
      setAdding(false);
    }
  };

  const back = (
    <Anchor component={Link} href={APP_ROUTES.mocks.path} size="sm" c="fastrackRed">
      <Group gap={4}>
        <ArrowLeft size={14} /> Mock exams
      </Group>
    </Anchor>
  );
  if (error)
    return (
      <Stack>
        {back}
        <Alert color="red" title="Unable to load the results">
          <Text size="sm">{error}</Text>
        </Alert>
      </Stack>
    );
  if (!data) return <Loader />;

  const { assessment: mock } = data;
  const published = mock.status === 'published';
  const pupils = data.pupils.filter((p) => !p.left);
  const notIncluded = data.notIncluded ?? [];
  return (
    <>
      {back}
      <PageHeader
        title={`${mock.title}, ${mock.className}`}
        subtitle={`${mock.termLabel}${mock.yearLabel ? ` ${mock.yearLabel}` : ''} · each paper out of ${mock.maxRaw}${mock.takenOn ? ` · written ${mock.takenOn}` : ''}`}
      />
      <Group justify="space-between" mb="md">
        <Badge size="lg" variant="light" color={published ? 'green' : 'gray'}>
          {published
            ? `Published${mock.revision > 1 ? ` (revision ${mock.revision})` : ''}`
            : 'Draft: parents can’t see it yet'}
        </Badge>
        {isHead && (
          <Button
            leftSection={<Send size={14} />}
            color="fastrackRed"
            radius="md"
            onClick={publish}
            loading={publishing}
            disabled={!data.complete}
          >
            {published ? 'Republish to parents' : 'Publish to parents'}
          </Button>
        )}
      </Group>
      {!data.complete && (
        <Text size="sm" c="dimmed" mb="md">
          Publishing opens once every paper is marked. Teachers enter the marks on their mark
          sheets, in the {mock.title} column.
        </Text>
      )}
      {notIncluded.length > 0 && (
        <Alert color="orange" radius="md" mb="md" title={`Not in ${mock.title}`}>
          <Group justify="space-between" align="center" gap="sm">
            <Text size="sm">
              {notIncluded.map((s) => s.name).join(', ')}{' '}
              {notIncluded.length === 1 ? 'has' : 'have'} no {mock.title} paper, so{' '}
              {notIncluded.length === 1 ? 'it isn’t' : 'they aren’t'} in these results.
              {published && ' Parents keep seeing the published results until you republish.'}
            </Text>
            {isHead && (
              <Button
                size="xs"
                variant="light"
                color="orange"
                radius="md"
                onClick={addMissing}
                loading={adding}
              >
                Add {notIncluded.length === 1 ? 'it' : 'them'} to {mock.title}
              </Button>
            )}
          </Group>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        {data.subjects.map((s) => (
          <Card key={s.subjectId} withBorder radius="md" p="sm">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" fw={600} truncate>
                {s.name}
              </Text>
              <Anchor component={Link} href={sheetHref(data, s.subjectId)} size="xs">
                Mark sheet
              </Anchor>
            </Group>
            <Text size="xs" c="dimmed" mb={4}>
              {s.entered} of {s.expected} marked
            </Text>
            <Progress
              value={s.expected ? (s.entered / s.expected) * 100 : 0}
              color={s.entered >= s.expected ? 'green' : 'orange'}
              size="sm"
            />
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder radius="lg" p={0}>
        <ScrollArea>
          <Table verticalSpacing="sm" horizontalSpacing="md" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pupil</Table.Th>
                {data.subjects.map((s) => (
                  <Table.Th key={s.subjectId} ta="center">
                    {s.name}
                  </Table.Th>
                ))}
                <Table.Th ta="center">Average</Table.Th>
                <Table.Th ta="center">Position</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pupils.map((p) => (
                <Table.Tr key={p.schoolStudentId}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {p.fullName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {p.studentCode}
                    </Text>
                  </Table.Td>
                  {data.subjects.map((s) => {
                    const line = p.subjects.find((x) => x.subjectId === s.subjectId);
                    return (
                      <Table.Td key={s.subjectId} ta="center">
                        {line?.score == null ? (
                          <Text size="sm" c="dimmed">
                            {line?.status === 'exempt' ? 'Exempt' : '—'}
                          </Text>
                        ) : (
                          <Group gap={6} justify="center" wrap="nowrap">
                            <Text size="sm">{line.score}</Text>
                            {line.grade && (
                              <Badge size="sm" variant="light">
                                {line.grade}
                              </Badge>
                            )}
                          </Group>
                        )}
                      </Table.Td>
                    );
                  })}
                  <Table.Td ta="center" fw={700}>
                    {p.average ?? '—'}
                  </Table.Td>
                  <Table.Td ta="center">
                    {p.position == null
                      ? '—'
                      : `${ordinal(p.position)}${p.positionTied ? '=' : ''}`}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
      <Text size="xs" c="dimmed" mt="xs">
        Scores are out of 100, graded on each subject&apos;s own scale. {data.onRoll} on roll.
      </Text>
    </>
  );
}
