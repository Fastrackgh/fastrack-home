'use client';

import { useState } from 'react';
import { parentApi } from '../api';
import { useActiveWard } from '../data/ActiveWardProvider';
import { linkFailure, otpFailure } from '../domain/errors';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useCountdown } from '../hooks/useCountdown';
import type { LinkChallenge, Ward } from '../types';

export const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export type LinkStep = 'code' | 'confirm' | 'linked';

/**
 * Linking a child in two steps: the student code starts a challenge, and the
 * one-time code sent to the guardian contact on file confirms it. The new
 * child becomes the one the portal shows.
 */
export function useLinkWard() {
  const { query: wards, selectWard } = useActiveWard();
  const { busy, error, run, setError, clearError } = useAsyncAction();
  const cooldown = useCountdown();
  const [step, setStep] = useState<LinkStep>('code');
  const [challenge, setChallenge] = useState<LinkChallenge | null>(null);
  const [otp, setOtp] = useState('');
  const [linked, setLinked] = useState<Ward | null>(null);

  const start = (studentCode: string, schoolCode: string) =>
    run(
      async () => {
        const result = await parentApi.initiateLink({
          studentCode: studentCode.trim(),
          schoolCode: schoolCode.trim() || undefined,
        });
        setChallenge(result);
        cooldown.start(RESEND_COOLDOWN_SECONDS);
        setOtp('');
        setStep('confirm');
      },
      { failure: linkFailure },
    );

  const resend = async () => {
    if (!challenge) return;
    clearError();
    try {
      const result = await parentApi.resendLinkOtp(challenge.requestId);
      setChallenge({ ...challenge, ...result });
      cooldown.start(result.cooldownSeconds || RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(linkFailure(err));
    }
  };

  const verify = async (code: string) => {
    if (!challenge || code.length !== OTP_LENGTH) return;
    const ok = await run(
      async () => {
        const ward = await parentApi.verifyLink(challenge.requestId, code);
        setLinked(ward);
        selectWard(ward.studentId);
        wards.reload();
        setStep('linked');
      },
      { failure: otpFailure },
    );
    if (!ok) setOtp('');
  };

  const changeCode = () => {
    setStep('code');
    clearError();
  };

  const startOver = () => {
    setStep('code');
    setLinked(null);
    clearError();
  };

  return {
    step,
    busy,
    error,
    challenge,
    otp,
    setOtp,
    linked,
    resendIn: cooldown.seconds,
    start,
    resend,
    verify,
    changeCode,
    startOver,
  };
}
