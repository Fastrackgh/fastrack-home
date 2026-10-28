'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
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
import { CheckCircle2, KeyRound, School } from 'lucide-react';
import { wardName, wardPlacement } from '../domain/wards';
import { parentRoutes } from '../routes';
import { ErrorAlert, PageTitle } from '../ui';
import { OTP_LENGTH, useLinkWard, type LinkStep } from './useLinkWard';

const STEP_INDEX: Record<LinkStep, number> = { code: 0, confirm: 1, linked: 2 };

export function LinkWardFlow() {
  const flow = useLinkWard();
  const [studentCode, setStudentCode] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  const startOver = () => {
    setStudentCode('');
    setSchoolCode('');
    flow.startOver();
  };

  return (
    <>
      <PageTitle
        title="Link a child"
        subtitle="Connect your child's school record to your account"
      />
      <Paper withBorder radius="lg" p={{ base: 'md', sm: 'xl' }}>
        <Stepper
          active={STEP_INDEX[flow.step]}
          size="sm"
          color="fastrackRed"
          allowNextStepsSelect={false}
        >
          <Stepper.Step label="Student code">
            <StudentCodeStep
              studentCode={studentCode}
              schoolCode={schoolCode}
              onStudentCode={setStudentCode}
              onSchoolCode={setSchoolCode}
              onSubmit={() => flow.start(studentCode, schoolCode)}
              busy={flow.busy}
              error={flow.error}
            />
          </Stepper.Step>
          <Stepper.Step label="Confirm">
            <ConfirmStep flow={flow} />
          </Stepper.Step>
          <Stepper.Completed>
            <LinkedStep flow={flow} onStartOver={startOver} />
          </Stepper.Completed>
        </Stepper>
      </Paper>
    </>
  );
}

type Flow = ReturnType<typeof useLinkWard>;

function StudentCodeStep({
  studentCode,
  schoolCode,
  onStudentCode,
  onSchoolCode,
  onSubmit,
  busy,
  error,
}: {
  studentCode: string;
  schoolCode: string;
  onStudentCode: (value: string) => void;
  onSchoolCode: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form onSubmit={submit}>
      <Stack mt="md">
        <Text size="sm" c="dimmed">
          Find the student code on a fee bill, report card or admission letter from the school.
        </Text>
        <ErrorAlert>{error}</ErrorAlert>
        <TextInput
          label="Student code"
          placeholder="e.g. LCA/2026/001"
          required
          size="md"
          autoCapitalize="characters"
          leftSection={<KeyRound size={16} />}
          value={studentCode}
          onChange={(e) => onStudentCode(e.currentTarget.value)}
        />
        <TextInput
          label="School code"
          description="Only needed if the school asks for it"
          placeholder="e.g. LCA"
          autoCapitalize="characters"
          leftSection={<School size={16} />}
          value={schoolCode}
          onChange={(e) => onSchoolCode(e.currentTarget.value)}
        />
        <Button type="submit" color="fastrackRed" size="md" loading={busy}>
          Continue
        </Button>
      </Stack>
    </form>
  );
}

function ConfirmStep({ flow }: { flow: Flow }) {
  const destination = flow.challenge?.maskedDestination;
  return (
    <Stack mt="md" align="center" ta="center">
      <Text size="sm">
        We sent a {OTP_LENGTH}-digit code to the guardian contact the school has on file
        {destination ? (
          <>
            : <strong>{destination}</strong>
          </>
        ) : null}
        .
      </Text>
      <ErrorAlert w="100%" ta="left">
        {flow.error}
      </ErrorAlert>
      <PinInput
        length={OTP_LENGTH}
        type="number"
        oneTimeCode
        size="lg"
        value={flow.otp}
        onChange={flow.setOtp}
        onComplete={flow.verify}
        disabled={flow.busy}
        aria-label="Verification code"
      />
      <Button
        color="fastrackRed"
        loading={flow.busy}
        disabled={flow.otp.length !== OTP_LENGTH}
        onClick={() => flow.verify(flow.otp)}
        fullWidth
      >
        Confirm
      </Button>
      <Text size="sm" c="dimmed">
        No code?{' '}
        {flow.resendIn > 0 ? (
          `Send again in ${flow.resendIn}s`
        ) : (
          <Anchor component="button" type="button" c="fastrackRed" onClick={flow.resend}>
            Send a new code
          </Anchor>
        )}
      </Text>
      <Anchor component="button" type="button" size="sm" c="dimmed" onClick={flow.changeCode}>
        Use a different student code
      </Anchor>
    </Stack>
  );
}

function LinkedStep({ flow, onStartOver }: { flow: Flow; onStartOver: () => void }) {
  const router = useRouter();
  const { linked } = flow;
  return (
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
      <Button color="fastrackRed" fullWidth onClick={() => router.push(parentRoutes.home)}>
        Go to home
      </Button>
      <Button variant="default" fullWidth onClick={onStartOver}>
        Link another child
      </Button>
    </Stack>
  );
}
