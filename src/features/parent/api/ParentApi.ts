import type { Page } from '@/lib/pagination';
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
  WardAssessment,
  WardCalendar,
  WardOptionalServices,
  WardProfile,
} from '../types';

/*
 * What the parent portal needs from the backend. Every read is scoped to one
 * linked ward: `/parents/me/wards/:studentId/...`. The backend checks the
 * parent-ward link and the ward's school modules, since a parent has no
 * school of their own (QA-026). The contract is docs/api/parent-portal.md.
 */

export interface InvoiceListQuery {
  page: number;
  termId?: string | null;
}

export interface OptionalServiceRequest {
  feeTypeId: string;
  action: OptionalFeeRequestAction;
  note?: string;
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
  /** Published standalone assessments (e.g. mocks), newest first. */
  listAssessments(studentId: string): Promise<WardAssessment[]>;
  getReport(studentId: string, reportId: string): Promise<TermReport>;
  reportDocument(studentId: string, reportId: string): Promise<string>;
  attendance(studentId: string, range: { from: string; to: string }): Promise<AttendanceRecord>;
  /** Defaults to the current term of the ward's school. */
  calendar(studentId: string, termId?: string | null): Promise<WardCalendar>;
  listOptionalServices(studentId: string): Promise<WardOptionalServices>;
  listOptionalFeeRequests(studentId: string): Promise<OptionalFeeRequest[]>;
  requestOptionalService(
    studentId: string,
    request: OptionalServiceRequest,
  ): Promise<OptionalFeeRequest>;
  cancelOptionalFeeRequest(studentId: string, requestId: string): Promise<OptionalFeeRequest>;
}
