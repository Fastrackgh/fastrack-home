'use client';

import { parentApi } from '../api';
import { monthRange } from '../domain/attendance';
import { useParentQuery } from './useParentQuery';

/*
 * Every portal read, by name. The key decides which offline copy a read
 * shares, so two screens showing the same data (e.g. the Home tile and the
 * Fees list) must build it here. The strings stay stable across releases:
 * changing one orphans the parent's saved copy.
 */
export const parentQueryKeys = {
  wards: () => 'wards',
  ward: (studentId: string) => `ward:${studentId}`,
  terms: (studentId: string) => `terms:${studentId}`,
  invoices: (studentId: string, termId: string | null, page: number) =>
    `invoices:${studentId}:${termId ?? 'all'}:${page}`,
  invoiceSummary: (studentId: string, termId: string | null) =>
    `invoice-summary:${studentId}:${termId ?? 'all'}`,
  invoice: (studentId: string, invoiceId: string) => `invoice:${studentId}:${invoiceId}`,
  invoiceDocument: (studentId: string, invoiceId: string) =>
    `invoice-doc:${studentId}:${invoiceId}`,
  payments: (studentId: string, page: number) => `payments:${studentId}:${page}`,
  payment: (studentId: string, paymentId: string) => `payment:${studentId}:${paymentId}`,
  receiptDocument: (studentId: string, paymentId: string) =>
    `receipt-doc:${studentId}:${paymentId}`,
  reports: (studentId: string) => `reports:${studentId}`,
  assessments: (studentId: string) => `assessments:${studentId}`,
  report: (studentId: string, reportId: string) => `report:${studentId}:${reportId}`,
  reportDocument: (studentId: string, reportId: string) => `report-doc:${studentId}:${reportId}`,
  attendance: (studentId: string, month: string) => `attendance:${studentId}:${month}`,
  currentCalendar: (studentId: string) => `calendar:${studentId}:current`,
  optionalServices: (studentId: string) => `optional-services:${studentId}`,
  optionalFeeRequests: (studentId: string) => `optional-fee-requests:${studentId}`,
};

const keys = parentQueryKeys;

/** `enabled: false` skips the read, e.g. for an area the school hasn't turned on. */
interface Options {
  enabled?: boolean;
}

const keyIf = (enabled: boolean | undefined, key: string) => (enabled === false ? null : key);

export const useWardsQuery = () => useParentQuery(keys.wards(), () => parentApi.listWards());

export const useWardProfile = (studentId: string) =>
  useParentQuery(keys.ward(studentId), () => parentApi.getWard(studentId));

export const useTerms = (studentId: string) =>
  useParentQuery(keys.terms(studentId), () => parentApi.listTerms(studentId));

export const useInvoices = (
  studentId: string,
  { page, termId = null, enabled }: Options & { page: number; termId?: string | null },
) =>
  useParentQuery(keyIf(enabled, keys.invoices(studentId, termId, page)), () =>
    parentApi.listInvoices(studentId, { page, termId }),
  );

export const useInvoiceSummary = (studentId: string, termId: string | null) =>
  useParentQuery(keys.invoiceSummary(studentId, termId), () =>
    parentApi.invoiceSummary(studentId, termId),
  );

export const useInvoice = (studentId: string, invoiceId: string) =>
  useParentQuery(keys.invoice(studentId, invoiceId), () =>
    parentApi.getInvoice(studentId, invoiceId),
  );

export const usePayments = (studentId: string, page: number) =>
  useParentQuery(keys.payments(studentId, page), () => parentApi.listPayments(studentId, { page }));

export const usePayment = (studentId: string, paymentId: string) =>
  useParentQuery(keys.payment(studentId, paymentId), () =>
    parentApi.getPayment(studentId, paymentId),
  );

export const useReports = (studentId: string, { enabled }: Options = {}) =>
  useParentQuery(keyIf(enabled, keys.reports(studentId)), () => parentApi.listReports(studentId));

export const useAssessments = (studentId: string, { enabled }: Options = {}) =>
  useParentQuery(keyIf(enabled, keys.assessments(studentId)), () =>
    parentApi.listAssessments(studentId),
  );

export const useReport = (studentId: string, reportId: string) =>
  useParentQuery(keys.report(studentId, reportId), () => parentApi.getReport(studentId, reportId));

export const useAttendance = (studentId: string, month: string, { enabled }: Options = {}) =>
  useParentQuery(keyIf(enabled, keys.attendance(studentId, month)), () =>
    parentApi.attendance(studentId, monthRange(month)),
  );

export const useCurrentCalendar = (studentId: string, { enabled }: Options = {}) =>
  useParentQuery(keyIf(enabled, keys.currentCalendar(studentId)), () =>
    parentApi.calendar(studentId),
  );

export const useOptionalServices = (studentId: string) =>
  useParentQuery(keys.optionalServices(studentId), () => parentApi.listOptionalServices(studentId));

export const useOptionalFeeRequests = (studentId: string) =>
  useParentQuery(keys.optionalFeeRequests(studentId), () =>
    parentApi.listOptionalFeeRequests(studentId),
  );

/** The school-designed HTML of a bill, receipt or report, with its own cache key. */
export interface DocumentSource {
  cacheKey: string;
  load: () => Promise<string>;
}

export const parentDocuments = {
  invoice: (studentId: string, invoiceId: string): DocumentSource => ({
    cacheKey: keys.invoiceDocument(studentId, invoiceId),
    load: () => parentApi.invoiceDocument(studentId, invoiceId),
  }),
  receipt: (studentId: string, paymentId: string): DocumentSource => ({
    cacheKey: keys.receiptDocument(studentId, paymentId),
    load: () => parentApi.receiptDocument(studentId, paymentId),
  }),
  report: (studentId: string, reportId: string): DocumentSource => ({
    cacheKey: keys.reportDocument(studentId, reportId),
    load: () => parentApi.reportDocument(studentId, reportId),
  }),
};
