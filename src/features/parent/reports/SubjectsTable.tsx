'use client';

import { Badge, Card, Table, Text } from '@mantine/core';
import { place } from '@/lib/format';
import { gradeColor, isCounted, splitSubjects, subjectTotal } from '../domain/reports';
import type { ReportComponent, SubjectResult, TermReport } from '../types';

/**
 * Subjects marked with numbers. A school with its own parts (e.g. coursework,
 * mid-term, exam) gets a column for each; otherwise class and exam scores.
 */
export function SubjectsTable({ report }: { report: TermReport }) {
  const { scored } = splitSubjects(report);
  if (scored.length === 0) return null;
  const parts = report.components?.length ? report.components : null;
  const showPositions = scored.some((s) => s.position != null);
  return (
    <Card withBorder radius="lg" padding={0}>
      <Table.ScrollContainer minWidth={420}>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Subject</Table.Th>
              {parts ? (
                parts.map((part) => <PartHeading key={part.key} part={part} />)
              ) : (
                <>
                  <Table.Th ta="right">Class</Table.Th>
                  <Table.Th ta="right">Exam</Table.Th>
                </>
              )}
              <Table.Th ta="right">Total</Table.Th>
              <Table.Th>Grade</Table.Th>
              {showPositions && <Table.Th ta="right">Position</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {scored.map((subject) => (
              <SubjectRow
                key={subject.subject}
                subject={subject}
                parts={parts}
                showPosition={showPositions}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

function PartHeading({ part }: { part: ReportComponent }) {
  return (
    <Table.Th ta="right">
      {part.shortLabel || part.label}
      <Text span size="xs" c="dimmed">
        {' '}
        {part.weight}%
      </Text>
    </Table.Th>
  );
}

function SubjectRow({
  subject,
  parts,
  showPosition,
}: {
  subject: SubjectResult;
  parts: ReportComponent[] | null;
  showPosition: boolean;
}) {
  const counted = isCounted(subject);
  return (
    <Table.Tr c={counted ? undefined : 'dimmed'}>
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
        parts.map((part) => (
          <Table.Td key={part.key} ta="right">
            {subject.componentScores?.find((score) => score.key === part.key)?.display ?? '–'}
          </Table.Td>
        ))
      ) : (
        <>
          <Table.Td ta="right">{subject.classScore ?? '–'}</Table.Td>
          <Table.Td ta="right">{subject.examScore ?? '–'}</Table.Td>
        </>
      )}
      <Table.Td ta="right" fw={700}>
        {subjectTotal(subject)}
      </Table.Td>
      <Table.Td>
        {subject.grade && counted && (
          <Badge variant="light" color={gradeColor(subject.grade)}>
            {subject.grade}
          </Badge>
        )}
      </Table.Td>
      {showPosition && (
        <Table.Td ta="right">
          {subject.position != null ? place(subject.position, subject.positionTied) : ''}
        </Table.Td>
      )}
    </Table.Tr>
  );
}
