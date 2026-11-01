'use client';

import Link from 'next/link';
import { ActionIcon, Avatar, Badge, Button, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { EllipsisVertical, Unlink } from 'lucide-react';
import {
  wardInitials,
  wardName,
  wardPlacement,
  wardStatusColor,
  wardStatusLabel,
} from '../domain/wards';
import { parentRoutes } from '../routes';
import type { Ward } from '../types';

/** A linked child, with ways to show them, open their profile, or unlink them. */
export function WardCard({
  ward,
  isActive,
  onSelect,
  onUnlink,
}: {
  ward: Ward;
  /** The child the rest of the portal is showing. */
  isActive: boolean;
  onSelect: () => void;
  onUnlink: () => void;
}) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Group wrap="nowrap" align="flex-start">
        <Avatar color="fastrackRed" radius="xl" size={48}>
          {wardInitials(ward)}
        </Avatar>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6}>
            <Text fw={700}>{wardName(ward)}</Text>
            {isActive && (
              <Badge size="xs" variant="light" color="fastrackRed">
                Showing
              </Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" truncate>
            {wardPlacement(ward)}
          </Text>
          <Group gap={6} mt={4}>
            <Badge size="sm" variant="light" color={wardStatusColor(ward.status)}>
              {wardStatusLabel(ward.status)}
            </Badge>
            {ward.studentCode && (
              <Badge size="sm" variant="outline" color="gray" tt="none">
                {ward.studentCode}
              </Badge>
            )}
          </Group>
        </Stack>
        <Menu position="bottom-end" radius="md">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" aria-label={`Options for ${wardName(ward)}`}>
              <EllipsisVertical size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item color="red" leftSection={<Unlink size={14} />} onClick={onUnlink}>
              Remove from my account
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      <Group gap="xs" mt="md" grow>
        <Button
          component={Link}
          href={parentRoutes.ward(ward.studentId)}
          variant="default"
          size="xs"
          onClick={onSelect}
        >
          View profile
        </Button>
        {!isActive && (
          <Button variant="light" color="fastrackRed" size="xs" onClick={onSelect}>
            Show this child
          </Button>
        )}
      </Group>
    </Card>
  );
}
