'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  FileButton,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/features/workspace';
import { apiClient, errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/rbac';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** The signed-in user's own account: their photo and password. */
export function AccountPage() {
  const { user, school } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiClient.get<{ avatarUrl?: string | null }>('/auth/profile');
      setAvatarUrl(res.data?.avatarUrl ?? null);
    } catch {
      // The photo is optional; the rest of the page works without it.
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!user) return null;

  const photo = async (run: () => Promise<unknown>, done: string) => {
    setPhotoBusy(true);
    try {
      await run();
      notifications.show({
        title: done,
        message: `${user.firstName} ${user.lastName}`,
        color: 'green',
      });
      await loadProfile();
    } catch (err) {
      notifications.show({
        title: 'Could not change your photo',
        message: errorMessage(err, 'Try another image.'),
        color: 'red',
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const upload = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      notifications.show({
        title: 'That photo is too large',
        message: 'Use one under 2 MB.',
        color: 'red',
      });
      return;
    }
    const form = new FormData();
    form.append('file', file);
    photo(
      () => apiClient.request('/users/me/avatar', { method: 'PUT', body: form }),
      'Photo updated',
    );
  };

  return (
    <>
      <PageHeader title="My account" subtitle="Your photo and password." />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder radius="lg" p="lg">
          <Group gap="md" align="flex-start" wrap="nowrap">
            <Avatar src={avatarUrl} size={80} radius="xl" color="fastrackRed">
              {`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()}
            </Avatar>
            <Stack gap={4}>
              <Text fw={700} size="lg">
                {user.firstName} {user.lastName}
              </Text>
              <Text size="sm" c="dimmed">
                {ROLE_LABELS[user.role]}
                {school ? ` · ${school.name}` : ''}
              </Text>
              <Text size="sm">{user.email}</Text>
              {user.phone && <Text size="sm">{user.phone}</Text>}
              <Group gap="xs" mt="xs">
                <FileButton onChange={upload} accept="image/png,image/jpeg,image/webp">
                  {(props) => (
                    <Button
                      {...props}
                      size="xs"
                      variant="light"
                      color="fastrackRed"
                      leftSection={<Upload size={14} />}
                      loading={photoBusy}
                    >
                      {avatarUrl ? 'Replace photo' : 'Add photo'}
                    </Button>
                  )}
                </FileButton>
                {avatarUrl && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    leftSection={<Trash2 size={14} />}
                    disabled={photoBusy}
                    onClick={() =>
                      photo(() => apiClient.delete('/users/me/avatar'), 'Photo removed')
                    }
                  >
                    Remove
                  </Button>
                )}
              </Group>
              {user.role !== 'PRINCIPAL' && (
                <Text size="xs" c="dimmed" mt="xs">
                  To change your name, email or phone, ask your school&apos;s Principal.
                </Text>
              )}
            </Stack>
          </Group>
        </Card>
        <ChangePasswordCard />
      </SimpleGrid>
    </>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const ready =
    currentPassword &&
    newPassword.length >= 8 &&
    newPassword === confirm &&
    newPassword !== currentPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      notifications.show({
        title: 'Password changed',
        message: 'Any other devices signed in to your account have been signed out.',
        color: 'green',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="lg" p="lg">
      <form onSubmit={submit}>
        <Stack gap="md">
          <Text fw={700}>Change password</Text>
          {error && <Alert color="red">{error}</Alert>}
          <PasswordInput
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
            autoComplete="current-password"
            required
            radius="md"
          />
          <PasswordInput
            label="New password"
            description="At least 8 characters, different from the current one"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            radius="md"
          />
          <PasswordInput
            label="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
            error={mismatch ? 'Passwords don’t match' : null}
            autoComplete="new-password"
            required
            radius="md"
          />
          <Group justify="flex-end">
            <Button
              type="submit"
              color="fastrackRed"
              loading={saving}
              disabled={!ready}
              radius="md"
            >
              Change password
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
