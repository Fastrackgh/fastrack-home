'use client';

import { Badge, Card, Group, SimpleGrid, Text } from '@mantine/core';
import { splitSubjects } from '../domain/reports';
import type { TermReport } from '../types';

/** Subjects described in words (Montessori and early years), one card each. */
export function DescriptorSubjects({ report }: { report: TermReport }) {
  const { described } = splitSubjects(report);
  if (described.length === 0) return null;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {described.map((subject) => (
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
