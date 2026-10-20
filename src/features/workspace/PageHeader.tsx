'use client';
import type { ReactNode } from 'react';
import { Badge, Group, Text } from '@mantine/core';
import { ROLE_LABELS } from '@/lib/rbac';
import { useViewer } from './useViewer';
import styles from './AppShell.module.css';

/** The title block every workspace page opens with. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const viewer = useViewer();
  return (
    <Group justify="space-between" align="end" className={styles.pageHeader}>
      <div>
        {viewer && (
          <Text size="10px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: 1.5 }}>
            {ROLE_LABELS[viewer.role]} workspace
          </Text>
        )}
        <h1 className={styles.heading}>{title}</h1>
        {subtitle && (
          <Text size="sm" c="dimmed">
            {subtitle}
          </Text>
        )}
      </div>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}

/** Marks a page or section that still runs on sample data. */
export function PreviewNotice({ children }: { children: ReactNode }) {
  return (
    <div className={styles.preview}>
      <Badge color="orange" size="sm" variant="light">
        UI preview
      </Badge>
      <span>{children}</span>
    </div>
  );
}
