import { apiClient } from '@/lib/api-client';
import { toCedis, toPesewas, type Pesewas } from './money';

// Amount fields below are whole pesewas; the API sends and receives cedis.

export interface InvoiceLineItem {
  id: string;
  feeTypeId: string;
  feeTypeName: string;
  amount: Pesewas;
  isOptional: boolean;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID';

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
  feeTypeName: string;
  className?: string | null;
  termLabel?: string;
  amount: Pesewas;
  isOptional: boolean;
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

export interface RecordPaymentRequest {
  studentId: string;
  invoiceId?: string;
  amount: Pesewas;
  paymentMethod: string;
  bankType?: string;
  transactionReference?: string;
}

type Raw = Record<string, unknown>;
interface Page<T> {
  items: T[];
  total: number;
}

const toInvoice = (raw: Raw): Invoice => ({
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

const toPayment = (raw: Raw): Payment => ({
  ...(raw as unknown as Payment),
  amountPaid: toPesewas(raw.amountPaid),
  previousBalance: toPesewas(raw.previousBalance),
  newBalance: toPesewas(raw.newBalance),
});

const toFeeStructure = (raw: Raw): FeeStructure => ({
  ...(raw as unknown as FeeStructure),
  amount: toPesewas(raw.amount),
});

export const INVOICES_PAGE_SIZE = 20;

export const feesApi = {
  async listInvoices(query: InvoiceQuery): Promise<Page<Invoice>> {
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(INVOICES_PAGE_SIZE),
    });
    if (query.search) params.set('search', query.search);
    if (query.classId) params.set('classId', query.classId);
    if (query.status) params.set('status', query.status);
    const res = await apiClient.get<Page<Raw>>(`/schools/me/invoices?${params}`);
    return { items: (res.data?.items ?? []).map(toInvoice), total: res.data?.total ?? 0 };
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
    const res = await apiClient.post<{ totalInvoicesGenerated: number; totalFeePayable: number }>(
      '/schools/me/invoices/generate',
      request,
    );
    return {
      count: res.data.totalInvoicesGenerated,
      totalFeePayable: toPesewas(res.data.totalFeePayable),
    };
  },
  async listPayments(): Promise<Payment[]> {
    const res = await apiClient.get<Page<Raw>>('/schools/me/payments?limit=50');
    return (res.data?.items ?? []).map(toPayment);
  },
  async recordPayment({ amount, ...request }: RecordPaymentRequest): Promise<Payment | null> {
    const res = await apiClient.post<Raw[] | Raw>('/schools/me/payments', {
      ...request,
      amount: toCedis(amount),
    });
    const created = Array.isArray(res.data) ? res.data[0] : res.data;
    return created ? toPayment(created) : null;
  },
  async listFeeStructures(): Promise<FeeStructure[]> {
    const res = await apiClient.get<Page<Raw>>('/schools/me/fee-structures');
    return (res.data?.items ?? []).map(toFeeStructure);
  },
  async listClasses() {
    return (await apiClient.get<SchoolClass[]>('/schools/me/classes')).data ?? [];
  },
  async listStudentOptions() {
    return (await apiClient.get<StudentOption[]>('/schools/me/students?limit=100')).data ?? [];
  },
  /** The current year and term, or null when either is not set up. */
  async currentTerm(): Promise<AcademicContext | null> {
    const [year, term] = await Promise.all([
      apiClient.get<{ id: string; yearLabel: string }>('/schools/me/academic-years/current'),
      apiClient.get<{ id: string; termLabel: string }>('/schools/me/academic-terms/current'),
    ]);
    if (!year.data || !term.data) return null;
    return {
      yearId: year.data.id,
      yearLabel: year.data.yearLabel,
      termId: term.data.id,
      termLabel: term.data.termLabel,
    };
  },
};
