'use client';

import { Card, Stack, Text } from '@mantine/core';
import { formatDate } from '../domain/format';
import { promotionText } from '../domain/reports';
import type { TermReport } from '../types';

function Remark({ by, text }: { by: string; text: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {by}
      </Text>
      <Text size="sm">{text}</Text>
    </div>
  );
}

/** The teachers' remarks, the end-of-year decision, and when the next term starts. */
export function ReportRemarks({ report }: { report: TermReport }) {
  const promotion = promotionText(report);
  if (!report.teacherRemark && !report.headRemark && !promotion) return null;
  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="sm">
        {report.teacherRemark && <Remark by="Class teacher" text={report.teacherRemark} />}
        {report.headRemark && <Remark by="Head teacher" text={report.headRemark} />}
        {promotion && <Text size="sm">{promotion}</Text>}
        {report.nextTermBegins && (
          <Text size="sm" c="dimmed">
            Next term begins {formatDate(report.nextTermBegins)}.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
