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
import { useAuth, type AuthUser } from '@/lib/auth';
import { canAccessRoute } from '@/lib/rbac';
import { isParentApiMocked } from '../config';
import { userInitials } from '../domain/wards';
import { InstallCard } from '../pwa';
import { parentRoutes } from '../routes';
import { PageTitle } from '../ui';

const COLOR_SCHEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

export function MorePage() {
  const { user, logout } = useAuth();
  const canManageWards = canAccessRoute(user, 'parentWards');

  return (
    <>
      <PageTitle title="More" />
      <Stack gap="md">
        {user && <AccountCard user={user} />}

        {canManageWards && (
          <Card withBorder radius="lg" padding={4}>
            <MenuLink href={parentRoutes.wards} label="My children" icon={<Users size={18} />} />
            <MenuLink
              href={parentRoutes.linkWard}
              label="Link a child"
              icon={<UserPlus size={18} />}
            />
          </Card>
        )}

        <InstallCard dismissible={false} />
        <AppearanceCard />

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

function AccountCard({ user }: { user: AuthUser }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group wrap="nowrap">
        <Avatar radius="xl" size={52} color="fastrackRed">
          {userInitials(user)}
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
  );
}

function MenuLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      component={Link}
      href={href}
      label={label}
      leftSection={icon}
      rightSection={<ChevronRight size={16} />}
      style={{ borderRadius: 12 }}
    />
  );
}

function AppearanceCard() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
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
          data={COLOR_SCHEMES}
        />
      </Group>
    </Card>
  );
}
