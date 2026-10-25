'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { EllipsisVertical, Unlink, UserPlus, Users } from 'lucide-react';

import { errorMessage } from '@/lib/api-client';
import { useActiveWard } from '../ActiveWardProvider';
import { parentApi } from '../api';
import { EmptyState, PageTitle, QueryView } from '../components';
import { wardInitials, wardName, wardPlacement, wardStatusColor, wardStatusLabel } from '../format';
import type { Ward } from '../types';

export function WardsPage() {
  const { query, activeWard, selectWard } = useActiveWard();
  const [unlinking, setUnlinking] = useState<Ward | null>(null);
  const [busy, setBusy] = useState(false);

  const unlink = async () => {
    if (!unlinking) return;
    setBusy(true);
    try {
      await parentApi.unlinkWard(unlinking.studentId);
      notifications.show({
        color: 'green',
        message: `${wardName(unlinking)} was removed from your account.`,
      });
      setUnlinking(null);
      query.reload();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Could not remove',
        message: errorMessage(err, 'Try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle
        title="My children"
        subtitle="Children linked to your account"
        action={
          <Button
            component={Link}
            href="/parent/wards/link"
            size="sm"
            color="fastrackRed"
            leftSection={<UserPlus size={16} />}
          >
            Link
          </Button>
        }
      />
      <QueryView
        query={query}
        empty={{
          when: (wards) => wards.length === 0,
          render: () => (
            <EmptyState
              icon={<Users size={22} />}
              title="No children linked yet"
              message="Use the student code from your child's school to link them."
              action={
                <Button component={Link} href="/parent/wards/link" color="fastrackRed" mt="xs">
                  Link a child
                </Button>
              }
            />
          ),
        }}
      >
        {(wards) => (
          <Stack gap="sm">
            {wards.map((ward) => {
              const isActive = ward.studentId === activeWard?.studentId;
              return (
                <Card key={ward.studentId} withBorder radius="lg" padding="md">
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
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`Options for ${wardName(ward)}`}
                        >
                          <EllipsisVertical size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          color="red"
                          leftSection={<Unlink size={14} />}
                          onClick={() => setUnlinking(ward)}
                        >
                          Remove from my account
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                  <Group gap="xs" mt="md" grow>
                    <Button
                      component={Link}
                      href={`/parent/wards/${ward.studentId}`}
                      variant="default"
                      size="xs"
                      onClick={() => selectWard(ward.studentId)}
                    >
                      View profile
                    </Button>
                    {!isActive && (
                      <Button
                        variant="light"
                        color="fastrackRed"
                        size="xs"
                        onClick={() => selectWard(ward.studentId)}
                      >
                        Show this child
                      </Button>
                    )}
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}
      </QueryView>

      <Modal
        opened={unlinking !== null}
        onClose={() => setUnlinking(null)}
        title="Remove child?"
        radius="lg"
        centered
      >
        <Text size="sm">
          You will no longer see {unlinking ? wardName(unlinking) : ''}&apos;s fees, reports or
          attendance. You can link them again later with their student code.
        </Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={() => setUnlinking(null)}>
            Cancel
          </Button>
          <Button color="red" loading={busy} onClick={unlink}>
            Remove
          </Button>
        </Group>
      </Modal>
    </>
  );
}
