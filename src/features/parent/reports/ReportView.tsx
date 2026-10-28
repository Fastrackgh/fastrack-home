'use client';

import { SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { FileText } from 'lucide-react';
import { parentAreaReady } from '../config';
import { useLeaveOnWardChange } from '../data/ActiveWardProvider';
import { parentDocuments, useReport } from '../data/queries';
import { formatDate } from '../domain/format';
import { isRevised, positionLabel } from '../domain/reports';
import { wardName } from '../domain/wards';
import { parentRoutes } from '../routes';
import type { TermReport, Ward } from '../types';
import { BackLink, ComingSoon, DocumentButton, QueryView, StatCard, WithWard } from '../ui';
import { DescriptorSubjects } from './DescriptorSubjects';
import { ReportRemarks } from './ReportRemarks';
import { SubjectsTable } from './SubjectsTable';

export function ReportView({ reportId }: { reportId: string }) {
  useLeaveOnWardChange(parentRoutes.reports);
  return (
    <>
      <BackLink href={parentRoutes.reports}>Reports</BackLink>
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
  const query = useReport(ward.studentId, reportId);
  return (
    <QueryView query={query}>
      {(report) => (
        <Stack gap="md">
          <div>
            <Title order={2} fz={{ base: 22, sm: 26 }}>
              {report.termLabel}, {report.yearLabel}
            </Title>
            <Text size="sm" c="dimmed">
              {wardName(ward)}
              {report.className ? ` · ${report.className}` : ''}
            </Text>
          </div>
          <ReportStats report={report} />
          {isRevised(report) && (
            <Text size="sm" c="dimmed">
              The school corrected this report on {formatDate(report.updatedAt)}.
            </Text>
          )}
          <SubjectsTable report={report} />
          <DescriptorSubjects report={report} />
          <ReportRemarks report={report} />
          <DocumentButton
            label="View report card"
            title={`Report · ${report.termLabel}, ${report.yearLabel}`}
            source={parentDocuments.report(ward.studentId, report.id)}
          />
        </Stack>
      )}
    </QueryView>
  );
}

function ReportStats({ report }: { report: TermReport }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {report.average != null && <StatCard label="Average" value={`${report.average}%`} />}
      {report.overallGrade && <StatCard label="Grade" value={report.overallGrade} />}
      {report.position != null && (
        <StatCard
          label="Position"
          value={positionLabel(report.position, report.positionTied, report.classSize, ' / ')}
        />
      )}
      {report.aggregate != null && <StatCard label="Aggregate" value={report.aggregate} />}
      {report.attendance && (
        <StatCard
          label="Attendance"
          value={`${report.attendance.present} / ${report.attendance.total}`}
        />
      )}
    </SimpleGrid>
  );
}
