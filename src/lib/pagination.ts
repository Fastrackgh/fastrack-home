import type { ApiResponse, PageMeta } from '@/lib/api-client';

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
