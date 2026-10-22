'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Anchor, Button, Group, Loader, PasswordInput, Stack, Text } from '@mantine/core';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AuthShell, portalFrom, SIGN_IN_PATHS } from '../AuthShell';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Opened from the reset email (`/auth/reset-password?token=…`). Setting the
 * password signs the account out on every device, so it then signs in fresh.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <Loader />
        </AuthShell>
      }
    >
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  // The email link doesn't know who it's for; a link from the parent app does.
  const portal = params.get('portal') ? portalFrom(params.get('portal')) : null;

  const [valid, setValid] = useState<boolean | null>(token ? null : false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let current = true;
    apiClient
      .get<{ valid: boolean }>(`/auth/reset-password/verify?token=${encodeURIComponent(token)}`)
      .then((res) => current && setValid(res.data.valid))
      .catch(() => current && setValid(false));
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
    setSaving(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      // Any session stored in this browser was just ended on the server.
      apiClient.clearSession();
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setSaving(false);
    }
  };

  if (valid === null) {
    return (
      <AuthShell>
        <Loader />
      </AuthShell>
    );
  }

  const forgotHref = `/auth/forgot-password${portal === 'parent' ? '?portal=parent' : ''}`;

  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <Stack gap="sm">
          <Alert color="green" icon={<CheckCircle2 size={16} />} title="Password changed">
            Your password is updated and you have been signed out on every device. Sign in with your
            new password.
          </Alert>
          <SignInLinks portal={portal} />
        </Stack>
      ) : !valid ? (
        <Stack gap="sm">
          <Alert color="red" icon={<AlertCircle size={16} />} title="Link not valid">
            This reset link has expired or was already used. Links work once, for one hour.
          </Alert>
          <Button component={Link} href={forgotHref} fullWidth>
            Send a new link
          </Button>
        </Stack>
      ) : (
        <form onSubmit={submit}>
          <Stack gap="sm">
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
            <Button type="submit" loading={saving} fullWidth mt="xs">
              Save new password
            </Button>
          </Stack>
        </form>
      )}
    </AuthShell>
  );
}

/** Staff and parents sign in on different pages; offer the right one. */
function SignInLinks({ portal }: { portal: 'staff' | 'parent' | null }) {
  if (portal) {
    return (
      <Button component={Link} href={SIGN_IN_PATHS[portal]} fullWidth>
        Sign in
      </Button>
    );
  }
  return (
    <Stack gap={6}>
      <Button component={Link} href={SIGN_IN_PATHS.staff} fullWidth>
        Sign in to your school workspace
      </Button>
      <Group justify="center" gap={4}>
        <Text size="sm" c="dimmed">
          Parent?
        </Text>
        <Anchor component={Link} href={SIGN_IN_PATHS.parent} size="sm">
          Sign in to the parent app
        </Anchor>
      </Group>
    </Stack>
  );
}
