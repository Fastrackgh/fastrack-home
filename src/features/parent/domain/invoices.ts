import { formatGhs, sumPesewas, type Pesewas } from '@/features/fees/money';
import type { ParentInvoice, ParentInvoiceSummary, PaymentChannel } from '../types';
import { formatDate, percent, type StatusStyle } from './format';

const INVOICE_STATUSES: Record<string, StatusStyle> = {
  UNPAID: { label: 'Unpaid', color: 'red' },
  PARTIAL: { label: 'Part paid', color: 'orange' },
  PAID: { label: 'Paid', color: 'green' },
  OVERPAID: { label: 'In credit', color: 'cyan' },
  // The unpaid balance moved onto the next term's bill as arrears; this bill shows 0.
  CARRIED_FORWARD: { label: 'Moved to next bill', color: 'gray' },
};

export const invoiceStatus = (status: string): StatusStyle =>
  INVOICE_STATUSES[status] ?? { label: status, color: 'gray' };

/** `Term 1, 2026/2027`, or `fallback` for a bill outside a term. */
export const invoiceTermLabel = (
  invoice: Pick<ParentInvoice, 'termLabel' | 'yearLabel'>,
  fallback: string,
) => (invoice.termLabel ? `${invoice.termLabel}, ${invoice.yearLabel}` : fallback);

/**
 * What `arrearsBf` brings in: extra bills from this same term, and the rest
 * from earlier terms (negative for a credit). Older backends send neither part,
 * so all of it then counts as earlier terms' (QA-219).
 */
export function broughtForward(
  invoice: Pick<ParentInvoice, 'arrearsBf' | 'sameTermBills' | 'arrearsFromEarlierTerms'>,
) {
  const sameTermBills = invoice.sameTermBills ?? [];
  const earlierTerms =
    invoice.arrearsFromEarlierTerms ??
    invoice.arrearsBf - sumPesewas(sameTermBills, (bill) => bill.amount);
  return { sameTermBills, earlierTerms };
}

/** A credit bigger than the fees leaves a negative balance (QA-244). */
export const isInCredit = (invoice: Pick<ParentInvoice, 'balance'>) => invoice.balance < 0;

/** `GHS 120.00`, `GHS 50.00 credit` when negative, or `—` when not known. */
export const formatOwed = (amount: Pesewas | null | undefined) => {
  if (amount == null) return '—';
  return amount < 0 ? `${formatGhs(-amount)} credit` : formatGhs(amount);
};

/** `GHS 120.00`, or `GHS 50.00 credit` for a negative balance. */
export const formatBalance = (invoice: Pick<ParentInvoice, 'balance'>) =>
  formatOwed(invoice.balance);

/** ` · Due 12 Jan 2027` while money is still owed; empty otherwise. */
export const dueNote = (invoice: Pick<ParentInvoice, 'balance' | 'dueDate'>) =>
  invoice.dueDate && invoice.balance > 0 ? ` · Due ${formatDate(invoice.dueDate)}` : '';

/** Why a bill shows the balance it does, under the headline amount. */
export function balanceNote(invoice: ParentInvoice): string {
  if (invoice.balance > 0) return 'Balance to pay';
  if (isInCredit(invoice)) return 'Nothing to pay on this bill';
  if (invoice.status === 'CARRIED_FORWARD') {
    const moved = formatGhs(invoice.carriedForwardAmount ?? 0);
    return `${moved} moved to ${invoice.carriedForwardToInvoiceNumber ?? 'the next bill'}`;
  }
  return invoice.feePayable <= 0 ? 'Covered by credit' : 'Fully paid';
}

/** Whether this parent can pay this bill online. */
export const canPayOnline = (invoice: ParentInvoice, canMakePayments: boolean) =>
  invoice.balance > 0 && invoice.canPayOnline !== false && canMakePayments;

/** The school takes fees only at its office, and this bill still owes. */
export const paysAtSchoolOnly = (invoice: ParentInvoice) =>
  invoice.balance > 0 && invoice.canPayOnline === false;

/** Total still owed across the given bills; credits don't offset other bills here. */
export const totalOwed = (invoices: ParentInvoice[]): Pesewas =>
  sumPesewas(invoices, (invoice) => Math.max(invoice.balance, 0));

/** The headline of a set of bills, from the backend's totals rather than a page of bills. */
export interface SummaryHeadline {
  inCredit: boolean;
  /** Owed, or held in credit when `inCredit`. */
  amount: Pesewas;
  paidPercent: number;
  /** What the headline netted or left out, in words. */
  notes: string[];
}

export function summaryHeadline(summary: ParentInvoiceSummary): SummaryHeadline {
  const { totalBilled, totalPaid, outstanding, overpaid, broughtForward, carriedForward } = summary;
  // A bill can hold a credit while another still owes (QA-243), so the headline
  // nets the two and the notes explain what was netted.
  const net = outstanding - overpaid;
  const inCredit = net < 0;
  const notes = [
    broughtForward > 0 &&
      `Includes ${formatGhs(broughtForward)} brought forward from earlier bills`,
    carriedForward > 0 && `${formatGhs(carriedForward)} moved to a later bill`,
    overpaid > 0 &&
      outstanding > 0 &&
      (inCredit
        ? `After ${formatGhs(outstanding)} still owed on another bill`
        : `After ${formatGhs(overpaid)} credit from an earlier bill`),
  ].filter((note): note is string => Boolean(note));
  return {
    inCredit,
    amount: Math.abs(net),
    paidPercent: Math.min(percent(totalPaid, totalBilled) ?? 0, 100),
    notes,
  };
}

export const PAYMENT_CHANNELS: { value: PaymentChannel; label: string }[] = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
];

/** Why an online payment amount can't be sent, or null when it can. */
export function checkoutAmountError(amount: Pesewas, balance: Pesewas): string | null {
  if (amount <= 0) return 'Enter an amount.';
  // Online payments can't exceed what is owed (QA-029).
  if (amount > balance) return `You can pay at most ${formatGhs(balance)}.`;
  return null;
}
