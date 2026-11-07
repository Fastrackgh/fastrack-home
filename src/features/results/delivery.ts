/** One channel's messages to parents from a publish, by where they stand. */
export interface ChannelProgress {
  /** Queued, not sent yet (or being retried). */
  pending: number;
  sent: number;
  /** Every retry used, or it couldn't be queued. */
  failed: number;
  /** The school turned the channel off before it went out. */
  cancelled: number;
}

/** How a publish's messages to parents stand; they go out from a queue, so poll until `done`. */
export interface DeliveryProgress {
  revision: number;
  /** False when there's nothing to show: never published, or published before messages were tracked. */
  tracked: boolean;
  email: ChannelProgress;
  sms: ChannelProgress;
  /** Pupils with no linked parent reachable on a channel that is on. */
  pupilsNotReached: number;
  done: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const total = (c: ChannelProgress) => c.pending + c.sent + c.failed + c.cancelled;

/** What publishing queued, for the toast. */
export function queuedMessage(p: DeliveryProgress): string {
  const queued = [
    total(p.email) && plural(total(p.email), 'email'),
    total(p.sms) && plural(total(p.sms), 'text message'),
  ].filter(Boolean);
  const parts = [
    queued.length ? `Sending ${queued.join(' and ')} to parents.` : 'No parent was told.',
  ];
  if (p.pupilsNotReached)
    parts.push(
      `${plural(p.pupilsNotReached, 'pupil')} ${p.pupilsNotReached === 1 ? 'has' : 'have'} no linked parent to reach.`,
    );
  return parts.join(' ');
}

/** One line per channel that has messages, e.g. "Email: 38 of 40 sent, 2 failed". */
export function channelLines(p: DeliveryProgress): string[] {
  const line = (label: string, c: ChannelProgress) => {
    const n = total(c);
    if (!n) return null;
    const extra = [
      c.pending && `${c.pending} waiting`,
      c.failed && `${c.failed} failed`,
      c.cancelled && `${c.cancelled} not sent (channel turned off)`,
    ].filter(Boolean);
    return `${label}: ${c.sent} of ${n} sent${extra.length ? `, ${extra.join(', ')}` : ''}`;
  };
  return [line('Email', p.email), line('SMS', p.sms)].filter((l): l is string => !!l);
}

/** Share of the messages that have finished (sent, failed or cancelled), 0–100. */
export function finishedPercent(p: DeliveryProgress): number {
  const all = total(p.email) + total(p.sms);
  if (!all) return 100;
  return Math.round(((all - p.email.pending - p.sms.pending) / all) * 100);
}

export const anyFailed = (p: DeliveryProgress) => p.email.failed + p.sms.failed > 0;
