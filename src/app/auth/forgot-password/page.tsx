'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Anchor, Button, Loader, Stack, Text, TextInput } from '@mantine/core';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { AuthShell, portalFrom, SIGN_IN_PATHS } from '../AuthShell';

/**
 * "Forgot password?": emails a reset link. The answer is the same whether or
 * not the email has an account, so the page can't be used to look people up.
 */
export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <Loader />
        </AuthShell>
      }
    >
      <ForgotPassword />
    </Suspense>
  );
}

function ForgotPassword() {
  const signIn = SIGN_IN_PATHS[portalFrom(useSearchParams().get('portal'))];
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send the reset link.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you sign in with and we'll send you a link to choose a new password."
    >
      {sent ? (
        <Alert color="green" icon={<CheckCircle2 size={16} />} title="Check your email">
          If {email.trim()} has a Fastrack account, a reset link is on its way. The link works for
          one hour. Nothing arrived? Check your spam folder or ask your school administrator.
        </Alert>
      ) : (
        <form onSubmit={submit}>
          <Stack gap="sm">
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              leftSection={<Mail size={16} />}
              autoComplete="email"
              required
            />
            {error && (
              <Alert color="red" icon={<AlertCircle size={16} />}>
                {error}
              </Alert>
            )}
            <Button type="submit" loading={sending} fullWidth mt="xs">
              Send reset link
            </Button>
          </Stack>
        </form>
      )}
      <Text size="sm" ta="center">
        <Anchor component={Link} href={signIn}>
          Back to sign in
        </Anchor>
      </Text>
    </AuthShell>
  );
}
