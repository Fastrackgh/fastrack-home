import type { OutboxOp, ReviewItem } from '@/lib/offline/outbox';
import {
  enqueueWrite,
  pendingWrites,
  registerReviewResolver,
  registerReviewText,
  remapQueued,
} from '@/lib/offline/syncEngine';
import type { Raw } from '@/lib/pagination';
import type { StudentRow } from './api';

/**
 * Admissions through the outbox (docs/offline/staff-offline.md, contract
 * v0.5.5 §9.2, step 5b). Every admission is queued, online too, with a
 * client `id` that becomes the pupil's `schoolStudentId`, so attendance
 * taken before it syncs can name the pupil and wait for the admission
 * (`dependsOn`). The student code is given by the server at sync.
 *
 * A likely duplicate (409 `LIKELY_DUPLICATE`) lists the candidates: "Admit
 * anyway" resends with `confirmNotDuplicate`, "It's <pupil>" moves anything
 * queued for the new pupil to that one and drops the admission.
 */
export const ADMISSIONS_COLLECTION = 'students';
const ADMISSIONS_PATH = '/schools/me/students';

/** Shown for the pupil until the admission lands; kept on the device only. */
interface AdmissionLocal {
  fullName: string;
  classId: string;
  className: string;
  gender?: string;
}

/** A pupil the server thinks may be the same child (§9.2). */
export interface DuplicateCandidate {
  id: string;
  studentCode: string | null;
  name: string;
  className: string | null;
  dateOfBirth: string | null;
  /** Null without `students:read_sensitive`. */
  guardianPhone: string | null;
  status: string | null;
}

const parseBody = (op: OutboxOp): Raw | null => {
  try {
    return op.body ? (JSON.parse(op.body) as Raw) : null;
  } catch {
    return null;
  }
};

/** Queues an admission; the new pupil's id is its `id`. */
export function queueAdmission(payload: Raw, shown: AdmissionLocal): Promise<OutboxOp> {
  const id = crypto.randomUUID();
  return enqueueWrite({
    collection: ADMISSIONS_COLLECTION,
    entityId: id,
    method: 'POST',
    path: ADMISSIONS_PATH,
    body: { ...payload, id },
    label: `Admission of ${shown.fullName} to ${shown.className}`,
    names: { [id]: shown.fullName },
    local: shown as unknown as Raw,
  });
}

/** The new pupil an admission op admits. */
export const admittedId = (op: OutboxOp) => String(parseBody(op)?.id ?? op.entityId);

/** Pupils admitted on this device and not yet synced: no student code yet. */
export interface PendingAdmission {
  id: string;
  opId: string;
  fullName: string;
  firstName: string;
  surname: string;
  otherName: string | null;
  classId: string;
  className: string;
  gender?: string;
}

export async function pendingAdmissions(): Promise<PendingAdmission[]> {
  const ops = await pendingWrites(ADMISSIONS_COLLECTION);
  return ops
    .filter((op) => op.method === 'POST')
    .map((op) => {
      const body = parseBody(op) ?? {};
      const local = (op.local ?? {}) as unknown as AdmissionLocal;
      return {
        id: admittedId(op),
        opId: op.opId,
        fullName: local.fullName,
        firstName: String(body.firstName ?? ''),
        surname: String(body.surname ?? ''),
        otherName: (body.otherName as string | undefined) ?? null,
        classId: String(body.admissionClassId ?? local.classId),
        className: local.className,
        gender: (body.gender as string | undefined) ?? local.gender,
      };
    });
}

/** A pending admission as a row of the students table, marked as waiting. */
export const pendingRow = (p: PendingAdmission): StudentRow & { pending: true } => ({
  id: p.id,
  studentId: p.id,
  studentCode: '',
  firstName: p.firstName,
  surname: p.surname,
  otherName: p.otherName,
  fullName: p.fullName,
  gender: p.gender ?? '',
  status: 'Active',
  classId: p.classId,
  className: p.className,
  createdAt: '',
  pending: true,
});

/**
 * The admission ops to wait for before sending a write that names these
 * pupils: those admitted on this device and not yet synced.
 */
export async function admissionOpsFor(pupilIds: Iterable<string>): Promise<string[]> {
  const wanted = new Set(pupilIds);
  return (await pendingAdmissions()).filter((p) => wanted.has(p.id)).map((p) => p.opId);
}

// --- Review tray ------------------------------------------------------------

export const candidatesOf = (item: ReviewItem): DuplicateCandidate[] => {
  const list = item.error?.reason?.candidates;
  return Array.isArray(list) ? (list as DuplicateCandidate[]) : [];
};

const describeCandidate = (c: DuplicateCandidate) =>
  [
    c.name,
    c.studentCode ?? 'no code',
    c.className,
    c.dateOfBirth ? `born ${c.dateOfBirth}` : null,
    c.guardianPhone ? `guardian ${c.guardianPhone}` : null,
    c.status && c.status !== 'Active' ? c.status.toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(' · ');

function explain(item: ReviewItem): string | null {
  switch (item.error?.code) {
    case 'LIKELY_DUPLICATE': {
      const list = candidatesOf(item).map(describeCandidate).join('; ');
      return `Not admitted yet: this looks like a pupil already in the school (${list || 'see Students'}). If it's the same child, pick them, and anything recorded for this admission moves to them. If it's a different child, admit anyway.`;
    }
    case 'ID_MISMATCH_RETURNING':
      return 'Not admitted: this pupil was at the school before under another record. Admit them online from their old record.';
    case 'DUPLICATE_ID':
      return 'Not admitted: this admission was already recorded. Check Students before admitting again.';
    default:
      return null;
  }
}

function resend(item: ReviewItem) {
  const body = parseBody(item.op);
  if (!body || item.error?.code !== 'LIKELY_DUPLICATE') return null;
  return {
    collection: ADMISSIONS_COLLECTION,
    entityId: item.op.entityId,
    method: 'POST' as const,
    path: item.op.path,
    body: { ...body, confirmNotDuplicate: true },
    label: item.op.label,
    names: item.op.names,
    local: item.op.local,
  };
}

/** "It's <pupil>": what was queued for the new pupil moves to that one; the admission is dropped. */
export const sameAs = (item: ReviewItem, candidate: DuplicateCandidate) =>
  remapQueued(item.id, admittedId(item.op), candidate.id, item.op.opId);

/** Registers the admission cards with the sync engine (once, app-wide). */
export function registerAdmissionsSync() {
  registerReviewText(ADMISSIONS_COLLECTION, {
    explain,
    resendLabel: (item) => (item.error?.code === 'LIKELY_DUPLICATE' ? 'Admit anyway' : null),
    actions: (item) =>
      item.error?.code === 'LIKELY_DUPLICATE'
        ? candidatesOf(item).map((candidate) => ({
            label: `It's ${candidate.name}${candidate.studentCode ? ` (${candidate.studentCode})` : ''}`,
            run: () => sameAs(item, candidate),
          }))
        : [],
  });
  registerReviewResolver(ADMISSIONS_COLLECTION, resend);
}
