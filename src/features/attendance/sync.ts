import { isWeekend, formatDay } from '@/features/calendar/dates';
import { toClass, type SchoolClass } from '@/features/school-setup/api';
import { dataScopeOf, type Role } from '@/lib/rbac';
import { isUnreachable } from '@/lib/api-client';
import type { EnqueueInput, OutboxOp, ReviewItem } from '@/lib/offline/outbox';
import { savedReadsLike } from '@/lib/offline/session';
import {
  enqueueWrite,
  pendingWrites,
  registerReviewResolver,
  registerReviewText,
  syncedRecord,
  syncedRecords,
  waitForOp,
  type OpOutcome,
} from '@/lib/offline/syncEngine';
import {
  ATTENDANCE_BASE,
  MAX_MARKS,
  attendanceApi,
  type AttendanceStatus,
  type Mark,
  type Register,
  type RegisterStudent,
} from './api';
import { admissionOpsFor, pendingAdmissions } from '@/features/students/admissions-sync';

/**
 * Offline attendance (docs/offline/staff-offline.md, contract §5 batch cells,
 * backend step 4a). Saving queues the register through the outbox, online or
 * not; each mark carries `from`, the value the device saw, so a mark someone
 * else changed meanwhile comes back as a cell conflict for review instead of
 * being overwritten.
 */
export const ATTENDANCE_COLLECTION = 'attendance';
const entityOf = (classId: string, date: string) => `${classId}:${date}`;

/** How long Save waits for the server before saying "saved on this device". */
const LAND_WAIT_MS = 8000;

interface QueuedMark {
  schoolStudentId?: string;
  studentId?: string;
  status: AttendanceStatus;
  arrivalTime?: string;
  note?: string;
  from: { status: AttendanceStatus; arrivalTime: string | null; note: string | null } | null;
}

interface QueuedRegister {
  classId: string;
  date: string;
  marks: QueuedMark[];
}

const fromOf = (student: RegisterStudent): QueuedMark['from'] =>
  student.status
    ? { status: student.status, arrivalTime: student.arrivalTime, note: student.note }
    : null;

const parse = (op: OutboxOp): QueuedRegister | null => {
  try {
    return op.body ? (JSON.parse(op.body) as QueuedRegister) : null;
  } catch {
    return null;
  }
};

/** The register as this device sees it: the server's (or saved) copy with queued marks laid over. */
function withPending(register: Register, ops: OutboxOp[]): Register {
  if (ops.length === 0) return register;
  const students = register.students.map((student) => ({ ...student }));
  for (const op of ops) {
    for (const mark of parse(op)?.marks ?? []) {
      const student = students.find((s) =>
        mark.schoolStudentId
          ? s.schoolStudentId === mark.schoolStudentId
          : s.studentId === mark.studentId,
      );
      if (!student) continue;
      student.status = mark.status;
      student.arrivalTime = mark.arrivalTime ?? null;
      student.note = mark.note ?? null;
      student.pending = true;
    }
  }
  return { ...register, students };
}

/**
 * Offline, a day never opened online has no saved register. The class's
 * latest saved register gives its pupils, all unmarked; the server checks
 * each mark when it arrives (`NOT_ENROLLED_ON_DATE` goes to review).
 */
async function builtRegister(classId: string, date: string): Promise<Register | null> {
  const prefix = `${ATTENDANCE_BASE}/register?${new URLSearchParams({ classId })}&`;
  const saved = (await savedReadsLike(prefix))
    .map(({ read }) => read.response.data as Register)
    .filter((register) => register?.students);
  const source = saved.find((register) => register.schoolDay.open) ?? saved[0];
  if (!source) return null;
  const weekend = isWeekend(date);
  return {
    ...source,
    date,
    schoolDay: {
      open: !weekend,
      termId: source.schoolDay.termId,
      reason: weekend ? 'WEEKEND' : null,
      closureTitle: null,
    },
    // A closed day's register always says false; the server decides when the marks arrive.
    canMark: !weekend && (source.schoolDay.open ? source.canMark : true),
    students: source.students.map((student) => ({
      ...student,
      status: null,
      arrivalTime: null,
      note: null,
      markedBy: null,
      markedAt: null,
      rowVersion: null,
    })),
    counts: { present: 0, absent: 0, late: 0, halfDay: 0, excused: 0 },
    unmarked: source.students.length,
    builtFrom: source.date,
  };
}

/** The register for a class and day, with this device's queued marks on top. */
export async function loadRegister(classId: string, date: string): Promise<Register> {
  let register: Register;
  try {
    register = await attendanceApi.register(classId, date);
  } catch (err) {
    const built = isUnreachable(err)
      ? ((await builtRegister(classId, date)) ?? (await registerFromRecords(classId, date)))
      : null;
    if (!built) throw err;
    register = await withPupilsOfTheDay(built);
  }
  return withPending(
    await withSynced(await withAdmittedHere(register)),
    await pendingWrites(ATTENDANCE_COLLECTION, entityOf(classId, date)),
  );
}

/**
 * Pupils admitted to this class on this device and not yet synced (§9.2):
 * they can be marked, and their marks wait for the admission to land
 * (`dependsOn`, see `saveRegister`). Any day, as the server's register
 * does: an admission belongs to the class for its whole admission term.
 */
async function withAdmittedHere(register: Register): Promise<Register> {
  const listed = new Set(register.students.map((s) => s.schoolStudentId ?? s.studentId));
  const added: RegisterStudent[] = (await pendingAdmissions())
    .filter((p) => p.classId === register.classId && !listed.has(p.id))
    .map((p) => ({
      studentId: p.id,
      schoolStudentId: p.id,
      rowVersion: null,
      studentCode: null,
      name: [`${p.surname},`, p.firstName, p.otherName].filter(Boolean).join(' '),
      status: null,
      arrivalTime: null,
      note: null,
      markedBy: null,
      markedAt: null,
    }));
  if (added.length === 0) return register;
  const students = [...register.students, ...added].sort((a, b) => a.name.localeCompare(b.name));
  return { ...register, students, unmarked: register.unmarked + added.length };
}

/** A synced attendance record's data: the register entry plus its class and day (§8). */
type SyncedEntry = RegisterStudent & { classId: string; date: string };

/**
 * A built register uses a class list from another day (or today's). Synced
 * attendance records carry the class each pupil was in on their day (§8),
 * so pupils marked in this class that day who have moved since are added
 * back. A day nobody marked can't be known offline; the server checks the
 * day's membership when the marks arrive.
 */
async function withPupilsOfTheDay(register: Register): Promise<Register> {
  const listed = new Set(register.students.map((s) => s.schoolStudentId ?? s.studentId));
  const missing = (await syncedRecords<SyncedEntry>(ATTENDANCE_COLLECTION))
    .map((record) => record.data)
    .filter(
      (entry): entry is SyncedEntry =>
        entry?.classId === register.classId &&
        entry.date === register.date &&
        !listed.has(entry.schoolStudentId ?? entry.studentId),
    );
  if (missing.length === 0) return register;
  const students: RegisterStudent[] = [...register.students, ...missing];
  students.sort((a, b) => a.name.localeCompare(b.name));
  return { ...register, students, unmarked: register.unmarked + missing.length };
}

/**
 * Lays the device's synced records (the change feed, §7) over the register,
 * where newer by version: a saved copy then shows marks other devices made
 * since it was saved. Online the server's copy is at least as new, so
 * nothing changes.
 */
async function withSynced(register: Register): Promise<Register> {
  const students = await Promise.all(
    register.students.map(async (student) => {
      if (!student.schoolStudentId) return student;
      const record = await syncedRecord<SyncedEntry>(
        ATTENDANCE_COLLECTION,
        `${student.schoolStudentId}:${register.date}`,
      );
      if (!record || record.version <= (student.rowVersion ?? 0)) return student;
      // Out of scope only means this user can't see it now: keep what's shown.
      if (record.deleted === 'out_of_scope') return student;
      const synced = record.data;
      return {
        ...student,
        status: synced?.status ?? null,
        arrivalTime: synced?.arrivalTime ?? null,
        note: synced?.note ?? null,
        markedBy: synced?.markedBy ?? null,
        markedAt: synced?.markedAt ?? null,
        rowVersion: record.version,
      };
    }),
  );
  return { ...register, students };
}

/** A synced pupil (`students`, §8): the roster row. */
interface SyncedPupil {
  id: string;
  studentId: string;
  studentCode: string | null;
  firstName: string;
  surname: string;
  otherName: string | null;
  classId: string | null;
  className: string | null;
}

/**
 * Offline with no saved register for the class at all: its pupils from the
 * synced class list (today's class, so the server checks the day's
 * membership when the marks arrive).
 */
async function registerFromRecords(classId: string, date: string): Promise<Register | null> {
  const pupils = (await syncedRecords<SyncedPupil>('students'))
    .map((record) => record.data)
    .filter((pupil): pupil is SyncedPupil => pupil?.classId === classId);
  if (pupils.length === 0) return null;
  const weekend = isWeekend(date);
  return {
    classId,
    className: pupils[0].className ?? '',
    date,
    schoolDay: {
      open: !weekend,
      termId: null,
      reason: weekend ? 'WEEKEND' : null,
      closureTitle: null,
    },
    canMark: !weekend,
    students: pupils
      .map((pupil) => ({
        studentId: pupil.studentId,
        schoolStudentId: pupil.id,
        rowVersion: null,
        studentCode: pupil.studentCode,
        name: [`${pupil.surname},`, pupil.firstName, pupil.otherName].filter(Boolean).join(' '),
        status: null,
        arrivalTime: null,
        note: null,
        markedBy: null,
        markedAt: null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    counts: { present: 0, absent: 0, late: 0, halfDay: 0, excused: 0 },
    unmarked: pupils.length,
    builtFrom: 'records',
  };
}

/**
 * The classes to offer offline when the class list can't be loaded: from the
 * synced records. A teacher's records are already scoped to their classes,
 * so they get their homeroom plus the classes their synced pupils are in.
 */
export async function offlineClassesFor(viewer: {
  id: string;
  role: Role;
}): Promise<SchoolClass[]> {
  const classes = (await syncedRecords<Record<string, unknown>>('classes'))
    .filter((record) => record.data)
    .map((record) => toClass(record.data as Record<string, unknown>));
  const sorted = classes.sort(
    (a, b) =>
      a.sequenceOrder - b.sequenceOrder ||
      a.className.localeCompare(b.className, undefined, { numeric: true }),
  );
  if (dataScopeOf(viewer.role) !== 'assigned_classes') return sorted;
  const taught = new Set(
    (await syncedRecords<SyncedPupil>('students')).map((record) => record.data?.classId),
  );
  return sorted.filter((c) => c.homeroomStaffId === viewer.id || taught.has(c.id));
}

/** A change to one pupil's mark, against the register on screen. */
export interface MarkChange {
  student: RegisterStudent;
  status: AttendanceStatus;
  arrivalTime?: string;
  note?: string;
}

export type SaveResult =
  | { kind: 'landed'; outcome: OpOutcome; count: number }
  | { kind: 'waiting'; count: number }
  | { kind: 'sent'; register: Register; count: number };

/**
 * Saves changed marks. With an offline store they're queued (one op per 200
 * marks, sent in order) and Save waits briefly for them to land; without one
 * (e.g. a private window) they're sent directly, as before.
 */
export async function saveRegister(register: Register, changes: MarkChange[]): Promise<SaveResult> {
  const count = changes.length;
  const marks: QueuedMark[] = changes.map(({ student, status, arrivalTime, note }) => ({
    ...(student.schoolStudentId
      ? { schoolStudentId: student.schoolStudentId }
      : { studentId: student.studentId }),
    status,
    ...(arrivalTime ? { arrivalTime } : {}),
    ...(note ? { note } : {}),
    from: fromOf(student),
  }));
  const names = Object.fromEntries(
    changes.map(({ student }) => [student.schoolStudentId ?? student.studentId, student.name]),
  );
  const ops: OutboxOp[] = [];
  // Marks for pupils admitted on this device wait for their admission to land.
  const admissions = await admissionOpsFor(
    changes.map(({ student }) => student.schoolStudentId ?? student.studentId),
  );
  try {
    for (let i = 0; i < marks.length; i += MAX_MARKS) {
      const input: EnqueueInput = {
        collection: ATTENDANCE_COLLECTION,
        entityId: entityOf(register.classId, register.date),
        method: 'PUT',
        path: `${ATTENDANCE_BASE}/register`,
        body: {
          classId: register.classId,
          date: register.date,
          marks: marks.slice(i, i + MAX_MARKS),
        },
        label: `Attendance for ${register.className}, ${formatDay(register.date)}`,
        names,
        dependsOn: admissions,
      };
      ops.push(await enqueueWrite(input));
    }
  } catch (err) {
    if (ops.length > 0) throw err;
    // No offline store on this device: send directly, as before offline support.
    const direct: Mark[] = changes.map(({ student, status, arrivalTime, note }) => ({
      studentId: student.studentId,
      status,
      ...(arrivalTime ? { arrivalTime } : {}),
      ...(note ? { note } : {}),
    }));
    return {
      kind: 'sent',
      register: await attendanceApi.mark(register.classId, register.date, direct),
      count,
    };
  }
  const outcomes = await Promise.all(ops.map((op) => waitForOp(op.opId, LAND_WAIT_MS)));
  if (outcomes.some((outcome) => outcome === null)) return { kind: 'waiting', count };
  const landed = outcomes as OpOutcome[];
  const worst =
    landed.find((outcome) => outcome.state === 'forwarded') ??
    landed.find((outcome) => outcome.state === 'review');
  return {
    kind: 'landed',
    outcome: worst ?? {
      state: 'applied',
      cellConflicts: landed.reduce((sum, outcome) => sum + outcome.cellConflicts, 0),
      opId: landed[0].opId,
    },
    count,
  };
}

/** True when an applied op is one of this register's, so the screen should reload. */
export const isRegisterOp = (op: OutboxOp, classId: string | null, date: string) =>
  op.collection === ATTENDANCE_COLLECTION && op.entityId === entityOf(classId ?? '', date);

/** The pupil a `NOT_ENROLLED_ON_DATE` refusal names, if any (the whole register was refused). */
const notEnrolled = (item: ReviewItem): string | null => {
  const id = item.error?.reason?.schoolStudentId;
  return item.kind === 'rejected' &&
    item.error?.code === 'NOT_ENROLLED_ON_DATE' &&
    typeof id === 'string'
    ? id
    : null;
};

/**
 * Review for queued registers:
 * - "Keep mine" for a clashing cell: one pupil's mark again, with `from` set
 *   to what the server has now, so it applies unless the cell changes again.
 * - A register refused because one pupil wasn't in the class that day
 *   (`NOT_ENROLLED_ON_DATE`, e.g. a register built offline from another day's
 *   list): "Send without <pupil>" resends the rest.
 */
export function registerAttendanceResolver() {
  registerReviewText(ATTENDANCE_COLLECTION, {
    explain: (item) => {
      const id = notEnrolled(item);
      if (!id) return null;
      const queued = parse(item.op);
      const who = item.op.names?.[id] ?? 'A pupil';
      const day = queued ? formatDay(queued.date) : 'that day';
      return `${who} wasn't in this class on ${day}, so none of these marks were saved.`;
    },
    resendLabel: (item) => {
      const id = notEnrolled(item);
      return id ? `Send without ${item.op.names?.[id] ?? 'that pupil'}` : null;
    },
  });
  registerReviewResolver(ATTENDANCE_COLLECTION, (item) => {
    const queued = parse(item.op);
    const skip = notEnrolled(item);
    if (skip && queued) {
      const marks = queued.marks.filter((mark) => mark.schoolStudentId !== skip);
      if (marks.length === 0 || marks.length === queued.marks.length) return null;
      return {
        collection: ATTENDANCE_COLLECTION,
        entityId: item.op.entityId,
        method: 'PUT',
        path: item.op.path,
        body: { ...queued, marks },
        label: item.op.label,
        names: item.op.names,
      };
    }
    const mine = item.cell?.mine as Partial<QueuedMark> | undefined;
    const current = item.cell?.current as Partial<QueuedMark> | undefined;
    const schoolStudentId = item.cell?.cell.schoolStudentId;
    if (item.kind !== 'cell' || !queued || !mine?.status || typeof schoolStudentId !== 'string') {
      return null;
    }
    const mark: QueuedMark = {
      schoolStudentId,
      status: mine.status,
      ...(mine.arrivalTime ? { arrivalTime: mine.arrivalTime } : {}),
      ...(mine.note ? { note: mine.note } : {}),
      from: current?.status
        ? {
            status: current.status,
            arrivalTime: current.arrivalTime ?? null,
            note: current.note ?? null,
          }
        : null,
    };
    return {
      collection: ATTENDANCE_COLLECTION,
      entityId: item.op.entityId,
      method: 'PUT',
      path: item.op.path,
      body: { classId: queued.classId, date: queued.date, marks: [mark] },
      label: item.op.label,
      names: item.op.names,
    };
  });
}
