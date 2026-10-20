'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { AlertCircle, ArrowRight, Lock, Mail, Phone, User } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { landingPathFor, safeRedirectTarget } from '@/lib/rbac';

function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      mih="100dvh"
      px="md"
      py={48}
      style={{
        background:
          'radial-gradient(circle at 20% 0%, light-dark(#fff0f2, rgba(224,26,43,0.15)) 0%, transparent 55%), var(--mantine-color-body)',
      }}
    >
      <Stack maw={420} mx="auto" gap="lg">
        <Group gap={8}>
          <Box
            component="img"
            src="/parent-app/icon-192.png"
            alt=""
            w={40}
            h={40}
            style={{ borderRadius: 10 }}
          />
          <Text fw={800} size="lg" style={{ fontFamily: 'var(--font-heading)' }}>
            Fastrack{' '}
            <Text span c="fastrackRed" inherit>
              Parent
            </Text>
          </Text>
        </Group>
        <div>
          <Title order={1} fz={28} style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            {subtitle}
          </Text>
        </div>
        <Paper withBorder radius="lg" p="lg" shadow="sm">
          {children}
        </Paper>
      </Stack>
    </Box>
  );
}

/** Sends a signed-in visitor on to where they were going, or to their own landing page. */
function useLeaveWhenSignedIn() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  useEffect(() => {
    if (isLoading || !user) return;
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(safeRedirectTarget(next, user) ?? landingPathFor(user.role));
  }, [isLoading, user, router]);
  return isLoading || user !== null;
}

function Pending() {
  return (
    <Center h="100dvh">
      <Loader color="fastrackRed" />
    </Center>
  );
}

export function ParentLogin() {
  const { login } = useAuth();
  const leaving = useLeaveWhenSignedIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (leaving && !submitting) return <Pending />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in to see your children's fees, reports and attendance."
    >
      <form onSubmit={submit}>
        <Stack>
          {error && (
            <Alert color="red" radius="md" icon={<AlertCircle size={16} />}>
              {error}
            </Alert>
          )}
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
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
          <Button
            type="submit"
            size="md"
            color="fastrackRed"
            loading={submitting}
            rightSection={<ArrowRight size={16} />}
          >
            Sign in
          </Button>
          <Text size="sm" ta="center" c="dimmed">
            New to Fastrack?{' '}
            <Anchor component={Link} href="/parent/register" c="fastrackRed" fw={600}>
              Create a parent account
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthFrame>
  );
}

const MIN_PASSWORD = 8;

/**
 * The same message whether or not the email is taken, so the form can't be
 * used to find out who has an account (QA-014).
 */
const REGISTER_FAILED =
  'We could not create an account with those details. If you already have one, sign in instead.';

export function ParentRegister() {
  const { registerParent } = useAuth();
  const leaving = useLeaveWhenSignedIn();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (leaving && !submitting) return <Pending />;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: e.currentTarget.value }));

  const passwordError =
    form.password && form.password.length < MIN_PASSWORD
      ? `Use at least ${MIN_PASSWORD} characters.`
      : null;
  const confirmError =
    form.confirm && form.confirm !== form.password ? 'Passwords do not match.' : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordError || confirmError) return;
    setError(null);
    setSubmitting(true);
    try {
      await registerParent({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
    } catch (err) {
      // Validation errors are safe to show; anything about the account itself is not.
      setError(err instanceof ApiError && err.statusCode === 400 ? err.message : REGISTER_FAILED);
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      title="Create your parent account"
      subtitle="After signing up, link your children with the student code from their school."
    >
      <form onSubmit={submit}>
        <Stack>
          {error && (
            <Alert color="red" radius="md" icon={<AlertCircle size={16} />}>
              {error}
            </Alert>
          )}
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
            type="email"
            autoComplete="email"
            inputMode="email"
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
            error={passwordError}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={set('confirm')}
            error={confirmError}
          />
          <Button type="submit" size="md" color="fastrackRed" loading={submitting}>
            Create account
          </Button>
          <Text size="sm" ta="center" c="dimmed">
            Already have an account?{' '}
            <Anchor component={Link} href="/parent/login" c="fastrackRed" fw={600}>
              Sign in
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthFrame>
  );
}
