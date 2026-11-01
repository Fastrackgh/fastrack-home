import { apiClient, type ApiResponse, type PageMeta } from '@/lib/api-client';

export type Raw = Record<string, unknown>;

export interface Page<T> {
  items: T[];
  total: number;
}

/** Rows per page in every paged table. */
export const PAGE_SIZE = 20;

export function pageParams(page: number, filters: Record<string, string | null | undefined>) {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params;
}

/** A v2 list response: rows in `data`, pagination in `meta`. */
export function toPage<T>(res: ApiResponse<Raw[], PageMeta>, map: (raw: Raw) => T): Page<T> {
  return { items: (res.data ?? []).map(map), total: res.meta?.total ?? 0 };
}

/** The backend's largest page. */
const MAX_PAGE = 100;

/**
 * Every row of a paged list, a full page at a time, for lists that must be
 * complete (staff, invitations, schools, classes). `path` may already have a
 * query string. It stops when the backend says there's no next page, or a
 * page comes back short when it sends no `meta` (QA-030).
 */
export async function fetchAll<T = Raw>(path: string): Promise<T[]> {
  const rows: T[] = [];
  const join = path.includes('?') ? '&' : '?';
  for (let page = 1; ; page++) {
    const res = await apiClient.get<T[], PageMeta>(`${path}${join}page=${page}&limit=${MAX_PAGE}`);
    const items = res.data ?? [];
    rows.push(...items);
    const more = res.meta ? res.meta.hasNext : items.length === MAX_PAGE;
    if (!more || items.length === 0) return rows;
  }
}
