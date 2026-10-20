'use client';
import { Alert, Badge, Button, Drawer, Stack, Text } from '@mantine/core';
import { Search } from 'lucide-react';
import type { Panel, RecordRow } from './model';
import styles from './Dashboard.module.css';

export const tone = (status: string) =>
  /overdue|risk|over budget|overloaded|absent|late/i.test(status)
    ? 'red'
    : /pending|review|progress|near|draft|trial|unread|open|due/i.test(status)
      ? 'orange'
      : 'teal';

export function RecordTable({
  panel,
  rows,
  onDetail,
}: {
  panel: Panel;
  rows: RecordRow[];
  onDetail: (row: RecordRow) => void;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            {panel.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button className={styles.recordButton} onClick={() => onDetail(row)}>
                  {row.name}
                </button>
              </td>
              <td>{row.group}</td>
              <td>{row.value}</td>
              <td>
                <Badge size="sm" radius="sm" variant="light" color={tone(row.status)} tt="none">
                  {row.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className={styles.state}>
          <Search size={24} color="#94a3b8" />
          <Text mt="sm" fw={600}>
            No records to show
          </Text>
          <Text size="sm" c="dimmed">
            Try another filter or academic term.
          </Text>
        </div>
      )}
    </div>
  );
}

export function RecordDetail({
  record,
  onClose,
}: {
  record: RecordRow | null;
  onClose: () => void;
}) {
  return (
    <Drawer opened={!!record} onClose={onClose} title="Record details" position="right" size="md">
      {record && (
        <Stack>
          <Badge w="fit-content" color={tone(record.status)}>
            {record.status}
          </Badge>
          <Text size="xl" fw={700}>
            {record.name}
          </Text>
          <Text c="dimmed">{record.group}</Text>
          <Text size="xl" fw={600}>
            {record.value}
          </Text>
          <Text size="sm">{record.note}</Text>
          <Alert color="gray">
            Sample record. Values shown here do not represent live school records.
          </Alert>
          <Button variant="default" onClick={onClose}>
            Close details
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}

export function downloadPanel(panel: Panel, rows: RecordRow[]) {
  const escape = (v: string) => `"${(/^[=+@\-]/.test(v) ? "'" : '') + v.replaceAll('"', '""')}"`;
  const csv = [
    [...panel.columns, 'Status', 'Notes'],
    ...rows.map((r) => [r.name, r.group, r.value, r.status, r.note]),
  ]
    .map((row) => row.map(escape).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `sample-${panel.title.toLowerCase().replaceAll(' ', '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
