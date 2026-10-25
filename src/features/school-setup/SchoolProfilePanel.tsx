'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  FileButton,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { School, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { emailInputProps } from '@/lib/email-input';
import { errorMessage } from '@/lib/api-client';
import { setupApi, type SchoolDetails } from './api';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** The school's name, contacts and logo, as shown on bills, reports and the parent app. */
export function SchoolProfilePanel({
  canManage,
  onChanged,
}: {
  canManage: boolean;
  onChanged?: () => void;
}) {
  const { refreshSchool } = useAuth();
  const [school, setSchool] = useState<SchoolDetails | null>(null);
  const [draft, setDraft] = useState<SchoolDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const details = await setupApi.getSchool();
      setSchool(details);
      setDraft(details);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the school profile.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <Alert color="red" title="Unable to load the school profile">
        <Stack gap="xs" align="flex-start">
          <Text size="sm">{error}</Text>
          <Button size="xs" variant="light" color="red" onClick={load}>
            Try again
          </Button>
        </Stack>
      </Alert>
    );
  if (!school || !draft) return <Loader />;

  const field = (key: 'name' | 'address' | 'phone' | 'email' | 'website') => ({
    value: draft[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft({ ...draft, [key]: e.currentTarget.value }),
    readOnly: !canManage,
    radius: 'md' as const,
  });

  const changed = (['name', 'address', 'phone', 'email', 'website'] as const).filter(
    (key) => (draft[key] ?? '').trim() !== (school[key] ?? ''),
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || changed.length === 0) return;
    setSaving(true);
    try {
      await setupApi.updateSchool(
        Object.fromEntries(changed.map((key) => [key, (draft[key] ?? '').trim()])),
      );
      notifications.show({ title: 'School profile saved', message: draft.name, color: 'green' });
      await Promise.all([load(), refreshSchool()]);
      onChanged?.();
    } catch (err) {
      notifications.show({
        title: 'Could not save the school profile',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const changeLogo = async (run: () => Promise<void>, done: string) => {
    setLogoBusy(true);
    try {
      await run();
      notifications.show({ title: done, message: school.name, color: 'green' });
      await Promise.all([load(), refreshSchool()]);
      onChanged?.();
    } catch (err) {
      notifications.show({
        title: 'Could not change the logo',
        message: errorMessage(err, 'Try another image.'),
        color: 'red',
      });
    } finally {
      setLogoBusy(false);
    }
  };

  const upload = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      notifications.show({
        title: 'That image is too large',
        message: 'Use a logo under 2 MB.',
        color: 'red',
      });
      return;
    }
    changeLogo(() => setupApi.uploadLogo(file), 'Logo updated');
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
      <Card withBorder radius="lg" p="lg">
        <Stack align="center" gap="sm">
          <Avatar src={school.logoUrl} size={96} radius="md" color="gray">
            <School size={40} />
          </Avatar>
          <Text size="sm" c="dimmed" ta="center">
            Shown on bills, terminal reports and the parent app.
          </Text>
          {canManage && (
            <Group gap="xs">
              <FileButton onChange={upload} accept="image/png,image/jpeg,image/webp">
                {(props) => (
                  <Button
                    {...props}
                    size="xs"
                    variant="light"
                    color="fastrackRed"
                    leftSection={<Upload size={14} />}
                    loading={logoBusy}
                  >
                    {school.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </Button>
                )}
              </FileButton>
              {school.logoUrl && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  leftSection={<Trash2 size={14} />}
                  disabled={logoBusy}
                  onClick={() => changeLogo(() => setupApi.removeLogo(), 'Logo removed')}
                >
                  Remove
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="lg" p="lg" style={{ gridColumn: 'span 2' }}>
        <form onSubmit={save}>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="School name" maxLength={255} required {...field('name')} />
              <TextInput
                label="School code"
                description="Set by Fastrack; used in student IDs"
                value={school.code}
                readOnly
                radius="md"
              />
              <TextInput label="Phone" maxLength={50} {...field('phone')} />
              <TextInput
                label="Email"
                {...emailInputProps}
                autoComplete="off"
                maxLength={255}
                {...field('email')}
              />
            </SimpleGrid>
            <TextInput
              label="Website"
              placeholder="https://"
              maxLength={255}
              {...field('website')}
            />
            <Textarea label="Address" autosize minRows={2} {...field('address')} />
            {canManage && (
              <Group justify="flex-end">
                <Button
                  variant="default"
                  radius="md"
                  disabled={saving || changed.length === 0}
                  onClick={() => setDraft(school)}
                >
                  Undo changes
                </Button>
                <Button
                  type="submit"
                  color="fastrackRed"
                  radius="md"
                  loading={saving}
                  disabled={changed.length === 0 || !draft.name.trim()}
                >
                  Save profile
                </Button>
              </Group>
            )}
          </Stack>
        </form>
      </Card>
    </SimpleGrid>
  );
}
