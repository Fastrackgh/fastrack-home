import { apiClient, isUnreachable } from '@/lib/api-client';
import type { OutboxOp, ReviewItem } from '@/lib/offline/outbox';
import {
  enqueueWrite,
  pendingWrites,
  registerReviewResolver,
  registerReviewText,
  syncedRecord,
  waitUnlessOffline,
} from '@/lib/offline/syncEngine';
import type { Raw } from '@/lib/pagination';
import { admissionOpsFor } from './admissions-sync';
import {
  GUARDIAN_FIELDS,
  PROFILE_FIELDS,
  REQUIRED,
  studentPath,
  toDetail,
  type GuardianField,
  type Guardians,
  type Profile,
  type ProfileField,
  type StudentDetail,
} from './api';

/**
 * Pupil edits through the outbox (docs/offline/staff-offline.md, contract
 * §9.3, step 5c). Every edit is queued, online too, as `changes` with the
 * value each field had on screen (`from`) and the record's `rowVersion` as
 * `X-Base-Version`. Fields nobody else changed apply even from an old copy;
 * a clash sends just those fields to review, and the engine resends the rest
 * (§5). Offline, the pupil is read from the synced `student-details` record,
 * with the device's queued edits on top.
 */
export const EDITS_COLLECTION = 'student-details';

type Changes = Record<string, { from: string; to: string }>;
const PROFILE = new Set<string>(PROFILE_FIELDS);
const GUARDIAN = new Set<string>(GUARDIAN_FIELDS);

const changesOf = (op: OutboxOp): Changes => {
  try {
    const body = op.body ? (JSON.parse(op.body) as Raw) : {};
    return (body.changes as Changes | undefined) ?? {};
  } catch {
    return {};
  }
};

/** A pupil's details with the edits still queued on this device on top. */
export interface ShownDetail {
  student: StudentDetail;
  /** Fields with an edit waiting to sync. */
  waiting: Set<string>;
  /** Read from the device: the server was out of reach. */
  offline: boolean;
}

/** The server's copy, never a saved read: its `rowVersion` is the base of the next edit. */
const liveDetail = async (id: string) =>
  toDetail((await apiClient.request<Raw>(studentPath(id), { method: 'GET' })).data ?? {});

/** The synced record, else a saved read of the page (a pupil out of the synced scope). */
async function deviceDetail(id: string): Promise<StudentDetail> {
  const record = await syncedRecord<Raw>(EDITS_COLLECTION, id);
  if (record?.data && !record.deleted)
    return toDetail({ ...record.data, rowVersion: record.version });
  return toDetail((await apiClient.get<Raw>(studentPath(id))).data ?? {});
}

export async function loadStudent(id: string): Promise<ShownDetail> {
  let student: StudentDetail;
  let offline = false;
  try {
    student = await liveDetail(id);
  } catch (err) {
    if (!isUnreachable(err)) throw err;
    student = await deviceDetail(id);
    offline = true;
  }
  const waiting = new Set<string>();
  const profile = { ...student.profile };
  const guardians = { ...student.guardians };
  for (const op of await pendingWrites(EDITS_COLLECTION, id)) {
    for (const [field, { to }] of Object.entries(changesOf(op))) {
      if (PROFILE.has(field)) profile[field as ProfileField] = to ?? '';
      else if (GUARDIAN.has(field)) guardians[field as GuardianField] = to ?? '';
      else continue;
      waiting.add(field);
    }
  }
  const fullName = waiting.size
    ? [profile.firstName, profile.otherName, profile.surname]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' ')
    : student.fullName;
  return { student: { ...student, profile, guardians, fullName }, waiting, offline };
}

/**
 * Queues the fields that changed, each from the value on screen. A cleared
 * field is sent empty to blank it; names, gender and the birth date can't be
 * blanked. Ops for one pupil send in order, so a second edit made before the
 * first lands starts from the first one's values.
 */
export async function queueStudentEdit(
  student: StudentDetail,
  change: Partial<Profile & Guardians>,
): Promise<OutboxOp | null> {
  const shown: Record<string, string> = { ...student.profile, ...student.guardians };
  const changes: Changes = {};
  for (const [field, value] of Object.entries(change)) {
    const to = (value ?? '').trim();
    if (to === '' && REQUIRED.has(field as ProfileField)) continue;
    changes[field] = { from: shown[field] ?? '', to };
  }
  if (Object.keys(changes).length === 0) return null;
  return enqueueWrite({
    collection: EDITS_COLLECTION,
    entityId: student.id,
    method: 'PATCH',
    path: studentPath(student.id),
    body: { changes },
    baseVersion: student.rowVersion ?? undefined,
    dependsOn: await admissionOpsFor([student.id]),
    label: `Changes to ${student.fullName}'s details`,
    names: { [student.id]: student.fullName },
  });
}

/** What became of a saved edit, for the screen's message. */
export type EditResult = 'saved' | 'queued' | 'review';

/** Queues the edit and waits a few seconds for it to land (not at all when offline). */
export async function saveStudentEdit(
  student: StudentDetail,
  change: Partial<Profile & Guardians>,
): Promise<EditResult> {
  const op = await queueStudentEdit(student, change);
  if (!op) return 'saved';
  const outcome = await waitUnlessOffline(op.opId, 8000);
  if (!outcome) return 'queued';
  return outcome.state === 'review' ? 'review' : 'saved';
}

// --- Review tray ------------------------------------------------------------

function explain(item: ReviewItem): string | null {
  const pupil = item.op.names?.[item.op.entityId] ?? 'this pupil';
  switch (item.error?.code) {
    case 'RECORD_DELETED':
      return `Not saved: ${pupil}'s record was removed.`;
    case 'VALIDATION_FAILED':
      return `Not saved: the server refused a value (${item.error.message}). Make the change again from the pupil's record.`;
    default:
      return item.error?.status === 404 ? `Not saved: ${pupil}'s record wasn't found.` : null;
  }
}

/** "Keep mine": the clashing fields again, each from the server's value now. */
function resend(item: ReviewItem) {
  const current = item.error?.current as Raw | undefined;
  if (item.error?.code !== 'CONFLICT' || !current) return null;
  const changes = Object.fromEntries(
    Object.entries(changesOf(item.op)).map(([field, { to }]) => [
      field,
      { from: current[field] ?? '', to },
    ]),
  );
  if (Object.keys(changes).length === 0) return null;
  return {
    collection: EDITS_COLLECTION,
    entityId: item.op.entityId,
    method: 'PATCH' as const,
    path: item.op.path,
    body: { changes },
    baseVersion: typeof current.rowVersion === 'number' ? current.rowVersion : undefined,
    label: item.op.label,
    names: item.op.names,
  };
}

/** Registers the edit cards with the sync engine (once, app-wide). */
export function registerEditsSync() {
  registerReviewText(EDITS_COLLECTION, { explain });
  registerReviewResolver(EDITS_COLLECTION, resend);
}
