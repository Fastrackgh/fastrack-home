'use client';

import { Avatar, Badge, Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  wardInitials,
  wardName,
  wardPlacement,
  wardStatusColor,
  wardStatusLabel,
} from '../domain/wards';
import type { Ward } from '../types';

/** The child the page is about. */
export function WardHeader({ ward }: { ward: Ward }) {
  return (
    <Card radius="lg" padding="lg" withBorder>
      <Group wrap="nowrap">
        <Avatar color="fastrackRed" radius="xl" size={56}>
          {wardInitials(ward)}
        </Avatar>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text fw={700} size="lg">
            {wardName(ward)}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {wardPlacement(ward)}
          </Text>
        </div>
        <Badge variant="light" color={wardStatusColor(ward.status)}>
          {wardStatusLabel(ward.status)}
        </Badge>
      </Group>
    </Card>
  );
}

/** The parent's other linked children, each a tap away from being shown. */
export function OtherWards({ wards, onSelect }: { wards: Ward[]; onSelect: (id: string) => void }) {
  if (wards.length === 0) return null;
  return (
    <div>
      <Text size="sm" fw={700} mb="xs">
        Your other children
      </Text>
      <Stack gap="xs">
        {wards.map((ward) => (
          <UnstyledButton key={ward.studentId} onClick={() => onSelect(ward.studentId)}>
            <Card withBorder radius="lg" padding="sm">
              <Group wrap="nowrap">
                <Avatar color="gray" radius="xl" size={36}>
                  {wardInitials(ward)}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600}>
                    {wardName(ward)}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {wardPlacement(ward)}
                  </Text>
                </div>
                <Text size="xs" c="fastrackRed" fw={600}>
                  Switch
                </Text>
              </Group>
            </Card>
          </UnstyledButton>
        ))}
      </Stack>
    </div>
  );
}
