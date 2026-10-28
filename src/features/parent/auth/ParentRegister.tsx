'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Anchor, Button, PasswordInput, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { emailInputProps } from '@/lib/email-input';
import { useAuth } from '@/lib/auth';
import { registerFailure } from '../domain/errors';
import {
  EMPTY_REGISTRATION,
  registrationErrors,
  toRegistration,
  type RegistrationForm,
} from '../domain/registration';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { parentRoutes } from '../routes';
import { ErrorAlert } from '../ui';
import { AuthFrame, AuthPending, useLeaveWhenSignedIn } from './AuthFrame';

export function ParentRegister() {
  const { registerParent } = useAuth();
  const leaving = useLeaveWhenSignedIn();
  const [form, setForm] = useState<RegistrationForm>(EMPTY_REGISTRATION);
  // Stays busy after success while the new parent is sent on.
  const { busy, error, run } = useAsyncAction();

  if (leaving && !busy) return <AuthPending />;

  // Read the value now: React clears currentTarget before the updater runs (QA-212).
  const set = (field: keyof RegistrationForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const fieldErrors = registrationErrors(form);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (fieldErrors.password || fieldErrors.confirm) return;
    run(() => registerParent(toRegistration(form)), {
      failure: registerFailure,
      holdOnSuccess: true,
    });
  };

  return (
    <AuthFrame
      title="Create your parent account"
      subtitle="After signing up, link your children with the student code from their school."
    >
      <form onSubmit={submit}>
        <Stack>
          <ErrorAlert>{error}</ErrorAlert>
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput
              label="First name"
              autoComplete="given-name"
              required
              leftSection={<User size={16} />}
              value={form.firstName}
              onChange={set('firstName')}
            />
            <TextInput
              label="Last name"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={set('lastName')}
            />
          </SimpleGrid>
          <TextInput
            label="Email"
            {...emailInputProps}
            autoComplete="email"
            required
            leftSection={<Mail size={16} />}
            value={form.email}
            onChange={set('email')}
          />
          <TextInput
            label="Phone"
            description="Use the number your children's school has for you."
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+233 24 000 0000"
            leftSection={<Phone size={16} />}
            value={form.phone}
            onChange={set('phone')}
          />
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            required
            leftSection={<Lock size={16} />}
            value={form.password}
            onChange={set('password')}
            error={fieldErrors.password}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={set('confirm')}
            error={fieldErrors.confirm}
          />
          <Button type="submit" size="md" color="fastrackRed" loading={busy}>
            Create account
          </Button>
          <Text size="sm" ta="center" c="dimmed">
            Already have an account?{' '}
            <Anchor component={Link} href={parentRoutes.login} c="fastrackRed" fw={600}>
              Sign in
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthFrame>
  );
}
