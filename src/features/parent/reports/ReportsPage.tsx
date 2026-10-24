'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react';
import { useLeaveOnWardChange } from '../ActiveWardProvider';
import { parentApi, parentAreaReady } from '../api';
import { ComingSoon, EmptyState, PageTitle, QueryView, WithWard } from '../components';
import { DocumentModal } from '../DocumentFrame';
import { formatDate, wardName } from '../format';
import type { TermReport, Ward } from '../types';
import { useParentQuery } from '../useParentQuery';

const ordinal = (n: number) => {
  const suffix = ['th', 'st', 'nd', 'rd'][
    (n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10
  ];
  return `${n}${suffix}`;
};

/** "2nd", or "2nd=" when another pupil shares the place. */
const place = (n: number, tied?: boolean) => `${ordinal(n)}${tied ? '=' : ''}`;

export const gradeColor = (grade?: string | null) =>
  ({ A: 'green', B: 'teal', C: 'blue', D: 'orange' })[grade?.charAt(0) ?? ''] ?? 'red';

export function ReportsPage() {
  if (!parentAreaReady.reports) {
    return (
      <>
        <PageTitle title="Reports" />
        <ComingSoon icon={<FileText size={22} />} area="Terminal reports" />
      </>
    );
  }
  return (
    <WithWard module="results">
      {(ward) => <WardReports key={ward.studentId} ward={ward} />}
    </WithWard>
  );
}

function WardReports({ ward }: { ward: Ward }) {
  const query = useParentQuery(`reports:${ward.studentId}`, () =>
    parentApi.listReports(ward.studentId),
  );
  return (
    <>
      <PageTitle title="Reports" subtitle={`Terminal reports for ${wardName(ward)}`} />
      <QueryView
        query={query}
        empty={{
          when: (reports) => reports.length === 0,
          render: () => (
            <EmptyState
              icon={<FileText size={22} />}
              title="No reports yet"
              message="Reports appear here when the school publishes them at the end of each term."
            />
          ),
        }}
      >
        {(reports) => (
          <Stack gap="sm">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </Stack>
        )}
      </QueryView>
    </>
  );
}

function ReportCard({ report }: { report: TermReport }) {
  return (
    <UnstyledButton component={Link} href={`/parent/reports/${report.id}`}>
      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" wrap="nowrap">
          <div style={{ minWidth: 0 }}>
            <Text fw={700}>
              {report.termLabel}, {report.yearLabel}
            </Text>
            <Text size="xs" c="dimmed">
              {[
                report.className,
                (report.revision ?? 1) > 1 && report.updatedAt
                  ? `Updated ${formatDate(report.updatedAt)}`
                  : `Published ${formatDate(report.publishedAt)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </div>
          <Group gap="sm" wrap="nowrap">
            {report.average != null && (
              <div style={{ textAlign: 'right' }}>
                <Text fw={700}>{report.average}%</Text>
                {report.position != null && (
                  <Text size="xs" c="dimmed">
                    {place(report.position, report.positionTied)}
                    {report.classSize ? ` of ${report.classSize}` : ''}
                  </Text>
                )}
              </div>
            )}
            {report.overallGrade && (
              <Badge size="lg" variant="light" color={gradeColor(report.overallGrade)}>
                {report.overallGrade}
              </Badge>
            )}
            <ChevronRight size={18} color="var(--mantine-color-gray-5)" />
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fw={800} size="lg" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </Text>
    </Card>
  );
}

export function ReportView({ reportId }: { reportId: string }) {
  useLeaveOnWardChange('/parent/reports');
  return (
    <>
      <Anchor
        component={Link}
        href="/parent/reports"
        size="sm"
        c="dimmed"
        mb="md"
        display="inline-flex"
        style={{ alignItems: 'center', gap: 4 }}
      >
        <ArrowLeft size={14} /> Reports
      </Anchor>
      {parentAreaReady.reports ? (
        <WithWard module="results">
          {(ward) => <WardReport ward={ward} reportId={reportId} />}
        </WithWard>
      ) : (
        <ComingSoon icon={<FileText size={22} />} area="Terminal reports" />
      )}
    </>
  );
}

function WardReport({ ward, reportId }: { ward: Ward; reportId: string }) {
  const [viewing, setViewing] = useState(false);
  const query = useParentQuery(`report:${ward.studentId}:${reportId}`, () =>
    parentApi.getReport(ward.studentId, reportId),
  );
  return (
    <QueryView query={query}>
      {(report) => (
        <Stack gap="md">
          <div>
            <Title
              order={2}
              fz={{ base: 22, sm: 26 }}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {report.termLabel}, {report.yearLabel}
            </Title>
            <Text size="sm" c="dimmed">
              {wardName(ward)}
              {report.className ? ` · ${report.className}` : ''}
            </Text>
          </div>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            {report.average != null && <Stat label="Average" value={`${report.average}%`} />}
            {report.overallGrade && <Stat label="Grade" value={report.overallGrade} />}
            {report.position != null && (
              <Stat
                label="Position"
                value={`${place(report.position, report.positionTied)}${report.classSize ? ` / ${report.classSize}` : ''}`}
              />
            )}
            {report.aggregate != null && <Stat label="Aggregate" value={report.aggregate} />}
            {report.attendance && (
              <Stat
                label="Attendance"
                value={`${report.attendance.present} / ${report.attendance.total}`}
              />
            )}
          </SimpleGrid>
          {(report.revision ?? 1) > 1 && report.updatedAt && (
            <Text size="sm" c="dimmed">
              The school corrected this report on {formatDate(report.updatedAt)}.
            </Text>
          )}

          <SubjectsTable report={report} />
          <DescriptorSubjects report={report} />

          {(report.teacherRemark || report.headRemark || promotionText(report)) && (
            <Card withBorder radius="lg" padding="lg">
              <Stack gap="sm">
                {report.teacherRemark && (
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                      Class teacher
                    </Text>
                    <Text size="sm">{report.teacherRemark}</Text>
                  </div>
                )}
                {report.headRemark && (
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                      Head teacher
                    </Text>
                    <Text size="sm">{report.headRemark}</Text>
                  </div>
                )}
                {promotionText(report) && <Text size="sm">{promotionText(report)}</Text>}
                {report.nextTermBegins && (
                  <Text size="sm" c="dimmed">
                    Next term begins {formatDate(report.nextTermBegins)}.
                  </Text>
                )}
              </Stack>
            </Card>
          )}

          <Button
            variant="default"
            leftSection={<FileText size={16} />}
            onClick={() => setViewing(true)}
          >
            View report card
          </Button>
          <DocumentModal
            opened={viewing}
            onClose={() => setViewing(false)}
            title={`Report · ${report.termLabel}, ${report.yearLabel}`}
            cacheKey={`report-doc:${ward.studentId}:${report.id}`}
            load={() => parentApi.reportDocument(ward.studentId, report.id)}
          />
        </Stack>
      )}
    </QueryView>
  );
}

/** The end-of-year decision, from the newer `promotion` or the older `promotedTo`. */
function promotionText(report: TermReport): string | null {
  const p = report.promotion;
  const status = p?.status.toLowerCase();
  if (status === 'promoted') return p?.toClass ? `Promoted to ${p.toClass}.` : 'Promoted.';
  if (status === 'repeated') return 'Repeats the year.';
  if (status === 'graduated') return 'Graduated.';
  if (!report.promotedTo) return null;
  return ['Graduated', 'Repeated'].includes(report.promotedTo)
    ? `${report.promotedTo}.`
    : `Promoted to ${report.promotedTo}.`;
}

const notCounted: Record<string, string> = {
  incomplete: 'INC',
  exempt: 'Exempt',
  missing: '–',
  not_assessed: 'Not assessed',
};

/**
 * Subjects marked with numbers. A school with its own parts (e.g. coursework,
 * mid-term, exam) gets a column for each; otherwise class and exam scores.
 */
function SubjectsTable({ report }: { report: TermReport }) {
  const subjects = (report.subjects ?? []).filter((s) => s.mode !== 'descriptor');
  if (subjects.length === 0) return null;
  const parts = report.components?.length ? report.components : null;
  const positions = subjects.some((s) => s.position != null);
  return (
    <Card withBorder radius="lg" padding={0}>
      <Table.ScrollContainer minWidth={420}>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Subject</Table.Th>
              {parts ? (
                parts.map((c) => (
                  <Table.Th key={c.key} ta="right">
                    {c.shortLabel || c.label}
                    <Text span size="xs" c="dimmed">
                      {' '}
                      {c.weight}%
                    </Text>
                  </Table.Th>
                ))
              ) : (
                <>
                  <Table.Th ta="right">Class</Table.Th>
                  <Table.Th ta="right">Exam</Table.Th>
                </>
              )}
              <Table.Th ta="right">Total</Table.Th>
              <Table.Th>Grade</Table.Th>
              {positions && <Table.Th ta="right">Position</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {subjects.map((subject) => {
              const counted = !subject.status || subject.status === 'ok';
              return (
                <Table.Tr key={subject.subject} c={counted ? undefined : 'dimmed'}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {subject.subject}
                    </Text>
                    {subject.remark && (
                      <Text size="xs" c="dimmed">
                        {subject.remark}
                      </Text>
                    )}
                  </Table.Td>
                  {parts ? (
                    parts.map((c) => (
                      <Table.Td key={c.key} ta="right">
                        {subject.componentScores?.find((x) => x.key === c.key)?.display ?? '–'}
                      </Table.Td>
                    ))
                  ) : (
                    <>
                      <Table.Td ta="right">{subject.classScore ?? '–'}</Table.Td>
                      <Table.Td ta="right">{subject.examScore ?? '–'}</Table.Td>
                    </>
                  )}
                  <Table.Td ta="right" fw={700}>
                    {counted ? (subject.total ?? '–') : notCounted[subject.status!]}
                  </Table.Td>
                  <Table.Td>
                    {subject.grade && counted && (
                      <Badge variant="light" color={gradeColor(subject.grade)}>
                        {subject.grade}
                      </Badge>
                    )}
                  </Table.Td>
                  {positions && (
                    <Table.Td ta="right">
                      {subject.position != null
                        ? place(subject.position, subject.positionTied)
                        : ''}
                    </Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

/** Subjects described in words (Montessori and early years), one card each. */
function DescriptorSubjects({ report }: { report: TermReport }) {
  const subjects = (report.subjects ?? []).filter((s) => s.mode === 'descriptor');
  if (subjects.length === 0) return null;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {subjects.map((subject) => (
        <Card key={subject.subject} withBorder radius="lg" padding="md">
          <Group justify="space-between" mb={subject.strands?.length ? 'xs' : 0}>
            <Text fw={600}>{subject.subject}</Text>
            {subject.descriptor && <Badge variant="light">{subject.descriptor}</Badge>}
          </Group>
          {subject.strands?.map((strand) => (
            <Group key={strand.label} justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {strand.label}
              </Text>
              <Text size="sm" fw={500}>
                {strand.descriptor}
              </Text>
            </Group>
          ))}
        </Card>
      ))}
    </SimpleGrid>
  );
}
