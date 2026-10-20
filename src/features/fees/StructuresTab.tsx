'use client';

import { Badge, Group, Loader, ScrollArea, Stack, Table, Text } from '@mantine/core';
import type { FeeStructure } from './api';
import { formatGhs } from './money';

export function StructuresTab({
  structures,
  loading,
}: {
  structures: FeeStructure[];
  loading: boolean;
}) {
  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">
          Active fee schedules configured for current school cohorts & terms.
        </Text>
      </Group>

      <ScrollArea>
        <Table verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fee Type</Table.Th>
              <Table.Th>Class Cohort</Table.Th>
              <Table.Th>Academic Term</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Category</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Stack align="center" py="xl">
                    <Loader size="sm" color="fastrackRed" />
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ) : structures.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    No fee structures found.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              structures.map((s) => (
                <Table.Tr key={s.id}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {s.feeTypeName}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue" radius="sm">
                      {s.className || 'All School'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {s.termLabel || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700} size="sm">
                      {formatGhs(s.amount)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color={s.isOptional ? 'orange' : 'teal'} radius="sm">
                      {s.isOptional ? 'Optional / Elective' : 'Mandatory'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
}
