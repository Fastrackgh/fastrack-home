'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Anchor,
  Button,
  Paper,
  PinInput,
  Stack,
  Stepper,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { AlertCircle, CheckCircle2, KeyRound, School } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { useActiveWard } from '../ActiveWardProvider';
import { parentApi } from '../api';
import { PageTitle } from '../components';
import { wardName, wardPlacement } from '../format';
import type { LinkChallenge, Ward } from '../types';

/**
 * Every failure reads the same, so the form can't be used to discover which
 * student codes exist or whose contact they belong to (QA-014). Rate limits
 * are the exception: they tell the parent what to do next.
 */
function linkFailure(err: unknown): string {
  if (err instanceof ApiError && err.statusCode === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return 'We could not link a child with those details. Check the code and try again, or contact the school.';
}

const OTP_LENGTH = 6;

export function LinkWardFlow() {
  const router = useRouter();
  const { query, selectWard } = useActiveWard();
  const [step, setStep] = useState(0);
  const [studentCode, setStudentCode] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [challenge, setChallenge] = useState<LinkChallenge | null>(null);
  const [otp, setOtp] = useState('');
  const [linked, setLinked] = useState<Ward | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await parentApi.initiateLink({
        studentCode: studentCode.trim(),
        schoolCode: schoolCode.trim() || undefined,
      });
      setChallenge(result);
      setCooldown(30);
      setOtp('');
      setStep(1);
    } catch (err) {
      setError(linkFailure(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!challenge) return;
    setError(null);
    try {
      const result = await parentApi.resendLinkOtp(challenge.requestId);
      setChallenge({ ...challenge, ...result });
      setCooldown(result.cooldownSeconds || 30);
    } catch (err) {
      setError(linkFailure(err));
    }
  };

  const verify = async (code: string) => {
    if (!challenge || code.length !== OTP_LENGTH) return;
    setError(null);
    setBusy(true);
    try {
      const ward = await parentApi.verifyLink(challenge.requestId, code);
      setLinked(ward);
      selectWard(ward.studentId);
      query.reload();
      setStep(2);
    } catch (err) {
      setError(
        err instanceof ApiError && err.statusCode === 429
          ? linkFailure(err)
          : 'That code is not right or has expired. Check it, or send a new one.',
      );
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const changeCode = () => {
    setStep(0);
    setError(null);
  };

  const startOver = () => {
    setStep(0);
    setStudentCode('');
    setSchoolCode('');
    setLinked(null);
    setError(null);
  };

  return (
    <>
      <PageTitle
        title="Link a child"
        subtitle="Connect your child's school record to your account"
      />
      <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }}>
        <Stepper active={step} size="sm" color="fastrackRed" allowNextStepsSelect={false}>
          <Stepper.Step label="Student code">
            <form onSubmit={start}>
              <Stack mt="md">
                <Text size="sm" c="dimmed">
                  Find the student code on a fee bill, report card or admission letter from the
                  school.
                </Text>
                {error && (
                  <Alert color="red" radius="md" icon={<AlertCircle size={16} />}>
                    {error}
                  </Alert>
                )}
                <TextInput
                  label="Student code"
                  placeholder="e.g. LCA/2026/001"
                  required
                  size="md"
                  autoCapitalize="characters"
                  leftSection={<KeyRound size={16} />}
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.currentTarget.value)}
                />
                <TextInput
                  label="School code"
                  description="Only needed if the school asks for it"
                  placeholder="e.g. LCA"
                  autoCapitalize="characters"
                  leftSection={<School size={16} />}
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.currentTarget.value)}
                />
                <Button type="submit" color="fastrackRed" size="md" loading={busy}>
                  Continue
                </Button>
              </Stack>
            </form>
          </Stepper.Step>

          <Stepper.Step label="Confirm">
            <Stack mt="md" align="center" ta="center">
              <Text size="sm">
                We sent a {OTP_LENGTH}-digit code to the guardian contact the school has on file
                {challenge?.maskedDestination ? (
                  <>
                    : <strong>{challenge.maskedDestination}</strong>
                  </>
                ) : null}
                .
              </Text>
              {error && (
                <Alert color="red" radius="md" icon={<AlertCircle size={16} />} w="100%" ta="left">
                  {error}
                </Alert>
              )}
              <PinInput
                length={OTP_LENGTH}
                type="number"
                oneTimeCode
                size="lg"
                value={otp}
                onChange={setOtp}
                onComplete={verify}
                disabled={busy}
                aria-label="Verification code"
              />
              <Button
                color="fastrackRed"
                loading={busy}
                disabled={otp.length !== OTP_LENGTH}
                onClick={() => verify(otp)}
                fullWidth
              >
                Confirm
              </Button>
              <Text size="sm" c="dimmed">
                No code?{' '}
                {cooldown > 0 ? (
                  `Send again in ${cooldown}s`
                ) : (
                  <Anchor component="button" type="button" c="fastrackRed" onClick={resend}>
                    Send a new code
                  </Anchor>
                )}
              </Text>
              <Anchor component="button" type="button" size="sm" c="dimmed" onClick={changeCode}>
                Use a different student code
              </Anchor>
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack mt="md" align="center" ta="center">
              <ThemeIcon size={56} radius="xl" color="green" variant="light">
                <CheckCircle2 size={28} />
              </ThemeIcon>
              <Text fw={700} size="lg">
                {linked ? `${wardName(linked)} is linked` : 'Child linked'}
              </Text>
              {linked && (
                <Text size="sm" c="dimmed">
                  {wardPlacement(linked)}
                </Text>
              )}
              <Button color="fastrackRed" fullWidth onClick={() => router.push('/parent')}>
                Go to home
              </Button>
              <Button variant="default" fullWidth onClick={startOver}>
                Link another child
              </Button>
            </Stack>
          </Stepper.Completed>
        </Stepper>
      </Paper>
    </>
  );
}
