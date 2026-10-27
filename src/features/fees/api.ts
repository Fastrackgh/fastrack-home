import { setupApi, type TermInYear } from '@/features/school-setup/api';
import { ApiError, apiClient, errorDetails, PageMeta } from '@/lib/api-client';
import { fetchAll, pageParams, toPage, type Page, type Raw } from '@/lib/pagination';
import { formatGhs, sumPesewas, toCedis, toPesewas, type Pesewas } from './money';

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
  /** Set on extra bills, e.g. "Sports day"; term bills read "Term 2 Term Fees". */
  title?: string | null;
  createdAt?: string;
  /** Negative when the student carries a credit into this invoice. */
  arrearsBf: Pesewas;
  /** Extra bills from this same term rolled into `arrearsBf` (QA-219). */
  sameTermBills: SameTermBill[];
  /** The part of `arrearsBf` from earlier terms; negative for a credit. */
  arrearsFromEarlierTerms: Pesewas;
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

export interface SameTermBill {
  invoiceNumber: string;
  title: string;
  amount: Pesewas;
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
  /** The bill the payment went to. */
  invoiceNumber?: string | null;
  /** The student's account balance before and after; negative is a credit. */
  previousBalance: Pesewas;
  newBalance: Pesewas;
  /** False when the backend has no balances for this payment, made before they were stored (QA-277); both then read 0. */
  balancesRecorded?: boolean;
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
  /** One term's bills. */
  termId?: string | null;
  classId?: string | null;
  status?: InvoiceStatus;
  /** One pupil's bills (their school membership id). */
  studentId?: string | null;
  /** Only pupils who have left: their bills stay owed and payable. */
  leavers?: boolean;
}

/** Query parameters for an invoice filter; `leavers` is sent as "true" only when set. */
const invoiceParams = (page: number, { leavers, ...filters }: Omit<InvoiceQuery, 'page'>) =>
  pageParams(page, { ...filters, leavers: leavers ? 'true' : null });

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
  /** Keep any amount above what's owed as credit; without it the backend refuses with 422 (QA-029). */
  allowCredit?: boolean;
}

/** The backend's 422 when a payment is more than it would clear (`details`, QA-029). */
export interface PaymentExcess {
  owed: Pesewas;
  amount: Pesewas;
  surplus: Pesewas;
  /** `INVOICE`: owed is the picked bill's balance; `ACCOUNT`: everything unpaid. */
  against: 'INVOICE' | 'ACCOUNT';
}

/** The excess from an overpayment refusal, or null for any other error. */
export function paymentExcessOf(err: unknown): PaymentExcess | null {
  if (!(err instanceof ApiError) || err.statusCode !== 422) return null;
  const details = errorDetails<Raw>(err);
  if (details?.surplus == null) return null;
  return {
    owed: toPesewas(details.owed),
    amount: toPesewas(details.amount),
    surplus: toPesewas(details.surplus),
    against: details.against === 'ACCOUNT' ? 'ACCOUNT' : 'INVOICE',
  };
}

/** One "Correct bill" from the bill's audit log (QA-042); amounts in pesewas. */
export interface InvoiceCorrection {
  id: string;
  createdAt: string;
  actorName: string | null;
  actorRole: string | null;
  reason: string;
  lines: { name: string; before: Pesewas | null; after: Pesewas | null }[];
  before: CorrectionTotals | null;
  after: CorrectionTotals | null;
}

export interface CorrectionTotals {
  feePayable: Pesewas;
  discountAmount: Pesewas;
  balance: Pesewas;
}

const toTotals = (raw: unknown): CorrectionTotals | null =>
  raw && typeof raw === 'object'
    ? {
        feePayable: toPesewas((raw as Raw).feePayable),
        discountAmount: toPesewas((raw as Raw).discountAmount),
        balance: toPesewas((raw as Raw).balance),
      }
    : null;

/** Each fee line before and after, matched by fee type; only the ones that changed. */
function changedLines(raw: unknown): InvoiceCorrection['lines'] {
  const { before = [], after = [] } = (raw ?? {}) as { before?: Raw[]; after?: Raw[] };
  const lines = new Map<string, InvoiceCorrection['lines'][number]>();
  const keyOf = (line: Raw) => String(line.feeTypeId ?? line.name);
  for (const line of before)
    lines.set(keyOf(line), {
      name: String(line.name ?? 'Fee'),
      before: toPesewas(line.amount),
      after: null,
    });
  for (const line of after) {
    const known = lines.get(keyOf(line));
    lines.set(keyOf(line), {
      name: String(line.name ?? known?.name ?? 'Fee'),
      before: known?.before ?? null,
      after: toPesewas(line.amount),
    });
  }
  return [...lines.values()].filter((line) => line.before !== line.after);
}

const toCorrection = (raw: Raw): InvoiceCorrection => {
  const metadata = (raw.metadata ?? {}) as Raw;
  const totals = (metadata.totals ?? {}) as Raw;
  return {
    id: String(raw.id),
    createdAt: String(raw.createdAt),
    actorName: (raw.actorName as string | null) ?? null,
    actorRole: (raw.actorRole as string | null) ?? null,
    reason: typeof metadata.reason === 'string' ? metadata.reason : '',
    lines: changedLines(metadata.lineItems),
    before: toTotals(totals.before),
    after: toTotals(totals.after),
  };
};

export type { Page };
export { PAGE_SIZE } from '@/lib/pagination';

export function toInvoice(raw: Raw): Invoice {
  const arrearsBf = toPesewas(raw.arrearsBf);
  // Older backends send neither field: all of arrearsBf then counts as earlier terms'.
  const sameTermBills = Array.isArray(raw.sameTermBills)
    ? (raw.sameTermBills as Raw[]).map((bill) => ({
        ...(bill as unknown as SameTermBill),
        amount: toPesewas(bill.amount),
      }))
    : [];
  return {
    ...(raw as unknown as Invoice),
    arrearsBf,
    sameTermBills,
    arrearsFromEarlierTerms:
      raw.arrearsFromEarlierTerms == null
        ? arrearsBf - sumPesewas(sameTermBills, (bill) => bill.amount)
        : toPesewas(raw.arrearsFromEarlierTerms),
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
  };
}

export const toPayment = (raw: Raw): Payment => ({
  ...(raw as unknown as Payment),
  amountPaid: toPesewas(raw.amountPaid),
  previousBalance: toPesewas(raw.previousBalance),
  newBalance: toPesewas(raw.newBalance),
  balancesRecorded: raw.previousBalance != null && raw.newBalance != null,
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
  /** Unpaid balances moved to a later bill: still owed, but on that bill (QA-271). */
  carriedForward: Pesewas;
  /** Overpayments moved to a later bill as credit: in collected, but not this bill's fees (QA-272). */
  creditCarriedForward: Pesewas;
  /** Credit from earlier bills used to pay these ones: paid toward them, though not collected now (QA-274). */
  creditBroughtForward: Pesewas;
  /** Of `amountDue`, the share collected, as a percentage to one decimal. */
  collectionRate: number;
}

/**
 * What these bills were owed: their fees plus any debts brought in from earlier
 * bills. The collection rate is a share of this, so it can exceed `billed`.
 */
export const amountDue = (s: InvoiceSummary): Pesewas =>
  s.collected -
  s.creditCarriedForward -
  s.overpaid +
  s.creditBroughtForward +
  s.outstanding +
  s.carriedForward;

/** "20.4% of GHS 13,260.00 due", naming what was billed when debts brought in make it differ. */
export function collectionNote(s: InvoiceSummary): string {
  const due = amountDue(s);
  const billed = due === s.billed ? '' : ` (${formatGhs(s.billed)} billed)`;
  return `${s.collectionRate}% of ${formatGhs(due)} due${billed}`;
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
      `/schools/me/invoices?${invoiceParams(page, filters)}`,
    );
    return toPage(res, toInvoice);
  },
  /** Totals over every matching invoice, not just one page. */
  async invoiceSummary(filters: Omit<InvoiceQuery, 'page'>): Promise<InvoiceSummary> {
    const query = invoiceParams(1, filters);
    query.delete('page');
    query.delete('limit');
    const raw = (await apiClient.get<Raw>(`/schools/me/invoices/summary?${query}`)).data ?? {};
    return {
      invoiceCount: Number(raw.invoiceCount ?? 0),
      billed: toPesewas(raw.totalBilled),
      collected: toPesewas(raw.totalCollected),
      outstanding: toPesewas(raw.outstanding),
      overpaid: toPesewas(raw.overpaid),
      carriedForward: toPesewas(raw.carriedForward),
      creditCarriedForward: toPesewas(raw.creditCarriedForward),
      creditBroughtForward: toPesewas(raw.creditBroughtForward),
      collectionRate: Number(raw.collectionRate ?? 0),
    };
  },
  async getInvoice(id: string): Promise<Invoice> {
    const res = await apiClient.get<Raw>(`/schools/me/invoices/${encodeURIComponent(id)}`);
    return toInvoice(res.data);
  },
  /** The bill's corrections, newest first (QA-042). */
  async invoiceHistory(id: string): Promise<InvoiceCorrection[]> {
    const res = await apiClient.get<Raw[]>(
      `/schools/me/invoices/${encodeURIComponent(id)}/history?limit=50`,
    );
    return Array.isArray(res.data) ? res.data.map(toCorrection) : [];
  },
  async latestInvoiceFor(studentId: string): Promise<Invoice> {
    const res = await apiClient.get<Raw>(
      `/schools/me/invoices/students/${encodeURIComponent(studentId)}/latest`,
    );
    return toInvoice(res.data);
  },
  /** The pupil's bills with something still to pay, newest first (QA-221). */
  async openInvoicesFor(studentId: string): Promise<Invoice[]> {
    const lists = await Promise.all(
      (['UNPAID', 'PARTIAL'] as const).map((status) =>
        fetchAll(`/schools/me/invoices?${new URLSearchParams({ studentId, status })}`),
      ),
    );
    return lists
      .flat()
      .map(toInvoice)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
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
  /** Up to a page of pupils matching a name or code; the first page when empty (QA-030). */
  async searchStudents(search: string): Promise<StudentOption[]> {
    return (
      (await apiClient.get<StudentOption[]>(`/schools/me/students?${pageParams(1, { search })}`))
        .data ?? []
    );
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
