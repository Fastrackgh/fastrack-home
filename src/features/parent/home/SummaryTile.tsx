'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Group, Loader, Text, UnstyledButton } from '@mantine/core';
import { ChevronRight } from 'lucide-react';
import type { ParentQuery } from '../data/useParentQuery';
import { notOffered } from '../domain/errors';

/** A tile whose value comes from its own read, so one failing area doesn't blank the page. */
export function SummaryTile<T>({
  href,
  icon,
  label,
  query,
  value,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  query: ParentQuery<T>;
  value: (data: T) => React.ReactNode;
  detail?: (data: T) => React.ReactNode;
}) {
  // A school that hasn't turned the area on gets no tile at all (QA-262).
  if (query.data === undefined && !query.loading && notOffered(query.error)) return null;
  return (
    <UnstyledButton component={Link} href={href}>
      <Card withBorder radius="lg" padding="md" h="100%">
        <Group justify="space-between" mb="xs" c="dimmed">
          <Group gap={6}>
            {icon}
            <Text size="xs" fw={600} tt="uppercase">
              {label}
            </Text>
          </Group>
          <ChevronRight size={16} />
        </Group>
        <TileBody query={query} value={value} detail={detail} />
      </Card>
    </UnstyledButton>
  );
}

function TileBody<T>({
  query,
  value,
  detail,
}: {
  query: ParentQuery<T>;
  value: (data: T) => React.ReactNode;
  detail?: (data: T) => React.ReactNode;
}) {
  if (query.data !== undefined) {
    return (
      <>
        {/* A div, since a value may hold a badge, which can't sit inside a <p>. */}
        <Text component="div" fw={800} fz={22} className="font-heading">
          {value(query.data)}
        </Text>
        {detail && (
          <Text size="xs" c="dimmed">
            {detail(query.data)}
          </Text>
        )}
      </>
    );
  }
  if (query.loading) return <Loader size="sm" color="fastrackRed" type="dots" />;
  return (
    <Text size="sm" c="dimmed">
      Not available
    </Text>
  );
}
