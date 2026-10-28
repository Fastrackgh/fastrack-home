'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Anchor, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { emailInputProps } from '@/lib/email-input';
import { useAuth } from '@/lib/auth';
import { loginFailure } from '../domain/errors';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { parentRoutes } from '../routes';
import { ErrorAlert } from '../ui';
import { AuthFrame, AuthPending, useLeaveWhenSignedIn } from './AuthFrame';

export function ParentLogin() {
  const { login } = useAuth();
  const leaving = useLeaveWhenSignedIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Stays busy after success while the visitor is sent on.
  const { busy, error, run } = useAsyncAction();

  if (leaving && !busy) return <AuthPending />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    run(() => login(email.trim(), password), { failure: loginFailure, holdOnSuccess: true });
  };

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in to see your children's fees, reports and attendance."
    >
      <form onSubmit={submit}>
        <Stack>
          <ErrorAlert>{error}</ErrorAlert>
          <TextInput
            label="Email"
            {...emailInputProps}
            autoComplete="email"
            required
            size="md"
            leftSection={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            required
            size="md"
            leftSection={<Lock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Anchor
            component={Link}
            href={parentRoutes.forgotPassword}
            size="sm"
            c="fastrackRed"
            ta="right"
            mt={-8}
          >
            Forgot password?
          </Anchor>
          <Button
            type="submit"
            size="md"
            color="fastrackRed"
            loading={busy}
            rightSection={<ArrowRight size={16} />}
          >
            Sign in
          </Button>
          <Text size="sm" ta="center" c="dimmed">
            New to Fastrack?{' '}
            <Anchor component={Link} href={parentRoutes.register} c="fastrackRed" fw={600}>
              Create a parent account
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthFrame>
  );
}
