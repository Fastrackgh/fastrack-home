'use client';

import React from 'react';
import { Group, Text, Title } from '@mantine/core';

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" wrap="nowrap" mb="md">
      <div>
        <Title order={2} fz={{ base: 22, sm: 26 }}>
          {title}
        </Title>
        {subtitle && (
          <Text size="sm" c="dimmed" mt={2}>
            {subtitle}
          </Text>
        )}
      </div>
      {action}
    </Group>
  );
}
