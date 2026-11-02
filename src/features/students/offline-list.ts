import { isUnreachable } from '@/lib/api-client';
import { syncedRecords } from '@/lib/offline/syncEngine';
import { PAGE_SIZE, type Page } from '@/lib/pagination';
import { studentsApi, type StudentFilters, type StudentRow } from './api';

/**
 * The students table offline (OFF-18): the synced `students` records (§8),
 * which carry the list's row shape, filtered and paged on the device as the
 * server would. A teacher's records are already scoped to their classes.
 */
async function syncedRows(): Promise<StudentRow[]> {
  return (await syncedRecords<StudentRow>('students'))
    .filter((record) => record.data && !record.deleted)
    .map((record) => record.data as StudentRow);
}

const matches = (row: StudentRow, { search, classId, status }: StudentFilters) => {
  const term = search?.toLowerCase();
  return (
    (!classId || row.classId === classId) &&
    (!status || (status === 'Active' ? row.status === 'Active' : row.status !== 'Active')) &&
    (!term ||
      [row.fullName, row.studentCode, row.firstName, row.surname]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)))
  );
};

/**
 * A page of the list: from the server, else from the synced records, else a
 * saved copy of the page (a device that has synced nothing yet). `offline`
 * says it came from the device.
 */
export async function studentsPage(
  page: number,
  filters: StudentFilters,
): Promise<{ page: Page<StudentRow>; offline: boolean }> {
  try {
    return { page: await studentsApi.liveList(page, filters), offline: false };
  } catch (err) {
    if (!isUnreachable(err)) throw err;
    const rows = await syncedRows();
    if (rows.length === 0) return { page: await studentsApi.list(page, filters), offline: true };
    // Newest first, as the server lists them.
    const shown = rows
      .filter((row) => matches(row, filters))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    return {
      page: { items: shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: shown.length },
      offline: true,
    };
  }
}

/** Active pupils school-wide: from the server, else counted from the synced records. */
export async function activeStudents(): Promise<number> {
  try {
    return await studentsApi.activeCount();
  } catch (err) {
    if (!isUnreachable(err)) throw err;
    return (await syncedRows()).filter((row) => row.status === 'Active').length;
  }
}
