'use client';

import React from 'react';
import { Card, Text } from '@mantine/core';

/** A small labelled figure: an average, a position, a count of days. */
export function StatCard({
  label,
  value,
  centered = false,
}: {
  label: string;
  value: React.ReactNode;
  /** Value above a centred label, for a row of counts. */
  centered?: boolean;
}) {
  if (centered) {
    return (
      <Card withBorder radius="md" padding="xs" ta="center">
        <Text fw={800} size="lg">
          {value}
        </Text>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Card>
    );
  }
  return (
    <Card withBorder radius="md" padding="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fw={800} size="lg" className="font-heading">
        {value}
      </Text>
    </Card>
  );
}

/** A small uppercase label over a value, e.g. on a profile. Nothing without a value. */
export function LabelledValue({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </div>
  );
}
