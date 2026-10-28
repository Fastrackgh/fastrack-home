import type { Raw } from '@/lib/pagination';
import { toInvoice, toPayment } from '@/features/fees/api';
import { toPesewas } from '@/features/fees/money';
import type {
  OptionalService,
  ParentInvoice,
  ParentInvoiceSummary,
  ParentPayment,
  PaymentVerification,
  WardOptionalServices,
} from '../types';

/*
 * Backend responses to portal models. The API sends amounts in cedis; the
 * portal works in whole pesewas.
 */

export const toParentInvoice = (raw: Raw): ParentInvoice => ({
  ...(raw as unknown as ParentInvoice),
  ...toInvoice(raw),
  carriedForwardAmount: toPesewas(raw.carriedForwardAmount),
});

/** Pesewas, keeping null for an amount the backend didn't store. */
const toOptionalPesewas = (cedis: unknown) => (cedis == null ? null : toPesewas(cedis));

export const toParentPayment = (raw: Raw): ParentPayment => ({
  ...(raw as unknown as ParentPayment),
  ...toPayment(raw),
  previousBalance: toOptionalPesewas(raw.previousBalance),
  newBalance: toOptionalPesewas(raw.newBalance),
  surplusCredit: toOptionalPesewas(raw.surplusCredit),
});

export const toInvoiceSummary = (raw: Raw): ParentInvoiceSummary => ({
  invoiceCount: Number(raw.invoiceCount ?? 0),
  totalBilled: toPesewas(raw.totalBilled),
  totalPaid: toPesewas(raw.totalPaid),
  outstanding: toPesewas(raw.outstanding),
  overpaid: toPesewas(raw.overpaid),
  broughtForward: toPesewas(raw.broughtForward),
  carriedForward: toPesewas(raw.carriedForward),
});

export const toPaymentVerification = (raw: Raw): PaymentVerification => {
  const payment = raw.payment as Raw | null | undefined;
  return {
    ...(raw as unknown as PaymentVerification),
    payment: payment ? toParentPayment(payment) : null,
  };
};

const toOptionalService = (raw: Raw): OptionalService => ({
  ...(raw as unknown as OptionalService),
  amount: toOptionalPesewas(raw.amount),
});

export const toWardOptionalServices = (raw: Raw): WardOptionalServices => ({
  ...(raw as unknown as WardOptionalServices),
  services: ((raw.services as Raw[] | undefined) ?? []).map(toOptionalService),
});
