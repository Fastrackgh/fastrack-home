const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Every request opts into the backend's v2 response contract
 * (`X-Api-Contract: 2`): lists come back as `data` (rows) + `meta`
 * (pagination), messages in `message`, and errors as
 * `{ success: false, statusCode, error, message, details? }`.
 */
export const API_CONTRACT_VERSION = '2';

export interface ApiResponse<T = unknown, M = unknown> {
  statusCode?: number;
  message?: string;
  data: T;
  meta?: M;
  success?: boolean;
}

/** Pagination metadata on v2 list responses. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** A failed request's message, or `fallback` for anything that isn't an Error. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * The structured `details` of a failed request (e.g. `{cells}` on a 422).
 * `ApiError.details` holds the whole error body, so they sit one level in.
 */
export function errorDetails<T>(err: unknown): T | undefined {
  return err instanceof ApiError
    ? ((err.details as { details?: T } | undefined)?.details ?? undefined)
    : undefined;
}

/** Every browser-storage key that belongs to a signed-in session. */
export const SESSION_STORAGE_KEYS = {
  accessToken: 'fastrack_access_token',
  refreshToken: 'fastrack_refresh_token',
  user: 'fastrack_user',
  school: 'fastrack_school',
  parentActiveWard: 'fastrack_parent_active_ward',
} as const;

/** Prefix of the parent portal's offline copies of API reads (one key per read). */
export const SESSION_CACHE_PREFIX = 'fastrack_cache:';

/**
 * Fired on `window` when the server has ended the session (the refresh token
 * was rejected). The auth provider signs the tab out; nothing reloads, so
 * the page can send the user to sign in and back.
 */
export const SESSION_ENDED_EVENT = 'fastrack:session-ended';

/** Status used for "the server could not be reached" (offline, DNS, 5xx, 429). */
export const NETWORK_ERROR_STATUS = 0;

const UNREACHABLE_MESSAGE =
  "Can't reach Fastrack right now. Check your connection and try again — you're still signed in.";

/** Name of the browser lock that lets one tab at a time refresh the session. */
const REFRESH_LOCK = 'fastrack-session-refresh';

class ApiClient {
  /** Shared by every request in this tab that hits a 401 while a refresh is in flight. */
  private refreshInFlight: Promise<string | null> | null = null;

  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_STORAGE_KEYS.accessToken);
  }

  public getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_STORAGE_KEYS.refreshToken);
  }

  public setTokens(accessToken: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_STORAGE_KEYS.accessToken, accessToken);
    if (refreshToken) {
      localStorage.setItem(SESSION_STORAGE_KEYS.refreshToken, refreshToken);
    }
  }

  /**
   * Removes tokens and every cached profile, so nothing from one user's
   * school survives into the next sign-in on a shared device.
   */
  public clearSession() {
    if (typeof window === 'undefined') return;
    Object.values(SESSION_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    Object.keys(localStorage)
      .filter((key) => key.startsWith(SESSION_CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  }

  /**
   * A fresh access token after `rejected` got a 401, or null when the server
   * has ended the session. Throws a network `ApiError` when the server can't
   * be reached; the session is kept so the next request can try again.
   */
  private refreshOnce(rejected: string | null): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.withRefreshLock(() => this.refreshAccessToken(rejected)).finally(
        () => {
          this.refreshInFlight = null;
        },
      );
    }
    return this.refreshInFlight;
  }

  /**
   * Tabs share one stored session, so only one of them refreshes at a time
   * (Web Locks). The others wait, then find the new token already stored.
   */
  private withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request(REFRESH_LOCK, fn) as Promise<T>;
    }
    return fn();
  }

  private async refreshAccessToken(rejected: string | null): Promise<string | null> {
    // Another tab refreshed while this one waited for the lock.
    const current = this.getAccessToken();
    if (current && current !== rejected) return current;

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Contract': API_CONTRACT_VERSION },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      throw new ApiError(NETWORK_ERROR_STATUS, UNREACHABLE_MESSAGE);
    }

    // Only the server saying no ends the session; outages and rate limits don't.
    if (response.status === 401 || response.status === 403) {
      this.endSession();
      return null;
    }
    if (!response.ok) throw new ApiError(NETWORK_ERROR_STATUS, UNREACHABLE_MESSAGE);

    const json = await response.json().catch(() => ({}));
    const newAccessToken = json.data?.accessToken;
    if (!newAccessToken) throw new ApiError(NETWORK_ERROR_STATUS, UNREACHABLE_MESSAGE);
    this.setTokens(newAccessToken, json.data?.refreshToken);
    return newAccessToken;
  }

  /** Clears the stored session and tells the app (every tab sees the storage change). */
  private endSession() {
    this.clearSession();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }

  /**
   * Ends this sign-in on the server too, so the refresh token stops working
   * everywhere (best effort: signing out never waits on the network).
   */
  public revokeSession() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return;
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      keepalive: true,
    }).catch(() => undefined);
  }

  public async request<T = unknown, M = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T, M>> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      // FormData sets its own multipart boundary header.
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      'X-Api-Contract': API_CONTRACT_VERSION,
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const send = async () => {
      try {
        return await fetch(url, { ...options, headers });
      } catch {
        throw new ApiError(NETWORK_ERROR_STATUS, UNREACHABLE_MESSAGE);
      }
    };
    let response = await send();

    if (
      response.status === 401 &&
      token &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh')
    ) {
      const newToken = await this.refreshOnce(token);
      if (!newToken) {
        throw new ApiError(401, 'Your session has ended. Please sign in again.');
      }
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await send();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // v2 errors carry a string `message` (+ `details` for validation);
      // arrays are still handled for any legacy body.
      const message = Array.isArray(data?.message)
        ? data.message.join(', ')
        : data?.message || response.statusText || 'Request failed';
      throw new ApiError(response.status, message, data);
    }

    return data as ApiResponse<T, M>;
  }

  public get<T = unknown, M = unknown>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T, M>(endpoint, { method: 'GET', headers });
  }

  public post<T = unknown, M = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) {
    return this.request<T, M>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  /** Multipart upload (e.g. `POST /media` with a `file` field). */
  public postForm<T = unknown, M = unknown>(endpoint: string, form: FormData) {
    return this.request<T, M>(endpoint, { method: 'POST', body: form });
  }

  public put<T = unknown, M = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) {
    return this.request<T, M>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public patch<T = unknown, M = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) {
    return this.request<T, M>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  public delete<T = unknown, M = unknown>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T, M>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
