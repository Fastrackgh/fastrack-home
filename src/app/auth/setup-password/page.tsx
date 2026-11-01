'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  Loader,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { BrandLogo } from '@/components/atoms';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { landingPathFor } from '@/lib/rbac';
import { AuthShell } from '../AuthShell';

const MIN_PASSWORD_LENGTH = 8;

interface InviteCheck {
  valid: boolean;
  email?: string;
  message?: string;
}

/**
 * Invited staff land here from their email (`/auth/setup-password?token=…`):
 * they choose a password, then are signed in and sent to their workspace.
 */
export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <Loader />
        </AuthShell>
      }
    >
      <SetupPassword />
    </Suspense>
  );
}

function SetupPassword() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const { acceptInvite } = useAuth();

  const [invite, setInvite] = useState<InviteCheck | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInvite({ valid: false, message: 'This link is missing its invitation code.' });
      return;
    }
    let current = true;
    apiClient
      .get<InviteCheck>(`/auth/verify-invite?token=${encodeURIComponent(token)}`)
      .then((res) => current && setInvite(res.data))
      .catch(
        (err: unknown) =>
          current &&
          setInvite({
            valid: false,
            message: err instanceof Error ? err.message : 'Could not check this invitation.',
          }),
      );
    return () => {
      current = false;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await acceptInvite(token, password);
      notifications.show({
        color: 'green',
        title: 'Password set',
        message: 'Your account is ready.',
      });
      router.replace(landingPathFor(user.role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not set your password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!invite) {
    return (
      <AuthShell>
        <Loader />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card withBorder radius="lg" padding="xl" w="100%" maw={420}>
        <Stack gap="md">
          <BrandLogo />
          <Box>
            <Title order={3} style={{ fontFamily: 'var(--font-heading)' }}>
              Set up your account
            </Title>
            <Text size="sm" c="dimmed">
              Choose a password to finish joining your school on Fastrack.
            </Text>
          </Box>

          {!invite.valid ? (
            <Alert color="red" icon={<AlertCircle size={16} />} title="Invitation not valid">
              {invite.message ?? 'This invitation has expired or was already used.'} Ask your school
              administrator to send a new invitation.
            </Alert>
          ) : (
            <form onSubmit={submit}>
              <Stack gap="sm">
                <TextInput
                  label="Email"
                  value={invite.email ?? ''}
                  readOnly
                  leftSection={<Mail size={16} />}
                />
                <PasswordInput
                  label="New password"
                  description={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  leftSection={<Lock size={16} />}
                  autoComplete="new-password"
                  required
                />
                <PasswordInput
                  label="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.currentTarget.value)}
                  leftSection={<Lock size={16} />}
                  autoComplete="new-password"
                  required
                />
                {error && (
                  <Alert color="red" icon={<AlertCircle size={16} />}>
                    {error}
                  </Alert>
                )}
                <Button type="submit" loading={submitting} fullWidth mt="xs">
                  Set password and sign in
                </Button>
              </Stack>
            </form>
          )}
        </Stack>
      </Card>
    </AuthShell>
  );
}
