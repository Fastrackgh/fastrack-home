import { apiClient, pathId, type PageMeta } from '@/lib/api-client';
import { pageParams, toPage, type Raw } from '@/lib/pagination';
import { toCedis } from '@/features/fees/money';
import type {
  AcademicTerm,
  AttendanceRecord,
  CheckoutRequest,
  CheckoutSession,
  LinkChallenge,
  OptionalFeeRequest,
  ResentChallenge,
  TermReport,
  WardAssessment,
  Ward,
  WardCalendar,
  WardProfile,
} from '../types';
import {
  toInvoiceSummary,
  toParentInvoice,
  toParentPayment,
  toPaymentVerification,
  toWardOptionalServices,
} from './mappers';
import type { InvoiceListQuery, OptionalServiceRequest, ParentApi } from './ParentApi';

const PARENT_BASE = '/parents/me';

/** `?termId=...`, or nothing when no term is chosen. */
const termQuery = (termId?: string | null) => (termId ? `?${new URLSearchParams({ termId })}` : '');

/** The parent portal on the Fastrack backend. */
export class HttpParentApi implements ParentApi {
  private ward(studentId: string) {
    return `${PARENT_BASE}/wards/${pathId(studentId)}`;
  }

  /** The school-designed HTML of a bill, receipt or report. */
  private async document(path: string) {
    const res = await apiClient.get<{ html: string }>(`${path}/document`);
    return res.data.html;
  }

  async listWards() {
    const res = await apiClient.get<Ward[]>(`${PARENT_BASE}/wards`);
    return res.data ?? [];
  }

  async initiateLink(request: { studentCode: string; schoolCode?: string }) {
    const res = await apiClient.post<LinkChallenge>(`${PARENT_BASE}/wards/link/initiate`, request);
    return res.data;
  }

  async resendLinkOtp(requestId: string) {
    const res = await apiClient.post<ResentChallenge>(`${PARENT_BASE}/wards/link/resend-otp`, {
      requestId,
    });
    return res.data;
  }

  async verifyLink(requestId: string, otp: string) {
    const res = await apiClient.post<Ward>(`${PARENT_BASE}/wards/link/verify`, {
      requestId,
      otp,
    });
    return res.data;
  }

  async unlinkWard(studentId: string) {
    await apiClient.delete(this.ward(studentId));
  }

  async getWard(studentId: string) {
    const res = await apiClient.get<WardProfile>(this.ward(studentId));
    return { ...res.data, guardians: res.data.guardians ?? [] };
  }

  async listTerms(studentId: string) {
    const res = await apiClient.get<AcademicTerm[]>(`${this.ward(studentId)}/academic-terms`);
    return res.data ?? [];
  }

  async listInvoices(studentId: string, { page, termId }: InvoiceListQuery) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `${this.ward(studentId)}/invoices?${pageParams(page, { termId })}`,
    );
    return toPage(res, toParentInvoice);
  }

  async invoiceSummary(studentId: string, termId?: string | null) {
    const res = await apiClient.get<Raw>(
      `${this.ward(studentId)}/invoices/summary${termQuery(termId)}`,
    );
    return toInvoiceSummary(res.data);
  }

  async getInvoice(studentId: string, invoiceId: string) {
    const res = await apiClient.get<Raw>(`${this.ward(studentId)}/invoices/${pathId(invoiceId)}`);
    return toParentInvoice(res.data);
  }

  invoiceDocument(studentId: string, invoiceId: string) {
    return this.document(`${this.ward(studentId)}/invoices/${pathId(invoiceId)}`);
  }

  async listPayments(studentId: string, { page }: { page: number }) {
    const res = await apiClient.get<Raw[], PageMeta>(
      `${this.ward(studentId)}/payments?${pageParams(page, {})}`,
    );
    return toPage(res, toParentPayment);
  }

  async getPayment(studentId: string, paymentId: string) {
    const res = await apiClient.get<Raw>(`${this.ward(studentId)}/payments/${pathId(paymentId)}`);
    return toParentPayment(res.data);
  }

  receiptDocument(studentId: string, paymentId: string) {
    return this.document(`${this.ward(studentId)}/payments/${pathId(paymentId)}`);
  }

  async checkout(studentId: string, invoiceId: string, { amount, ...request }: CheckoutRequest) {
    const res = await apiClient.post<CheckoutSession>(
      `${this.ward(studentId)}/invoices/${pathId(invoiceId)}/checkout`,
      { ...request, amount: toCedis(amount) },
    );
    return res.data;
  }

  async verifyPayment(reference: string) {
    const res = await apiClient.get<Raw>(
      `${PARENT_BASE}/payments/verify?${new URLSearchParams({ reference })}`,
    );
    return toPaymentVerification(res.data);
  }

  async listReports(studentId: string) {
    const res = await apiClient.get<TermReport[]>(`${this.ward(studentId)}/reports`);
    return res.data ?? [];
  }

  async listAssessments(studentId: string) {
    const res = await apiClient.get<WardAssessment[]>(`${this.ward(studentId)}/assessments`);
    return res.data ?? [];
  }

  async getReport(studentId: string, reportId: string) {
    const res = await apiClient.get<TermReport>(
      `${this.ward(studentId)}/reports/${pathId(reportId)}`,
    );
    return res.data;
  }

  reportDocument(studentId: string, reportId: string) {
    return this.document(`${this.ward(studentId)}/reports/${pathId(reportId)}`);
  }

  async attendance(studentId: string, range: { from: string; to: string }) {
    const res = await apiClient.get<AttendanceRecord>(
      `${this.ward(studentId)}/attendance?${new URLSearchParams(range)}`,
    );
    return res.data;
  }

  async calendar(studentId: string, termId?: string | null) {
    const res = await apiClient.get<WardCalendar>(
      `${this.ward(studentId)}/calendar${termQuery(termId)}`,
    );
    return { events: res.data.events ?? [], schoolDays: res.data.schoolDays };
  }

  async listOptionalServices(studentId: string) {
    const res = await apiClient.get<Raw>(`${this.ward(studentId)}/optional-services`);
    return toWardOptionalServices(res.data);
  }

  async listOptionalFeeRequests(studentId: string) {
    const res = await apiClient.get<OptionalFeeRequest[]>(
      `${this.ward(studentId)}/optional-fee-requests`,
    );
    return res.data ?? [];
  }

  async requestOptionalService(studentId: string, request: OptionalServiceRequest) {
    const res = await apiClient.post<OptionalFeeRequest>(
      `${this.ward(studentId)}/optional-fee-requests`,
      request,
    );
    return res.data;
  }

  async cancelOptionalFeeRequest(studentId: string, requestId: string) {
    const res = await apiClient.post<OptionalFeeRequest>(
      `${this.ward(studentId)}/optional-fee-requests/${pathId(requestId)}/cancel`,
    );
    return res.data;
  }
}
