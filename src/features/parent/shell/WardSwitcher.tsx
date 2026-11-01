'use client';

import Link from 'next/link';
import { Avatar, Menu, Text, UnstyledButton } from '@mantine/core';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { useActiveWard } from '../data/ActiveWardProvider';
import { wardInitials, wardName } from '../domain/wards';
import { parentRoutes } from '../routes';
import classes from './ParentShell.module.css';

/** The child shown across the portal, with a menu to switch to another. */
export function WardSwitcher() {
  const { wards, activeWard, selectWard } = useActiveWard();
  if (!activeWard) {
    return (
      <Text fw={800} className="font-heading">
        Fastrack
      </Text>
    );
  }
  return (
    <Menu position="bottom-start" width={280} radius="md" shadow="md">
      <Menu.Target>
        <UnstyledButton className={classes.wardButton} aria-label="Switch child">
          <Avatar color="fastrackRed" radius="xl" size={36}>
            {wardInitials(activeWard)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" truncate>
              {wardName(activeWard)}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {activeWard.currentClass?.name ?? activeWard.school.name}
            </Text>
          </div>
          {wards.length > 1 && <ChevronsUpDown size={14} />}
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Your children</Menu.Label>
        {wards.map((ward) => (
          <Menu.Item
            key={ward.studentId}
            onClick={() => selectWard(ward.studentId)}
            leftSection={
              <Avatar color="fastrackRed" radius="xl" size={28}>
                {wardInitials(ward)}
              </Avatar>
            }
            rightSection={ward.studentId === activeWard.studentId ? <Check size={14} /> : null}
          >
            <Text size="sm" fw={600}>
              {wardName(ward)}
            </Text>
            <Text size="xs" c="dimmed">
              {ward.school.name}
            </Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          component={Link}
          href={parentRoutes.linkWard}
          leftSection={<UserPlus size={16} />}
        >
          Link another child
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
