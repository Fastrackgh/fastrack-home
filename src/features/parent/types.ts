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
  house?: string | null;
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
  classScore: number | null;
  examScore: number | null;
  total: number | null;
  grade: string | null;
  position?: number | null;
  remark?: string | null;
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
}

export type AttendanceMark = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceDay {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  status: AttendanceMark;
  note?: string | null;
}

export interface AttendanceRecord {
  days: AttendanceDay[];
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    /** Days the school was open in the range. */
    schoolDays: number;
  };
}
