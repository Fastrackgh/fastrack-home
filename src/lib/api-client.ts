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
    /** The response's headers (e.g. `Retry-After`); missing when there was no response. */
    public headers?: Headers,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** An id or code made safe to put in a URL path, e.g. a student code with slashes. */
export const pathId = (value: string) => encodeURIComponent(value);

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

/** The machine `code` of a failed request (e.g. `CONFLICT`, docs/offline/sync-contract.md §6). */
export function errorCode(err: unknown): string | undefined {
  return err instanceof ApiError ? (err.details as { code?: string } | undefined)?.code : undefined;
}

/** Every browser-storage key that belongs to a signed-in session. */
export const SESSION_STORAGE_KEYS = {
  accessToken: 'fastrack_access_token',
  refreshToken: 'fastrack_refresh_token',
  /** When the refresh token ends, in device-clock ms (`refreshExpiresAt`, clock-corrected). */
  sessionExpiresAt: 'fastrack_session_expires_at',
  /** When the staff portal last renewed the session by itself (device ms). */
  sessionRenewedAt: 'fastrack_session_renewed_at',
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

/** A saved copy of a GET response, served when the API can't be reached. */
export interface SavedRead {
  response: ApiResponse<unknown, unknown>;
  savedAt: number;
}

/** Where `get` keeps its saved copies (the staff portal's offline store, `src/lib/offline`). */
export interface ReadCache {
  read(endpoint: string): Promise<SavedRead | undefined>;
  write(endpoint: string, response: ApiResponse<unknown, unknown>): void;
}

/** Told whether the API answered (any HTTP status) or couldn't be reached. */
type ReachabilityListener = (reachable: boolean) => void;

/** Failures a saved copy stands in for: no network, or the API down behind its gateway. */
export const isUnreachable = (err: unknown) =>
  err instanceof ApiError && (err.statusCode === NETWORK_ERROR_STATUS || err.statusCode >= 502);

class ApiClient {
  /** Shared by every request in this tab that hits a 401 while a refresh is in flight. */
  private refreshInFlight: Promise<string | null> | null = null;
  private readCache: ReadCache | null = null;
  private readonly reachabilityListeners = new Set<ReachabilityListener>();

  /** Turns saved copies of reads on (a cache) or off (null) for this tab. */
  public setReadCache(cache: ReadCache | null) {
    this.readCache = cache;
  }

  /** Calls `listener` after every request with whether the API was reached; returns the unsubscribe. */
  public onReachability(listener: ReachabilityListener) {
    this.reachabilityListeners.add(listener);
    return () => {
      this.reachabilityListeners.delete(listener);
    };
  }

  private reportReachability(reachable: boolean) {
    this.reachabilityListeners.forEach((listener) => listener(reachable));
  }

  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_STORAGE_KEYS.accessToken);
  }

  public getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_STORAGE_KEYS.refreshToken);
  }

  /**
   * `refreshExpiresAt` is on the server clock. It's stored on the device
   * clock, using the offset last seen in `X-Server-Time`, so a device whose
   * clock is wrong still warns at the right moment.
   */
  public setTokens(accessToken: string, refreshToken?: string, refreshExpiresAt?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_STORAGE_KEYS.accessToken, accessToken);
    if (refreshToken) {
      localStorage.setItem(SESSION_STORAGE_KEYS.refreshToken, refreshToken);
    }
    const expires = refreshExpiresAt ? Date.parse(refreshExpiresAt) : NaN;
    if (Number.isNaN(expires)) {
      localStorage.removeItem(SESSION_STORAGE_KEYS.sessionExpiresAt);
    } else {
      localStorage.setItem(
        SESSION_STORAGE_KEYS.sessionExpiresAt,
        String(expires - this.serverOffsetMs),
      );
    }
  }

  /** When the session can no longer be renewed (device clock), or null if unknown. */
  public getSessionExpiresAt(): number | null {
    if (typeof window === 'undefined') return null;
    const value = Number(localStorage.getItem(SESSION_STORAGE_KEYS.sessionExpiresAt));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  /** Server clock minus device clock, from the last `X-Server-Time` seen (0 before any). */
  private serverOffsetMs = 0;

  private noteServerTime(headers: Headers) {
    const at = Date.parse(headers.get('X-Server-Time') ?? '');
    if (!Number.isNaN(at)) this.serverOffsetMs = at - Date.now();
  }

  /** Now on the server's clock, as of the last `X-Server-Time` seen (the device clock before any). */
  serverNow(): Date {
    return new Date(Date.now() + this.serverOffsetMs);
  }

  /**
   * Renews the session now (a new refresh token with a fresh lifetime),
   * e.g. when it's close to ending. Resolves false if it couldn't.
   */
  public async renewSession(): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return false;
    try {
      return Boolean(await this.refreshOnce(token));
    } catch {
      return false;
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

    this.noteServerTime(response.headers);
    const json = await response.json().catch(() => ({}));
    const newAccessToken = json.data?.accessToken;
    if (!newAccessToken) throw new ApiError(NETWORK_ERROR_STATUS, UNREACHABLE_MESSAGE);
    this.setTokens(newAccessToken, json.data?.refreshToken, json.data?.refreshExpiresAt);
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
    return (await this.exchange<T, M>(endpoint, options)).body;
  }

  /** `request`, plus the response's status and headers (the sync engine reads `Idempotent-Replayed`). */
  public async exchange<T = unknown, M = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ body: ApiResponse<T, M>; status: number; headers: Headers }> {
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
        const response = await fetch(url, { ...options, headers });
        this.reportReachability(response.status < 502);
        this.noteServerTime(response.headers);
        return response;
      } catch {
        this.reportReachability(false);
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
      throw new ApiError(response.status, message, data, response.headers);
    }

    return { body: data as ApiResponse<T, M>, status: response.status, headers: response.headers };
  }

  /**
   * With a read cache set, every successful read is saved, and a read that
   * can't reach the API returns the saved copy instead of failing.
   */
  public async get<T = unknown, M = unknown>(endpoint: string, headers?: Record<string, string>) {
    const cache = this.readCache;
    try {
      const response = await this.request<T, M>(endpoint, { method: 'GET', headers });
      cache?.write(endpoint, response);
      return response;
    } catch (err) {
      if (!cache || !isUnreachable(err)) throw err;
      const saved = await cache.read(endpoint).catch(() => undefined);
      if (!saved) throw err;
      return saved.response as ApiResponse<T, M>;
    }
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
