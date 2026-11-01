import { ApiError, errorMessage } from '@/lib/api-client';

/*
 * Turning failed requests into words a parent can act on. Some messages are
 * deliberately vague so a form can't be used to find out who has an account
 * or which student codes exist (QA-014).
 */

const hasStatus = (error: unknown, status: number) =>
  error instanceof ApiError && error.statusCode === status;

const isRateLimited = (error: unknown) => hasStatus(error, 429);

/** The school has this area turned off for parents (a 403). Nothing to retry (QA-262). */
export const notOffered = (error: unknown) => hasStatus(error, 403);

/** Why a read failed. */
export function readFailure(error: unknown): string {
  if (hasStatus(error, 404)) {
    return 'This is not available yet. Your school may not have published it.';
  }
  if (notOffered(error)) return 'Your school has not turned this on for parents.';
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You are offline. Connect to the internet and try again.';
  }
  return errorMessage(error, 'Something went wrong. Try again.');
}

const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';

/** Starting a link, or resending its code. Every other failure reads the same. */
export const linkFailure = (error: unknown) =>
  isRateLimited(error)
    ? TOO_MANY_ATTEMPTS
    : 'We could not link a child with those details. Check the code and try again, or contact the school.';

/** Confirming a link with the code that was sent. */
export const otpFailure = (error: unknown) =>
  isRateLimited(error)
    ? TOO_MANY_ATTEMPTS
    : 'That code is not right or has expired. Check it, or send a new one.';

/**
 * Validation errors are safe to show; anything about the account itself is
 * not, so it reads the same whether or not the email is taken.
 */
export const registerFailure = (error: unknown) =>
  hasStatus(error, 400)
    ? (error as ApiError).message
    : 'We could not create an account with those details. If you already have one, sign in instead.';

export const loginFailure = (error: unknown) =>
  error instanceof Error ? error.message : 'Invalid email or password.';
