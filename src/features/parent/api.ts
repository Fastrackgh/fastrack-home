import { apiClient, pathId, type PageMeta } from '@/lib/api-client';
import { pageParams, toPage, type Page, type Raw } from '@/lib/pagination';
import { toInvoice, toPayment } from '@/features/fees/api';
import { toCedis, toPesewas } from '@/features/fees/money';
import { mockParentApi } from './mock';
import type {
  AcademicTerm,
  AttendanceRecord,
  CheckoutRequest,
  CheckoutSession,
  LinkChallenge,
  OptionalFeeRequest,
  OptionalFeeRequestAction,
  ParentInvoice,
  ParentInvoiceSummary,
  ParentPayment,
  PaymentVerification,
  ResentChallenge,
  TermReport,
  Ward,
  WardCalendar,
  WardOptionalServices,
  WardProfile,
} from './types';

/*
 * Every read is scoped to one linked ward: `/parents/me/wards/:studentId/...`.
 * The backend checks the parent-ward link and the ward's school modules, since a
 * parent has no school of their own (QA-026). Everything but reports exists on
 * the backend; reports are still the contract in docs/api/parent-portal.md. Set
 * NEXT_PUBLIC_PARENT_API_MOCK=1 to run the portal on sample data.
 */

export interface InvoiceListQuery {
  page: number;
  termId?: string | null;
}

export interface ParentApi {
  listWards(): Promise<Ward[]>;
  initiateLink(request: { studentCode: string; schoolCode?: string }): Promise<LinkChallenge>;
  resendLinkOtp(requestId: string): Promise<ResentChallenge>;
  verifyLink(requestId: string, otp: string): Promise<Ward>;
  unlinkWard(studentId: string): Promise<void>;
  getWard(studentId: string): Promise<WardProfile>;
  listTerms(studentId: string): Promise<AcademicTerm[]>;
  listInvoices(studentId: string, query: InvoiceListQuery): Promise<Page<ParentInvoice>>;
  /** Totals for the same bills as `listInvoices` with this termId, across every page. */
  invoiceSummary(studentId: string, termId?: string | null): Promise<ParentInvoiceSummary>;
  getInvoice(studentId: string, invoiceId: string): Promise<ParentInvoice>;
  invoiceDocument(studentId: string, invoiceId: string): Promise<string>;
  listPayments(studentId: string, query: { page: number }): Promise<Page<ParentPayment>>;
  getPayment(studentId: string, paymentId: string): Promise<ParentPayment>;
  receiptDocument(studentId: string, paymentId: string): Promise<string>;
  checkout(
    studentId: string,
    invoiceId: string,
    request: CheckoutRequest,
  ): Promise<CheckoutSession>;
  verifyPayment(reference: string): Promise<PaymentVerification>;
  listReports(studentId: string): Promise<TermReport[]>;
  getReport(studentId: string, reportId: string): Promise<TermReport>;
  reportDocument(studentId: string, reportId: string): Promise<string>;
  attendance(studentId: string, range: { from: string; to: string }): Promise<AttendanceRecord>;
  /** Defaults to the current term of the ward's school. */
  calendar(studentId: string, termId?: string | null): Promise<WardCalendar>;
  listOptionalServices(studentId: string): Promise<WardOptionalServices>;
  listOptionalFeeRequests(studentId: string): Promise<OptionalFeeRequest[]>;
  requestOptionalService(
    studentId: string,
    request: { feeTypeId: string; action: OptionalFeeRequestAction; note?: string },
  ): Promise<OptionalFeeRequest>;
  cancelOptionalFeeRequest(studentId: string, requestId: string): Promise<OptionalFeeRequest>;
}

const ward = (studentId: string) => `/parents/me/wards/${encodeURIComponent(studentId)}`;

const toParentInvoice = (raw: Raw): ParentInvoice => ({
  ...(raw as unknown as ParentInvoice),
  ...toInvoice(raw),
  carriedForwardAmount: toPesewas(raw.carriedForwardAmount),
});

const toParentPayment = (raw: Raw): ParentPayment => ({
  ...(raw as unknown as ParentPayment),
  ...toPayment(raw),
});

const liveParentApi: ParentApi = {
  async listWards() {
    const res = await apiClient.get<Ward[]>('/parents/me/wards');
    return res.data ?? [];
  },
  async initiateLink(request) {
    const res = await apiClient.post<LinkChallenge>('/parents/me/wards/link/initiate', request);
    return res.data;
  },
  async resendLinkOtp(requestId) {
    const res = await apiClient.post<ResentChallenge>('/parents/me/wards/link/resend-otp', {
      requestId,
    });
    return res.data;
  },
  async verifyLink(requestId, otp) {
    const res = await apiClient.post<Ward>('/parents/me/wards/link/verify', { requestId, otp });
    return res.data;
  },
  async unlinkWard(studentId) {
    await apiClient.delete(ward(studentId));
  },
  async getWard(studentId) {
    const res = await apiClient.get<WardProfile>(ward(studentId));
    return { ...res.data, guardians: res.data.guardians ?? [] };
  },
  async listTerms(studentId) {
    const res = await apiClient.get<AcademicTerm[]>(`${ward(studentId)}/academic-terms`);
    return res.data ?? [];
  },
  async listInvoices(studentId, { page, termId }) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `${ward(studentId)}/invoices?${pageParams(page, { termId })}`,
    );
    return toPage(res, toParentInvoice);
  },
  async invoiceSummary(studentId, termId) {
    const query = termId ? `?${new URLSearchParams({ termId })}` : '';
    const { data } = await apiClient.get<Raw>(`${ward(studentId)}/invoices/summary${query}`);
    return {
      invoiceCount: Number(data.invoiceCount ?? 0),
      totalBilled: toPesewas(data.totalBilled),
      totalPaid: toPesewas(data.totalPaid),
      outstanding: toPesewas(data.outstanding),
      overpaid: toPesewas(data.overpaid),
      broughtForward: toPesewas(data.broughtForward),
      carriedForward: toPesewas(data.carriedForward),
    };
  },
  async getInvoice(studentId, invoiceId) {
    const res = await apiClient.get<Raw>(`${ward(studentId)}/invoices/${pathId(invoiceId)}`);
    return toParentInvoice(res.data);
  },
  async invoiceDocument(studentId, invoiceId) {
    const res = await apiClient.get<{ html: string }>(
      `${ward(studentId)}/invoices/${pathId(invoiceId)}/document`,
    );
    return res.data.html;
  },
  async listPayments(studentId, { page }) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `${ward(studentId)}/payments?${pageParams(page, {})}`,
    );
    return toPage(res, toParentPayment);
  },
  async getPayment(studentId, paymentId) {
    const res = await apiClient.get<Raw>(`${ward(studentId)}/payments/${pathId(paymentId)}`);
    return toParentPayment(res.data);
  },
  async receiptDocument(studentId, paymentId) {
    const res = await apiClient.get<{ html: string }>(
      `${ward(studentId)}/payments/${pathId(paymentId)}/document`,
    );
    return res.data.html;
  },
  async checkout(studentId, invoiceId, { amount, ...request }) {
    const res = await apiClient.post<CheckoutSession>(
      `${ward(studentId)}/invoices/${pathId(invoiceId)}/checkout`,
      { ...request, amount: toCedis(amount) },
    );
    return res.data;
  },
  async verifyPayment(reference) {
    const res = await apiClient.get<Raw>(
      `/parents/me/payments/verify?${new URLSearchParams({ reference })}`,
    );
    const payment = res.data.payment as Raw | null | undefined;
    return {
      ...(res.data as unknown as PaymentVerification),
      payment: payment ? toParentPayment(payment) : null,
    };
  },
  async listReports(studentId) {
    const res = await apiClient.get<TermReport[]>(`${ward(studentId)}/reports`);
    return res.data ?? [];
  },
  async getReport(studentId, reportId) {
    const res = await apiClient.get<TermReport>(`${ward(studentId)}/reports/${pathId(reportId)}`);
    return res.data;
  },
  async reportDocument(studentId, reportId) {
    const res = await apiClient.get<{ html: string }>(
      `${ward(studentId)}/reports/${pathId(reportId)}/document`,
    );
    return res.data.html;
  },
  async attendance(studentId, range) {
    const res = await apiClient.get<AttendanceRecord>(
      `${ward(studentId)}/attendance?${new URLSearchParams(range)}`,
    );
    return res.data;
  },
  async calendar(studentId, termId) {
    const query = termId ? `?${new URLSearchParams({ termId })}` : '';
    const res = await apiClient.get<WardCalendar>(`${ward(studentId)}/calendar${query}`);
    return { events: res.data.events ?? [], schoolDays: res.data.schoolDays };
  },
  async listOptionalServices(studentId) {
    const res = await apiClient.get<Raw>(`${ward(studentId)}/optional-services`);
    const services = (res.data.services as Raw[] | undefined) ?? [];
    return {
      ...(res.data as unknown as WardOptionalServices),
      services: services.map((service) => ({
        ...(service as unknown as WardOptionalServices['services'][number]),
        amount: service.amount === null ? null : toPesewas(service.amount),
      })),
    };
  },
  async listOptionalFeeRequests(studentId) {
    const res = await apiClient.get<OptionalFeeRequest[]>(
      `${ward(studentId)}/optional-fee-requests`,
    );
    return res.data ?? [];
  },
  async requestOptionalService(studentId, request) {
    const res = await apiClient.post<OptionalFeeRequest>(
      `${ward(studentId)}/optional-fee-requests`,
      request,
    );
    return res.data;
  },
  async cancelOptionalFeeRequest(studentId, requestId) {
    const res = await apiClient.post<OptionalFeeRequest>(
      `${ward(studentId)}/optional-fee-requests/${pathId(requestId)}/cancel`,
    );
    return res.data;
  },
};

export const isParentApiMocked = process.env.NEXT_PUBLIC_PARENT_API_MOCK === '1';

/**
 * Portal areas whose backend endpoints exist. Reports went live with results
 * phase 4 (docs/api/results.md); a school without the results module gets a
 * 403, shown as the usual "not turned on" state.
 */
export const parentAreaReady = {
  reports: true,
  attendance: true,
};

export const parentApi: ParentApi = isParentApiMocked ? mockParentApi : liveParentApi;
