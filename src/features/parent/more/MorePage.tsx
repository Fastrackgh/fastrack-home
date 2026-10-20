'use client';

import React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Card,
  Group,
  NavLink,
  SegmentedControl,
  Stack,
  Text,
  useMantineColorScheme,
  type MantineColorScheme,
} from '@mantine/core';
import { ChevronRight, LogOut, Moon, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { canAccessRoute } from '@/lib/rbac';
import { isParentApiMocked } from '../api';
import { PageTitle } from '../components';
import { InstallCard } from '../pwa';

export function MorePage() {
  const { user, logout } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const links: { href: string; label: string; icon: React.ReactNode; show: boolean }[] = [
    {
      href: '/parent/wards',
      label: 'My children',
      icon: <Users size={18} />,
      show: canAccessRoute(user, 'parentWards'),
    },
    {
      href: '/parent/wards/link',
      label: 'Link a child',
      icon: <UserPlus size={18} />,
      show: canAccessRoute(user, 'parentWards'),
    },
  ];

  return (
    <>
      <PageTitle title="More" />
      <Stack gap="md">
        {user && (
          <Card withBorder radius="lg" padding="lg">
            <Group wrap="nowrap">
              <Avatar radius="xl" size={52} color="fastrackRed">
                {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Text fw={700}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text size="sm" c="dimmed" truncate>
                  {user.email}
                </Text>
                {user.phone && (
                  <Text size="sm" c="dimmed">
                    {user.phone}
                  </Text>
                )}
              </div>
            </Group>
          </Card>
        )}

        <Card withBorder radius="lg" padding={4}>
          {links
            .filter((link) => link.show)
            .map((link) => (
              <NavLink
                key={link.href}
                component={Link}
                href={link.href}
                label={link.label}
                leftSection={link.icon}
                rightSection={<ChevronRight size={16} />}
                style={{ borderRadius: 12 }}
              />
            ))}
        </Card>

        <InstallCard dismissible={false} />

        <Card withBorder radius="lg" padding="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <Moon size={18} />
              <Text size="sm" fw={500}>
                Appearance
              </Text>
            </Group>
            <SegmentedControl
              size="xs"
              value={colorScheme}
              onChange={(value) => setColorScheme(value as MantineColorScheme)}
              data={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
          </Group>
        </Card>

        <Card withBorder radius="lg" padding={4}>
          <NavLink
            label="Sign out"
            c="red"
            leftSection={<LogOut size={18} />}
            onClick={logout}
            style={{ borderRadius: 12 }}
          />
        </Card>

        {isParentApiMocked && (
          <Text size="xs" c="dimmed" ta="center">
            Sample data mode: fees, reports and attendance are not real.
          </Text>
        )}
      </Stack>
    </>
  );
}
