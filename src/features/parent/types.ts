import type { SchoolDays, SchoolEvent } from '@/features/calendar/api';
import type { Invoice, Payment } from '@/features/fees/api';
import type { Pesewas } from '@/features/fees/money';

// Amount fields are whole pesewas; the API sends and receives cedis.

/** Values of the backend's `StudentStatus` enum. */
export type WardStatus =
  'Pending_Admission' | 'Active' | 'Inactive' | 'Stopped' | 'Transferred_Out' | 'Graduated';

/** A child linked to the signed-in parent (`ParentWardResponseDto`). */
export interface Ward {
  /** Global student id; every ward-scoped endpoint is keyed by it. */
  studentId: string;
  studentCode: string | null;
  firstName: string;
  surname: string;
  otherName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  status: WardStatus | string;
  relationship?: string | null;
  school: { id: string; code: string; name: string };
  currentClass?: { id: string; name: string; department?: string | null } | null;
}

export interface Guardian {
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface WardProfile extends Ward {
  photoUrl?: string | null;
  admissionDate?: string | null;
  /** "Day" or "Boarding", as the school records it. */
  boardingStatus?: string | null;
  guardians: Guardian[];
  school: Ward['school'] & {
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
}

/** Returned by the first step of linking a child; the OTP goes to the guardian contact. */
export interface LinkChallenge {
  requestId: string;
  maskedDestination: string;
  expiresInSeconds: number;
}

export interface ResentChallenge {
  maskedDestination: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

export interface AcademicTerm {
  id: string;
  label: string;
  yearId: string;
  yearLabel: string;
  isCurrent: boolean;
}

export interface ParentInvoice extends Invoice {
  termId?: string | null;
  termLabel?: string | null;
  yearLabel?: string | null;
  /** ISO date (yyyy-mm-dd). */
  dueDate?: string | null;
  /** Whether the ward's school accepts online payment for this bill. */
  canPayOnline?: boolean;
  /** For a `CARRIED_FORWARD` bill: how much moved, and onto which bill. */
  carriedForwardAmount?: Pesewas;
  carriedForwardToInvoiceNumber?: string | null;
}

/**
 * Totals across a ward's bills, optionally for one term. Arrears carried onto a
 * later bill are counted once, so these don't equal a sum of `feePayable`
 * (QA-222).
 */
export interface ParentInvoiceSummary {
  invoiceCount: number;
  /** New charges after discounts; balances brought forward aren't counted again. */
  totalBilled: Pesewas;
  totalPaid: Pesewas;
  outstanding: Pesewas;
  overpaid: Pesewas;
  /** Unpaid balances of earlier bills, outside the selection, included in these bills. */
  broughtForward: Pesewas;
  /** Balances of these bills moved onto later bills outside the selection. */
  carriedForward: Pesewas;
}

export type PaymentChannel = 'mobile_money' | 'card';

export const PAYMENT_CHANNELS: { value: PaymentChannel; label: string }[] = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
];

export interface ParentPayment extends Payment {
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  termLabel?: string | null;
  /** Online payments only: the provider reference. */
  reference?: string | null;
}

export interface CheckoutRequest {
  amount: Pesewas;
  channel: PaymentChannel;
  /** Repeating a request with the same key returns the same checkout instead of a new charge. */
  idempotencyKey: string;
  /** Where the payment provider returns the parent after paying. */
  callbackUrl: string;
}

export interface CheckoutSession {
  reference: string;
  /** Hosted checkout page to send the parent to. */
  authorizationUrl: string;
}

export type PaymentOutcome = 'success' | 'pending' | 'failed';

export interface PaymentVerification {
  status: PaymentOutcome;
  studentId?: string | null;
  invoiceId?: string | null;
  payment?: ParentPayment | null;
  message?: string | null;
}

export interface SubjectResult {
  subject: string;
  /** The continuous and exam groups' sums, for schools with two columns. */
  classScore: number | null;
  examScore: number | null;
  total: number | null;
  grade: string | null;
  position?: number | null;
  positionTied?: boolean;
  remark?: string | null;
  // Added with results phase 4 (docs/api/results.md); all optional.
  status?: 'ok' | 'incomplete' | 'exempt' | 'missing' | 'not_assessed';
  mode?: 'numeric' | 'descriptor';
  /** One per scheme part, in the order of the report's `components`. */
  componentScores?: { key: string; score: number | null; display: string }[];
  points?: number | null;
  /** Descriptor subjects: the overall descriptor and each strand's. */
  descriptor?: string | null;
  strands?: { label: string; descriptor: string }[];
}

/** A part of the school's weighting, e.g. "Class score" worth 40. */
export interface ReportComponent {
  key: string;
  label: string;
  shortLabel?: string;
  weight: number;
  group?: 'continuous' | 'exam';
}

/** A published terminal report; the list endpoint omits `subjects`. */
export interface TermReport {
  id: string;
  termId: string;
  termLabel: string;
  yearLabel: string;
  className?: string | null;
  publishedAt: string;
  average?: number | null;
  overallGrade?: string | null;
  position?: number | null;
  classSize?: number | null;
  subjects?: SubjectResult[];
  attendance?: { present: number; total: number } | null;
  teacherRemark?: string | null;
  headRemark?: string | null;
  promotedTo?: string | null;
  nextTermBegins?: string | null;
  // Added with results phase 4; all optional.
  positionTied?: boolean;
  components?: ReportComponent[] | null;
  /** The backend sends the status capitalised ("Promoted"); compare ignoring case. */
  promotion?: { status: string; toClass?: string | null } | null;
  /** BECE-style total of points; lower is better. */
  aggregate?: number | null;
  /** Above 1 when the school corrected and republished the report. */
  revision?: number;
  updatedAt?: string | null;
}

export type AttendanceMark = 'present' | 'absent' | 'late' | 'half_day' | 'excused';

export interface AttendanceDay {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  status: AttendanceMark;
  /** HH:MM, when the register recorded one. */
  arrivalTime?: string | null;
  note?: string | null;
}

export interface AttendanceRecord {
  /** Marked days only; an unmarked school day isn't listed. */
  days: AttendanceDay[];
  summary: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    excused: number;
    /** Days the school was open in the range, up to today. */
    schoolDays: number;
    /** Open days the register hasn't been marked for yet. */
    unmarked: number;
  };
}

/** Start (`OPT_IN`) or stop (`OPT_OUT`) an optional service such as the school bus. */
export type OptionalFeeRequestAction = 'OPT_IN' | 'OPT_OUT';
export type OptionalFeeRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';

/** A parent's ask to change an optional service; the school approves or declines it. */
export interface OptionalFeeRequest {
  id: string;
  feeTypeId: string;
  feeTypeName: string;
  action: OptionalFeeRequestAction;
  status: OptionalFeeRequestStatus;
  parentNote: string | null;
  /** The school's reply, mainly when it declines. */
  staffNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  /** Made by the signed-in parent (only they can cancel it). */
  isMine: boolean;
}

/** An optional fee the ward's school offers (bus, feeding, extra classes...). */
export interface OptionalService {
  feeTypeId: string;
  name: string;
  description: string | null;
  /** This term's price for the ward's class; null when the school hasn't priced it. */
  amount: Pesewas | null;
  /** The ward takes it now. */
  enrolled: boolean;
  pendingRequest: OptionalFeeRequest | null;
}

export interface WardOptionalServices {
  termLabel: string | null;
  className: string | null;
  /** False while the school isn't taking requests (e.g. suspended). */
  canRequest: boolean;
  services: OptionalService[];
}

/** `GET /parents/me/wards/:studentId/calendar`: the ward's events for one term (never staff-only ones). */
export interface WardCalendar {
  events: SchoolEvent[];
  schoolDays: SchoolDays;
}
