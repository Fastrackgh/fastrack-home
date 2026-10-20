const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = unknown, M = unknown> {
  statusCode?: number;
  message?: string;
  data: T;
  meta?: M;
  success?: boolean;
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

/** Every browser-storage key that belongs to a signed-in session. */
export const SESSION_STORAGE_KEYS = {
  accessToken: 'fastrack_access_token',
  refreshToken: 'fastrack_refresh_token',
  user: 'fastrack_user',
  school: 'fastrack_school',
} as const;

class ApiClient {
  /** Shared by every request that hits a 401 while a refresh is in flight. */
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
  }

  private refreshOnce(): Promise<string | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshAccessToken().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearSession();
        return null;
      }

      const json = await response.json();
      const newAccessToken = json.data?.accessToken;
      const newRefreshToken = json.data?.refreshToken;

      if (newAccessToken) {
        this.setTokens(newAccessToken, newRefreshToken);
        return newAccessToken;
      }
      return null;
    } catch {
      this.clearSession();
      return null;
    }
  }

  public async request<T = unknown, M = unknown>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T, M>> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/refresh')
    ) {
      const newToken = await this.refreshOnce();
      if (!newToken) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/school-admin/login') {
          window.location.href = '/school-admin/login';
        }
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...options, headers });
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
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
