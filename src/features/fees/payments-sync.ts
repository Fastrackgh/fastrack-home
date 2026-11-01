import { apiClient, isUnreachable, type PageMeta } from '@/lib/api-client';
import { pageParams, toPage, type Raw } from '@/lib/pagination';
import type { EnqueueInput, OutboxOp, ReviewItem } from '@/lib/offline/outbox';
import {
  currentDeviceId,
  enqueueWrite,
  pendingWrites,
  registerAppliedNotices,
  registerRenumber,
  registerReviewResolver,
  registerReviewText,
  syncCursor,
  syncedRecords,
} from '@/lib/offline/syncEngine';
import {
  feesApi,
  toInvoice,
  toPayment,
  toWarning,
  type Invoice,
  type Payment,
  type PaymentQuery,
  type PaymentWarning,
  type RecordPaymentRequest,
  type StudentOption,
} from './api';
import { formatGhs, toCedis, toPesewas, type Pesewas } from './money';

/**
 * Cash payments through the outbox (docs/offline/staff-offline.md, contract
 * v0.5 §9.1, step 5a). Every payment is queued, online too, so a payment is
 * never lost or recorded twice:
 *   - it carries a client `id` (its `groupId`) and a provisional number
 *     `OFF-<device>-<n>`, printed on the receipt until the server gives the
 *     `RCT/…` number at sync;
 *   - `seenBalance` with `seenCursor` (offline) or `seenAsOf` (online) tells
 *     the server what the device showed as owed, so a bill that changed
 *     meanwhile is applied with a warning rather than refused;
 *   - a refusal saved nothing: its tray card says the cash is still in the
 *     drawer, and offers the fix where there is one.
 */
export const PAYMENTS_COLLECTION = 'payments';
const PAYMENTS_PATH = '/schools/me/payments';

/** Device-wide, so it survives sign-out: two users of one device never reuse a number (§9.1). */
const COUNTER_KEY = 'fastrack_offline_receipt_n';

function nextNumber(): number {
  try {
    const n = Number(localStorage.getItem(COUNTER_KEY) ?? 0) + 1;
    localStorage.setItem(COUNTER_KEY, String(n));
    return n;
  } catch {
    // No storage: a random number; a clash is renumbered by the server (409).
    return 1 + Math.floor(Math.random() * 999_999_999);
  }
}

const refWith = (prefix: string) => `OFF-${prefix}-${nextNumber()}`;

/** A new provisional number: `OFF-` + the first 4 hex digits of the device id + `-n`. */
async function newProvisionalRef(): Promise<string> {
  const device = (await currentDeviceId()) ?? crypto.randomUUID();
  return refWith(device.replace(/-/g, '').slice(0, 4).toLowerCase());
}

/** What the clerk saw when taking the money (§9.1). */
export interface SeenBalance {
  /** The picked bill's balance, less the payments still queued on this device. */
  balance: Pesewas;
  /** Server time of the response the balance came from; online only. */
  asOf?: string;
  /** Offline: the feed position the balance came from. */
  fromRecords?: boolean;
}

/** Printed on the provisional receipt; kept on the device only. */
export interface ProvisionalDetails {
  studentName?: string;
  studentCode?: string | null;
  className?: string;
  invoiceNumber?: string | null;
  /** The pupil's account balance before, as the device knew it. */
  previousBalance: Pesewas;
  recordedByName?: string;
}

interface QueuedBody {
  id: string;
  studentId: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: string;
  bankType?: string;
  transactionReference?: string;
  allowCredit?: boolean;
  sharedReference?: boolean;
  provisionalRef: string;
  printedRef?: string;
  seenBalance?: number;
  seenCursor?: string;
  seenAsOf?: string;
}

interface QueuedLocal extends ProvisionalDetails {
  paymentDate: string;
}

const parseBody = (op: OutboxOp): QueuedBody | null => {
  try {
    return op.body ? (JSON.parse(op.body) as QueuedBody) : null;
  } catch {
    return null;
  }
};

const labelFor = (amount: Pesewas, name: string | undefined, ref: string) =>
  `Payment of ${formatGhs(amount)}${name ? ` for ${name}` : ''} (${ref})`;

/** Queues a payment; it lands now if the server answers, else when the device is back online. */
export async function queuePayment(
  { amount, ...request }: RecordPaymentRequest,
  seen: SeenBalance,
  receipt: ProvisionalDetails,
): Promise<OutboxOp> {
  const provisionalRef = await newProvisionalRef();
  const cursor = seen.fromRecords ? await syncCursor() : undefined;
  // The pupil's earlier queued payments land first: this one's seenBalance counts them as paid.
  const earlier = (await pendingWrites(PAYMENTS_COLLECTION))
    .filter((op) => parseBody(op)?.studentId === request.studentId)
    .map((op) => op.opId);
  const body: QueuedBody = {
    ...request,
    id: crypto.randomUUID(),
    amount: toCedis(amount),
    provisionalRef,
    seenBalance: toCedis(seen.balance),
    ...(cursor ? { seenCursor: cursor } : {}),
    ...(seen.asOf ? { seenAsOf: seen.asOf } : {}),
  };
  const local: QueuedLocal = { ...receipt, paymentDate: new Date().toLocaleDateString('en-CA') };
  return enqueueWrite({
    collection: PAYMENTS_COLLECTION,
    entityId: body.id,
    method: 'POST',
    path: PAYMENTS_PATH,
    body,
    dependsOn: earlier,
    label: labelFor(amount, receipt.studentName, provisionalRef),
    names: receipt.studentName ? { [request.studentId]: receipt.studentName } : undefined,
    local: local as unknown as Record<string, unknown>,
  });
}

/** A queued payment as a receipt: its number is the provisional one. */
export function provisionalPayment(op: OutboxOp): Payment | null {
  const body = parseBody(op);
  if (!body) return null;
  const local = (op.local ?? {}) as unknown as QueuedLocal;
  const amountPaid = toPesewas(body.amount);
  const previousBalance = local.previousBalance ?? 0;
  return {
    id: body.id,
    groupId: body.id,
    receiptNumber: body.provisionalRef,
    provisionalRef: body.provisionalRef,
    printedRef: body.printedRef ?? null,
    paymentDate: local.paymentDate ?? '',
    amountPaid,
    paymentMethod: body.paymentMethod,
    bankType: body.bankType ?? null,
    transactionReference: body.transactionReference ?? null,
    studentName: local.studentName,
    studentCode: local.studentCode,
    className: local.className,
    invoiceId: body.invoiceId ?? null,
    schoolStudentId: body.studentId,
    invoiceNumber: local.invoiceNumber,
    previousBalance,
    newBalance: previousBalance - amountPaid,
    recordedByName: local.recordedByName,
    warnings: [],
    pending: true,
  };
}

/** The payments still queued on this device, newest first, as receipts. */
export async function pendingPayments(): Promise<Payment[]> {
  const ops = await pendingWrites(PAYMENTS_COLLECTION);
  return ops
    .map(provisionalPayment)
    .filter((p): p is Payment => p !== null)
    .reverse();
}

/** Queued, unsent payments for a pupil (enrolment id), by bill id; '' for no bill. */
export async function queuedAmounts(studentId: string): Promise<Map<string, Pesewas>> {
  const amounts = new Map<string, Pesewas>();
  for (const op of await pendingWrites(PAYMENTS_COLLECTION)) {
    const body = parseBody(op);
    if (body?.studentId !== studentId) continue;
    const key = body.invoiceId ?? '';
    amounts.set(key, (amounts.get(key) ?? 0) + toPesewas(body.amount));
  }
  return amounts;
}

/** The same payment already waiting to sync: the same pupil, bill, amount, method and reference. */
export async function samePaymentQueued(request: RecordPaymentRequest): Promise<Payment | null> {
  const ref = (s?: string) => (s ?? '').trim().toLowerCase();
  for (const op of await pendingWrites(PAYMENTS_COLLECTION)) {
    const body = parseBody(op);
    if (
      body &&
      body.studentId === request.studentId &&
      (body.invoiceId ?? null) === (request.invoiceId ?? null) &&
      toPesewas(body.amount) === request.amount &&
      body.paymentMethod === request.paymentMethod &&
      ref(body.transactionReference) === ref(request.transactionReference)
    ) {
      return provisionalPayment(op);
    }
  }
  return null;
}

/** The rows a landed payment returned (one per bill it paid). */
function landedRows(body: unknown): Raw[] {
  const data = (body as { data?: unknown } | undefined)?.data ?? body;
  return (Array.isArray(data) ? data : data ? [data] : []) as Raw[];
}

/** A landed payment as one receipt: every bill it paid, added up. */
export function landedPayment(body: unknown): Payment | null {
  const rows = landedRows(body).map(toPayment);
  if (!rows.length) return null;
  const [first] = rows;
  const last = rows[rows.length - 1];
  return {
    ...first,
    amountPaid: rows.reduce((sum, row) => sum + row.amountPaid, 0),
    newBalance: last.newBalance,
    invoiceNumber:
      rows
        .map((row) => row.invoiceNumber)
        .filter(Boolean)
        .join(', ') || null,
    warnings: rows.flatMap((row) => row.warnings ?? []),
  };
}

/** A payment by its `OFF-…` number, once it has landed (any tab may have sent it). */
export async function landedByRef(ref: string): Promise<Payment | null> {
  const page = await feesApi.listPayments({ page: 1, search: ref });
  return page.items.find((p) => p.provisionalRef === ref || p.printedRef === ref) ?? null;
}

// --- Offline reads: the device's synced records (contract §8) -------------

/** A pupil's bills from the synced `invoices`, newest first. */
export async function offlineInvoicesFor(studentId: string): Promise<Invoice[]> {
  const rows = await syncedRecords<Raw>('invoices');
  return rows
    .filter((row) => row.data?.schoolStudentId === studentId)
    .map((row) => toInvoice(row.data as Raw))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** A pupil's account balance from the synced `fee-accounts`; negative is credit. */
export async function offlineAccountBalance(studentId: string): Promise<Pesewas | null> {
  const rows = await syncedRecords<Raw>('fee-accounts');
  const row = rows.find((r) => r.id === studentId);
  return row?.data ? toPesewas(row.data.currentBalance) : null;
}

/** Pupils from the synced roster whose name or code matches. */
export async function offlineStudents(search: string): Promise<StudentOption[]> {
  const needle = search.trim().toLowerCase();
  const rows = await syncedRecords<StudentOption>('students');
  return rows
    .map((row) => row.data as StudentOption)
    .filter(
      (s) =>
        s &&
        (!needle ||
          (s.fullName ?? '').toLowerCase().includes(needle) ||
          (s.studentCode ?? '').toLowerCase().includes(needle)),
    )
    .slice(0, 20);
}

/** The synced payments, newest first, filtered like the list. */
export async function offlinePayments({
  studentId,
  paymentMethod,
  warning,
}: Omit<PaymentQuery, 'page'>): Promise<Payment[]> {
  const codes = warning ? new Set(warning.split(',')) : null;
  const rows = await syncedRecords<Raw>('payments');
  return rows
    .map((row) => ({ raw: row.data as Raw, payment: toPayment(row.data as Raw) }))
    .filter(
      ({ raw, payment }) =>
        (!studentId || raw.schoolStudentId === studentId) &&
        (!paymentMethod || payment.paymentMethod === paymentMethod) &&
        (!codes || (payment.warnings ?? []).some((w) => codes.has(w.code))),
    )
    .map(({ payment }) => payment)
    .sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)));
}

/**
 * A read straight from the server, never a saved copy: a balance or payment
 * list from before the device's last payment would be wrong, and the synced
 * records are fresher than any saved read.
 */
async function liveGet<T>(path: string): Promise<T> {
  return (await apiClient.request<T>(path, { method: 'GET' })).data as T;
}

/** A pupil's latest bill and the bills with something to pay, from the server. */
export async function liveBills(studentId: string): Promise<{ latest: Invoice; open: Invoice[] }> {
  const id = encodeURIComponent(studentId);
  const [latest, ...lists] = await Promise.all([
    liveGet<Raw>(`/schools/me/invoices/students/${id}/latest`),
    ...(['UNPAID', 'PARTIAL'] as const).map((status) =>
      // Without the list the latest bill can still be paid, as before QA-221.
      liveGet<Raw[]>(
        `/schools/me/invoices?${new URLSearchParams({ studentId, status, limit: '100' })}`,
      ).catch((err) => {
        if (isUnreachable(err)) throw err;
        return [] as Raw[];
      }),
    ),
  ]);
  const open = lists
    .flat()
    .map(toInvoice)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return { latest: toInvoice(latest), open };
}

/** A page of payments from the server, never a saved copy. */
export async function livePayments({ page, ...filters }: PaymentQuery) {
  const res = await apiClient.request<Raw[], PageMeta>(
    `/schools/me/payments?${pageParams(page, filters)}`,
    { method: 'GET' },
  );
  return toPage(res, toPayment);
}

/** Tries the server, then the device's records when the server is out of reach. */
export async function onlineOr<T>(online: () => Promise<T>, offline: () => Promise<T>) {
  try {
    return { value: await online(), offline: false };
  } catch (err) {
    if (!isUnreachable(err)) throw err;
    return { value: await offline(), offline: true };
  }
}

/** Server time now, for `seenAsOf` on a balance just read online. */
export const serverNowIso = () => apiClient.serverNow().toISOString();

// --- Review tray: refusals, renumbering and loud warnings -----------------

const cedis = (value: unknown) => formatGhs(toPesewas(value));

function cashLine(op: OutboxOp) {
  const body = parseBody(op);
  return `Nothing was recorded: the ${body ? cedis(body.amount) : 'money'} is still in the cash drawer.`;
}

const details = (item: ReviewItem) => (item.error?.details ?? {}) as Raw;

function explain(item: ReviewItem): string | null {
  if (item.kind === 'notice') return noticeText(item);
  if (item.kind !== 'rejected' && item.kind !== 'conflict') return null;
  const cash = cashLine(item.op);
  const d = details(item);
  switch (item.error?.code) {
    case 'PAYMENT_EXCEEDS_BALANCE':
      return `${cash} It is ${cedis(d.surplus)} more than ${d.against === 'ACCOUNT' ? 'was owed in total' : 'the bill owed'} (${cedis(d.owed)}). Keep the extra as credit, or discard this and record the right amount.`;
    case 'SHARED_TRANSFER_REFERENCE':
      return `${cash} The reference ${String(d.reference ?? '')} already pays for another pupil. If it's one transfer for siblings, send it as shared; otherwise discard it and check the reference.`;
    case 'NO_BILL':
      return `${cash} This pupil has no bill to pay against yet. Once they have been billed, send it again.`;
    case 'DUPLICATE_REFERENCE':
      return `${cash} This pupil already has a payment with that reference, so it was probably recorded before. Check Payments before taking it again.`;
    case 'RECEIPT_NUMBER_TAKEN':
      return `${cash} The receipt number typed is already used in the school.`;
    case 'PAYMENT_DATE_TOO_EARLY':
      return `${cash} The payment date is before the school's first academic year.`;
    default:
      return `${cash} ${item.error?.message ?? ''}`.trim();
  }
}

function resendLabel(item: ReviewItem): string | null {
  switch (item.error?.code) {
    case 'PAYMENT_EXCEEDS_BALANCE':
      return 'Keep as credit';
    case 'SHARED_TRANSFER_REFERENCE':
      return 'Same transfer for siblings';
    default:
      return null;
  }
}

/** The fix a refusal allows, as the flags to resend with; null when there is none. */
function fixFor(item: ReviewItem): Partial<QueuedBody> | null {
  if (item.kind !== 'rejected') return null;
  switch (item.error?.code) {
    case 'PAYMENT_EXCEEDS_BALANCE':
      return { allowCredit: true };
    case 'SHARED_TRANSFER_REFERENCE':
      return { sharedReference: true };
    case 'NO_BILL':
      return {};
    default:
      return null;
  }
}

/**
 * The resend of a refused payment: a new op (a new key), but the same `id`
 * and provisional number, since nothing was saved (contract §9.1).
 */
function resend(item: ReviewItem): EnqueueInput | null {
  const fix = fixFor(item);
  const body = parseBody(item.op);
  if (!fix || !body) return null;
  return {
    collection: PAYMENTS_COLLECTION,
    entityId: item.op.entityId,
    method: 'POST',
    path: item.op.path,
    body: { ...body, ...fix },
    label: item.op.label,
    names: item.op.names,
    local: item.op.local,
  };
}

/** 409 PROVISIONAL_REF_TAKEN: the next number, keeping the one first printed (§9.1). */
function renumber(op: OutboxOp) {
  const body = parseBody(op);
  if (!body) return null;
  const prefix = body.provisionalRef.split('-')[1] ?? '0000';
  const next: QueuedBody = {
    ...body,
    provisionalRef: refWith(prefix),
    printedRef: body.printedRef ?? body.provisionalRef,
  };
  return { body: next };
}

const otherPaymentsText = (d: Raw) => {
  const others = Array.isArray(d.otherPayments) ? (d.otherPayments as Raw[]) : [];
  return others
    .map(
      (p) =>
        `${String(p.receiptNumber ?? '')} for ${cedis(p.amount)}${p.recordedByName ? ` by ${String(p.recordedByName)}` : ''}`,
    )
    .join(', ');
};

function noticeText(item: ReviewItem): string {
  const d = details(item);
  if (item.error?.code === 'POSSIBLE_DOUBLE_PAYMENT') {
    const others = otherPaymentsText(d);
    return `Saved, but this pupil may have paid twice: ${others ? `${others} was recorded while this device was offline` : 'another payment was recorded while this device was offline'}. ${cedis(d.surplus)} is kept as credit on their account, and the school may owe a refund. Check with the head or account officer.`;
  }
  return item.error?.message ?? '';
}

/** What a warning means, in staff words, for the receipt and the list. */
export function warningText(warning: PaymentWarning): string {
  const d = warning.details ?? {};
  switch (warning.code) {
    case 'POSSIBLE_DOUBLE_PAYMENT':
      return `May have been paid twice: ${otherPaymentsText(d) || 'another payment'} came in first. ${cedis(d.surplus)} kept as credit; the school may owe a refund.`;
    case 'BILL_CHANGED':
      return `The bill changed before this was synced: ${cedis(d.seenBalance)} was shown as owed, ${cedis(d.balanceBefore)} was owed at sync.`;
    case 'CREDIT_KEPT':
      return `${cedis(d.surplus)} more than was owed at sync, kept as credit on the account.`;
    case 'REALLOCATED':
      return `The bill picked was ${d.reason === 'DELETED' ? 'deleted' : 'carried forward'}, so this paid the account's unpaid bills instead.`;
    default:
      return warning.message ?? warning.code;
  }
}

/** Registers the payment cards, resends and renumbering with the sync engine (once, app-wide). */
export function registerPaymentsSync() {
  registerReviewText(PAYMENTS_COLLECTION, { explain, resendLabel });
  registerReviewResolver(PAYMENTS_COLLECTION, resend);
  registerRenumber(PAYMENTS_COLLECTION, renumber);
  // Loud: a possible double payment goes to the tray even though it applied.
  registerAppliedNotices(PAYMENTS_COLLECTION, (_op, body) =>
    landedRows(body)
      .flatMap((row) => (Array.isArray(row.warnings) ? (row.warnings as Raw[]).map(toWarning) : []))
      .filter((w) => w.code === 'POSSIBLE_DOUBLE_PAYMENT')
      .slice(0, 1)
      .map((w) => ({
        code: w.code,
        message: w.message ?? 'Possibly paid twice',
        details: w.details,
      })),
  );
}
