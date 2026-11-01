import { formatGhs } from '@/features/fees/money';
import type {
  OptionalFeeRequest,
  OptionalFeeRequestAction,
  OptionalFeeRequestStatus,
  OptionalService,
} from '../types';
import type { StatusStyle } from './format';

/*
 * Parents can't change a bill. They ask to start or stop an optional service
 * (bus, feeding, ...), the school approves, and the change shows on the next
 * bill the school creates.
 */

export const REQUEST_STATUS: Record<OptionalFeeRequestStatus, StatusStyle> = {
  PENDING: { label: 'Waiting for school', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'green' },
  DECLINED: { label: 'Declined', color: 'red' },
  CANCELLED: { label: 'Cancelled', color: 'gray' },
};

/** `Start bus`, `Stop feeding`. */
export const actionLabel = (action: OptionalFeeRequestAction, name: string) =>
  action === 'OPT_IN' ? `Start ${name}` : `Stop ${name}`;

/** What the parent can ask for next: to stop a service they take, or start one they don't. */
export const nextAction = (service: OptionalService): OptionalFeeRequestAction =>
  service.enrolled ? 'OPT_OUT' : 'OPT_IN';

/** Shown before sending: what happens once the school approves. */
export function requestOutcome(service: OptionalService, action: OptionalFeeRequestAction) {
  if (action === 'OPT_OUT') {
    return `Once the school approves, ${service.name} is left off the next bill.`;
  }
  const price = service.amount !== null ? ` (${formatGhs(service.amount)} a term)` : '';
  return `Once the school approves, ${service.name}${price} is added from the next bill.`;
}

export const servicePrice = (service: OptionalService) =>
  service.amount === null ? 'Price not set' : `${formatGhs(service.amount)} / term`;

/** Requests the school has answered (or the parent withdrew), newest first as sent. */
export const decidedRequests = (requests: OptionalFeeRequest[], limit = 10) =>
  requests.filter((request) => request.status !== 'PENDING').slice(0, limit);
