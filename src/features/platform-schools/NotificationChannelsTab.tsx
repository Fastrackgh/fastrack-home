'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { platformSchoolsApi as api } from './api';
import type { NotificationChannelSetting } from './model';

type Channel = 'email' | 'sms';
const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

/** Which channels each kind of message uses at this school. Each switch saves at once; a sign-in message keeps at least one channel on. */
export function NotificationChannelsTab({ schoolId }: { schoolId: string }) {
  const [rows, setRows] = useState<NotificationChannelSetting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listNotificationChannels(schoolId)
      .then((list) => active && setRows(list))
      .catch((e) => active && setError(errorMessage(e, 'Could not load notification channels.')));
    return () => {
      active = false;
    };
  }, [schoolId]);

  const toggle = async (row: NotificationChannelSetting, channel: Channel) => {
    const next = { feature: row.feature, email: row.email, sms: row.sms, [channel]: !row[channel] };
    setSaving(`${row.feature}:${channel}`);
    try {
      setRows(await api.setNotificationChannels(schoolId, next));
      notifications.show({
        color: 'green',
        title: row.label,
        message: `${channel === 'sms' ? 'SMS' : 'Email'} turned ${next[channel] ? 'on' : 'off'}.`,
      });
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Not changed',
        message: errorMessage(e, 'Try again.'),
      });
    } finally {
      setSaving(null);
    }
  };

  if (error)
    return (
      <Alert color="red" title="Unable to load notification channels">
        {error}
      </Alert>
    );
  if (!rows) return <Loader size="sm" />;

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap={4} mb="md">
        <Text fw={700}>Notification channels</Text>
        <Text size="sm" c="dimmed">
          Choose how this school&apos;s messages go out. Sign-in messages keep at least one channel
          on, so nobody is locked out. SMS goes to the phone number on the account or the
          child&apos;s record.
        </Text>
      </Stack>
      <Table verticalSpacing="sm" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Message</Table.Th>
            {CHANNELS.map((c) => (
              <Table.Th key={c.key} ta="center" w={90}>
                {c.label}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.feature}>
              <Table.Td>
                <Group gap={6}>
                  <Text size="sm" fw={600}>
                    {row.label}
                  </Text>
                  {row.security && (
                    <Badge size="xs" variant="light" color="gray">
                      Sign-in
                    </Badge>
                  )}
                  {!row.email && !row.sms && (
                    <Badge size="xs" variant="light" color="orange">
                      Off
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {row.description}
                </Text>
                <Text size="xs" c="dimmed">
                  {row.isDefault
                    ? 'Default'
                    : `Changed${row.updatedBy ? ` by ${row.updatedBy}` : ''}${row.updatedAt ? ` on ${formatDate(row.updatedAt)}` : ''}`}
                </Text>
              </Table.Td>
              {CHANNELS.map((c) => {
                const other: Channel = c.key === 'email' ? 'sms' : 'email';
                // The last channel of a sign-in message can't be turned off.
                const locked = row.security && row[c.key] && !row[other];
                const control = (
                  <Switch
                    checked={row[c.key]}
                    disabled={locked || saving === `${row.feature}:${c.key}`}
                    onChange={() => toggle(row, c.key)}
                    aria-label={`${c.label} for ${row.label}`}
                  />
                );
                return (
                  <Table.Td key={c.key}>
                    <Group justify="center">
                      {locked ? (
                        <Tooltip label={`Turn on ${other === 'sms' ? 'SMS' : 'email'} first`}>
                          <span>{control}</span>
                        </Tooltip>
                      ) : (
                        control
                      )}
                    </Group>
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}
