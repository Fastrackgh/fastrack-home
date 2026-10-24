'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Badge, Button, Card, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { errorMessage } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import { reportsApi, type BoardRow } from './reports-api';
import { TermPicker, useTerms } from './TermPicker';

export const BATCH_STATUS: Record<BoardRow['status'], { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'gray' },
  open: { label: 'Marking', color: 'blue' },
  in_review: { label: 'Ready to approve', color: 'yellow' },
  approved: { label: 'Approved', color: 'teal' },
  published: { label: 'Published', color: 'green' },
  reopened: { label: 'Reopened', color: 'orange' },
};

export const classReportHref = (termId: string, classId: string) =>
  `${APP_ROUTES.reports.path}/class?${new URLSearchParams({ termId, classId })}`;

/** Every class's term reports at a glance: marks submitted, remarks written, and what's blocking. */
export function ReportsBoardPage() {
  const { terms, termId, setTermId, error: termsError } = useTerms();
  const { can } = useAuth();
  // Say what this role does here: heads approve, class teachers write remarks, secretaries print.
  const subtitle = can('reports:approve')
    ? "Check each class's marks and remarks, then approve and publish its reports."
    : can('reports:remark')
      ? 'See how each class is doing, and write remarks for your own class.'
      : "See how each class is doing, and print reports once they're worked out.";
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!termId) return;
    setError(null);
    setRows(null);
    try {
      setRows(await reportsApi.board(termId));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the term reports.'));
    }
  }, [termId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader title="Term reports" subtitle={subtitle} />
      <Group mb="md">
        <TermPicker terms={terms} termId={termId} onChange={setTermId} />
      </Group>
      {error || termsError ? (
        <Alert color="red" title="Unable to load the term reports">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error ?? termsError}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !rows ? (
        <Loader />
      ) : rows.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No classes take subjects yet.
        </Text>
      ) : (
        <Card withBorder radius="lg" p={0}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Class</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Mark sheets</Table.Th>
                <Table.Th>Remarks</Table.Th>
                <Table.Th>Waiting on</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => {
                const sheets = row.blockers.filter((b) => b.type === 'sheet_not_submitted');
                const remarks = row.blockers.find((b) => b.type === 'remarks_missing');
                return (
                  <Table.Tr key={row.classId}>
                    <Table.Td fw={600}>{row.className}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={BATCH_STATUS[row.status].color}>
                        {BATCH_STATUS[row.status].label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        c={row.sheetsSubmitted < row.sheetsTotal ? undefined : 'green'}
                      >
                        {row.sheetsSubmitted} of {row.sheetsTotal} submitted
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={row.remarksDone < row.pupils ? undefined : 'green'}>
                        {row.remarksDone} of {row.pupils}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" maw={320}>
                        {[
                          sheets.length &&
                            `Marks: ${sheets.map((b) => ('subjectName' in b ? b.subjectName : '')).join(', ')}`,
                          remarks &&
                            'count' in remarks &&
                            `${remarks.count} remark${remarks.count === 1 ? '' : 's'} to write`,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button
                        component={Link}
                        href={classReportHref(termId!, row.classId)}
                        size="compact-sm"
                        variant="light"
                      >
                        Open
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
