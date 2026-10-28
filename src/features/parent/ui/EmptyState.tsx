'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { AlertCircle, UserPlus } from 'lucide-react';
import { parentRoutes } from '../routes';

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={48} radius="xl" variant="light" color="gray">
          {icon}
        </ThemeIcon>
        <Text fw={700}>{title}</Text>
        {message && (
          <Text size="sm" c="dimmed" maw={360}>
            {message}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  );
}

/** For a portal area the school system doesn't offer yet (see `parentAreaReady`). */
export function ComingSoon({ icon, area }: { icon: React.ReactNode; area: string }) {
  return (
    <EmptyState
      icon={icon}
      title={`${area} coming soon`}
      message={`${area} will appear here once your school's system supports them.`}
    />
  );
}

/** An area the child's school hasn't turned on for parents (QA-262). */
export function NotOfferedState() {
  return (
    <EmptyState
      icon={<AlertCircle size={22} />}
      title="Not offered by this school"
      message="Your child's school hasn't turned this on for parents. Ask the school if you need it."
    />
  );
}

export function LinkChildButton() {
  return (
    <Button component={Link} href={parentRoutes.linkWard} color="fastrackRed" mt="xs">
      Link a child
    </Button>
  );
}

/** The parent has no linked child yet. */
export function NoWardState({ message }: { message: string }) {
  return (
    <EmptyState
      icon={<UserPlus size={22} />}
      title="Link your child"
      message={message}
      action={<LinkChildButton />}
    />
  );
}
