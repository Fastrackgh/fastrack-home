'use client';

import { Badge, Group, Stack, Text } from '@mantine/core';
import { FileText } from 'lucide-react';
import { parentAreaReady } from '../config';
import { useReports } from '../data/queries';
import { joinDetails } from '../domain/format';
import { gradeColor, positionLabel, publicationNote } from '../domain/reports';
import { wardName } from '../domain/wards';
import { parentRoutes } from '../routes';
import type { TermReport, Ward } from '../types';
import {
  ComingSoon,
  EmptyState,
  LinkCard,
  PageTitle,
  QueryView,
  RowChevron,
  WithWard,
} from '../ui';

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
  const query = useReports(ward.studentId);
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
    <LinkCard href={parentRoutes.report(report.id)}>
      <div style={{ minWidth: 0 }}>
        <Text fw={700}>
          {report.termLabel}, {report.yearLabel}
        </Text>
        <Text size="xs" c="dimmed">
          {joinDetails(report.className, publicationNote(report))}
        </Text>
      </div>
      <Group gap="sm" wrap="nowrap">
        {report.average != null && (
          <div style={{ textAlign: 'right' }}>
            <Text fw={700}>{report.average}%</Text>
            {report.position != null && (
              <Text size="xs" c="dimmed">
                {positionLabel(report.position, report.positionTied, report.classSize, ' of ')}
              </Text>
            )}
          </div>
        )}
        {report.overallGrade && (
          <Badge size="lg" variant="light" color={gradeColor(report.overallGrade)}>
            {report.overallGrade}
          </Badge>
        )}
        <RowChevron />
      </Group>
    </LinkCard>
  );
}
