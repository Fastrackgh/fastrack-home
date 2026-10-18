const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = unknown, M = any> {
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

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  public getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fastrack_access_token');
  }

  public getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fastrack_refresh_token');
  }

  public setTokens(accessToken: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('fastrack_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('fastrack_refresh_token', refreshToken);
    }
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('fastrack_access_token');
    localStorage.removeItem('fastrack_refresh_token');
    localStorage.removeItem('fastrack_user');
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
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
        this.clearTokens();
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
      this.clearTokens();
      return null;
    }
  }

  public async request<T = unknown, M = any>(
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
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        const newToken = await this.refreshAccessToken();
        this.isRefreshing = false;

        if (newToken) {
          this.onTokenRefreshed(newToken);
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, { ...options, headers });
        } else {
          if (
            typeof window !== 'undefined' &&
            window.location.pathname !== '/school-admin/login'
          ) {
            window.location.href = '/school-admin/login';
          }
          throw new ApiError(401, 'Session expired. Please log in again.');
        }
      } else {
        const retryToken = await new Promise<string>((resolve) => {
          this.addRefreshSubscriber(resolve);
        });
        headers['Authorization'] = `Bearer ${retryToken}`;
        response = await fetch(url, { ...options, headers });
      }
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

  public get<T = unknown, M = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T, M>(endpoint, { method: 'GET', headers });
  }

  public post<T = unknown, M = any>(
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

  public put<T = unknown, M = any>(
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

  public patch<T = unknown, M = any>(
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

  public delete<T = unknown, M = any>(
    endpoint: string,
    headers?: Record<string, string>,
  ) {
    return this.request<T, M>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
