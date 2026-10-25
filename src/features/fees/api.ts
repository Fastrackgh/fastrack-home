import { setupApi, type TermInYear } from '@/features/school-setup/api';
import { apiClient, PageMeta } from '@/lib/api-client';
import { pageParams, toPage, type Page, type Raw } from '@/lib/pagination';
import { toCedis, toPesewas, type Pesewas } from './money';

// Amount fields below are whole pesewas; the API sends and receives cedis.

export interface InvoiceLineItem {
  id: string;
  feeTypeId: string;
  feeTypeName: string;
  amount: Pesewas;
  isOptional: boolean;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' | 'CARRIED_FORWARD';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentCode?: string | null;
  studentName?: string;
  className?: string;
  /** Negative when the student carries a credit into this invoice. */
  arrearsBf: Pesewas;
  totalFees: Pesewas;
  discountAmount: Pesewas;
  feePayable: Pesewas;
  totalPayment: Pesewas;
  balance: Pesewas;
  status: InvoiceStatus | string;
  /** Absent from list responses; loaded with `getInvoice`. */
  lineItems?: InvoiceLineItem[];
  signature?: string | null;
  viewUrl?: string | null;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaid: Pesewas;
  paymentMethod: string;
  bankType?: string | null;
  transactionReference?: string | null;
  studentName?: string;
  studentCode?: string | null;
  className?: string;
  previousBalance: Pesewas;
  newBalance: Pesewas;
  recordedByName?: string;
}

export interface FeeStructure {
  id: string;
  feeTypeId: string;
  feeTypeName: string;
  classId: string;
  className?: string | null;
  termId: string;
  termLabel?: string;
  yearLabel?: string;
  amount: Pesewas;
  /** ISO date (yyyy-mm-dd). */
  dueDate: string;
  penalty: Pesewas;
  isOptional: boolean;
}

export interface FeeType {
  id: string;
  name: string;
  description?: string | null;
  /** Charged every term rather than once. */
  isRecurring: boolean;
  isOptional: boolean;
}

/** Values of the backend's `DiscountType` enum. */
export type DiscountType = 'percentage' | 'flat' | 'special';

export const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'percentage', label: 'Percentage of the fee' },
  { value: 'flat', label: 'Fixed amount' },
  { value: 'special', label: 'Special concession (fixed amount)' },
];

export interface Discount {
  id: string;
  studentName?: string;
  studentCode?: string | null;
  className?: string;
  /** Null when the discount applies to the whole bill. */
  feeTypeName?: string | null;
  /** Null when the discount applies every term. */
  termLabel?: string | null;
  discountType: DiscountType;
  /** A percentage for `percentage`, otherwise pesewas. */
  value: number;
  reason?: string | null;
  approvedByName?: string;
}

export interface SchoolClass {
  id: string;
  classCode: string;
  className: string;
}

export interface AcademicContext {
  yearId: string;
  yearLabel: string;
  termId: string;
  termLabel: string;
}

export interface StudentOption {
  id: string;
  studentId: string;
  fullName: string;
  studentCode: string;
  className: string;
}

/** Values of the backend's `PaymentMethod` enum. */
export const PAYMENT_METHODS = [
  { value: 'MoMo', label: 'Mobile Money' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank transfer' },
  { value: 'Cheque', label: 'Cheque' },
];

export interface InvoiceQuery {
  page: number;
  search?: string;
  classId?: string | null;
  status?: InvoiceStatus;
}

export interface PaymentQuery {
  page: number;
  studentId?: string | null;
  paymentMethod?: string | null;
}

export interface FeeStructureQuery {
  page: number;
  termId?: string | null;
  classId?: string | null;
}

export interface DiscountQuery {
  page: number;
  /** Enrolment id. */
  studentId?: string | null;
  termId?: string | null;
}

export interface FeeTypeInput {
  name: string;
  description?: string;
  isRecurring: boolean;
  isOptional: boolean;
}

export interface FeeStructureInput {
  term: AcademicContext;
  classIds: string[];
  items: { feeTypeId: string; amount: Pesewas; dueDate: string; penalty: Pesewas }[];
}

export interface FeeStructureChange {
  amount: Pesewas;
  dueDate: string;
  penalty: Pesewas;
}

export interface DiscountInput {
  /** Enrolment id. */
  studentId: string;
  feeTypeId?: string;
  termId?: string;
  discountType: DiscountType;
  /** A percentage for `percentage`, otherwise pesewas. */
  value: number;
  reason?: string;
}

export interface RecordPaymentRequest {
  studentId: string;
  invoiceId?: string;
  amount: Pesewas;
  paymentMethod: string;
  bankType?: string;
  transactionReference?: string;
}

export type { Page };
export { PAGE_SIZE } from '@/lib/pagination';

export const toInvoice = (raw: Raw): Invoice => ({
  ...(raw as unknown as Invoice),
  arrearsBf: toPesewas(raw.arrearsBf),
  totalFees: toPesewas(raw.totalFees),
  discountAmount: toPesewas(raw.discountAmount),
  feePayable: toPesewas(raw.feePayable),
  totalPayment: toPesewas(raw.totalPayment),
  balance: toPesewas(raw.balance),
  lineItems: Array.isArray(raw.lineItems)
    ? (raw.lineItems as Raw[]).map((item) => ({
        ...(item as unknown as InvoiceLineItem),
        amount: toPesewas(item.amount),
      }))
    : undefined,
});

export const toPayment = (raw: Raw): Payment => ({
  ...(raw as unknown as Payment),
  amountPaid: toPesewas(raw.amountPaid),
  previousBalance: toPesewas(raw.previousBalance),
  newBalance: toPesewas(raw.newBalance),
});

const toFeeStructure = (raw: Raw): FeeStructure => ({
  ...(raw as unknown as FeeStructure),
  amount: toPesewas(raw.amount),
  penalty: toPesewas(raw.penalty),
});

const isPercentage = (type: unknown) => type === 'percentage';

const toDiscount = (raw: Raw): Discount => ({
  ...(raw as unknown as Discount),
  value: isPercentage(raw.discountType) ? Number(raw.discountValue) : toPesewas(raw.discountValue),
});

/** School-wide totals for the invoices matching a filter (`GET /schools/me/invoices/summary`). */
export interface InvoiceSummary {
  invoiceCount: number;
  billed: Pesewas;
  collected: Pesewas;
  outstanding: Pesewas;
  overpaid: Pesewas;
  /** Collected ÷ (collected + outstanding), as a percentage to one decimal. */
  collectionRate: number;
}

export interface GenerateResult {
  generatedCount: number;
  skippedCount: number;
  message: string;
}

export interface SupplementaryRequest {
  academicTermId: string;
  title: string;
  feeTypeId: string;
  classId?: string;
  studentId?: string;
  /** Leave out to use the class's fee structure amount. */
  amount?: Pesewas;
  dueDate?: string;
}

export interface BroadcastRequest {
  academicTermId?: string;
  classId?: string;
  channel?: 'SMS' | 'EMAIL' | 'BOTH';
}

export interface ModifyRequest {
  reason: string;
  lineItems: { feeTypeId: string; amount: Pesewas; description?: string }[];
}

export const feesApi = {
  async listInvoices({ page, ...filters }: InvoiceQuery): Promise<Page<Invoice>> {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/invoices?${pageParams(page, filters)}`,
    );
    return toPage(res, toInvoice);
  },
  /** Totals over every matching invoice, not just one page. */
  async invoiceSummary(filters: Omit<InvoiceQuery, 'page'>): Promise<InvoiceSummary> {
    const query = pageParams(1, filters);
    query.delete('page');
    query.delete('limit');
    const raw = (await apiClient.get<Raw>(`/schools/me/invoices/summary?${query}`)).data ?? {};
    return {
      invoiceCount: Number(raw.invoiceCount ?? 0),
      billed: toPesewas(raw.totalBilled),
      collected: toPesewas(raw.totalCollected),
      outstanding: toPesewas(raw.outstanding),
      overpaid: toPesewas(raw.overpaid),
      collectionRate: Number(raw.collectionRate ?? 0),
    };
  },
  async getInvoice(id: string): Promise<Invoice> {
    const res = await apiClient.get<Raw>(`/schools/me/invoices/${encodeURIComponent(id)}`);
    return toInvoice(res.data);
  },
  async latestInvoiceFor(studentId: string): Promise<Invoice> {
    const res = await apiClient.get<Raw>(
      `/schools/me/invoices/students/${encodeURIComponent(studentId)}/latest`,
    );
    return toInvoice(res.data);
  },
  async generateInvoices(request: { academicTermId: string; classId?: string; dueDate?: string }) {
    const res = await apiClient.post<GenerateResult>('/schools/me/invoices/generate', request);
    return res.data;
  },
  /** A one-off bill (e.g. mock exam fee) for one student, one class or the whole school. */
  async generateSupplementary(request: SupplementaryRequest) {
    const { amount, ...rest } = request;
    const res = await apiClient.post<GenerateResult>('/schools/me/invoices/supplementary', {
      ...rest,
      ...(amount !== undefined ? { amount: toCedis(amount) } : {}),
    });
    return res.data;
  },
  /** Texts or emails the parent the bill's view link. */
  async sendInvoiceLink(id: string) {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      `/schools/me/invoices/${encodeURIComponent(id)}/send-link`,
    );
    return res.data;
  },
  /** Queues bill links to every matching parent. */
  async broadcastInvoiceLinks(request: BroadcastRequest) {
    const res = await apiClient.post<{ queuedCount: number; message: string }>(
      '/schools/me/invoices/broadcast-links',
      request,
    );
    return res.data;
  },
  /** Changes a bill's amounts; the reason is kept in the audit log. */
  async modifyInvoice(id: string, request: ModifyRequest) {
    const res = await apiClient.patch<Raw>(
      `/schools/me/invoices/${encodeURIComponent(id)}/modify`,
      {
        reason: request.reason,
        lineItems: request.lineItems.map((item) => ({ ...item, amount: toCedis(item.amount) })),
      },
    );
    return toInvoice(res.data);
  },
  async listPayments({ page, ...filters }: PaymentQuery): Promise<Page<Payment>> {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/payments?${pageParams(page, filters)}`,
    );
    return toPage(res, toPayment);
  },
  /** `idempotencyKey`: one per payment attempt, so a retried submit is not recorded twice. */
  async recordPayment(
    { amount, ...request }: RecordPaymentRequest,
    idempotencyKey?: string,
  ): Promise<Payment | null> {
    const res = await apiClient.post<Raw[] | Raw>(
      '/schools/me/payments',
      { ...request, amount: toCedis(amount) },
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    );
    const created = Array.isArray(res.data) ? res.data[0] : res.data;
    return created ? toPayment(created) : null;
  },
  async listFeeStructures({ page, ...filters }: FeeStructureQuery): Promise<Page<FeeStructure>> {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/fee-structures?${pageParams(page, filters)}`,
    );
    return toPage(res, toFeeStructure);
  },
  async createFeeStructures({ term, classIds, items }: FeeStructureInput) {
    const res = await apiClient.post<Raw[]>('/schools/me/fee-structures/batch', {
      academicYearId: term.yearId,
      academicTermId: term.termId,
      classIds,
      items: items.map((item) => ({
        ...item,
        amount: toCedis(item.amount),
        penalty: toCedis(item.penalty),
      })),
    });
    return (res.data ?? []).map(toFeeStructure);
  },
  async updateFeeStructure(id: string, change: FeeStructureChange) {
    const res = await apiClient.patch<Raw>(`/schools/me/fee-structures/${encodeURIComponent(id)}`, {
      ...change,
      amount: toCedis(change.amount),
      penalty: toCedis(change.penalty),
    });
    return toFeeStructure(res.data);
  },
  async deleteFeeStructure(id: string) {
    await apiClient.delete(`/schools/me/fee-structures/${encodeURIComponent(id)}`);
  },
  async listFeeTypes() {
    return (await apiClient.get<FeeType[]>('/schools/me/fee-types')).data ?? [];
  },
  async createFeeType(input: FeeTypeInput) {
    return (await apiClient.post<FeeType>('/schools/me/fee-types', input)).data;
  },
  async updateFeeType(id: string, input: FeeTypeInput) {
    const res = await apiClient.patch<FeeType>(
      `/schools/me/fee-types/${encodeURIComponent(id)}`,
      input,
    );
    return res.data;
  },
  /** Adds the backend's standard fee types (tuition, PTA and so on) to the school. */
  async addDefaultFeeTypes() {
    await apiClient.post('/schools/me/fee-types/seed-defaults');
  },
  async listDiscounts({ page, ...filters }: DiscountQuery): Promise<Page<Discount>> {
    const res = await apiClient.get<Raw[], PageMeta>(
      `/schools/me/discounts?${pageParams(page, filters)}`,
    );
    return toPage(res, toDiscount);
  },
  async createDiscount({ value, ...input }: DiscountInput) {
    const res = await apiClient.post<Raw>('/schools/me/discounts', {
      ...input,
      discountValue: isPercentage(input.discountType) ? value : toCedis(value),
    });
    return toDiscount(res.data);
  },
  async deleteDiscount(id: string) {
    await apiClient.delete(`/schools/me/discounts/${encodeURIComponent(id)}`);
  },
  /** Every class (the list endpoint pages, at most 100 a page). */
  async listClasses(): Promise<SchoolClass[]> {
    return setupApi.allClasses();
  },
  async listStudentOptions() {
    return (await apiClient.get<StudentOption[]>('/schools/me/students?limit=100')).data ?? [];
  },
  /** Every term of every academic year, newest year first. */
  async listTerms(): Promise<TermInYear[]> {
    return setupApi.listTerms();
  },
  /** The current year and term, or null when either is not set up. */
  async currentTerm(): Promise<AcademicContext | null> {
    return setupApi.currentTerm();
  },
};
