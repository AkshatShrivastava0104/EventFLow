import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

const baseURL =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL || '/api/v1';

const TOKEN_KEY = 'eventflow.tokens';

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export const tokenStore = {
  get(): Tokens | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      return raw ? (JSON.parse(raw) as Tokens) : null;
    } catch {
      return null;
    }
  },
  set(t: Tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    window.dispatchEvent(new CustomEvent('auth:tokens-updated'));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },
};

export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as any;
    return {
      status,
      code: data?.code,
      message:
        data?.message ||
        data?.error ||
        (status === 0 ? 'Network error' : `Request failed (${status})`),
      details: data,
    };
  }
  return {
    status: 0,
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// --- Request interceptor: attach access token -----------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const t = tokenStore.get();
  if (t?.access_token && config.headers) {
    config.headers.Authorization = `Bearer ${t.access_token}`;
  }
  return config;
});

// --- Response interceptor: refresh-on-401 ----------------------------------
let isRefreshing = false;
let queue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const flushQueue = (err: unknown, token: string | null = null) => {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  queue = [];
};

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const url = original?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers!.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const tokens = tokenStore.get();
      if (!tokens?.refresh_token) {
        tokenStore.clear();
        return Promise.reject(error);
      }

      try {
        // Use a bare axios instance to avoid recursive interceptor
        const { data } = await axios.post<Tokens>(
          `${baseURL}/auth/refresh`,
          { refresh_token: tokens.refresh_token },
          { headers: { 'Content-Type': 'application/json' } },
        );
        tokenStore.set(data);
        flushQueue(null, data.access_token);
        original.headers!.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch (e) {
        flushQueue(e);
        tokenStore.clear();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// --- Helpers ---------------------------------------------------------------
export async function get<T>(url: string, params?: Record<string, unknown>) {
  const r = await api.get<T>(url, { params });
  return r.data;
}
export async function post<T>(url: string, body?: unknown) {
  const r = await api.post<T>(url, body);
  return r.data;
}
export async function patch<T>(url: string, body?: unknown) {
  const r = await api.patch<T>(url, body);
  return r.data;
}
export async function put<T>(url: string, body?: unknown) {
  const r = await api.put<T>(url, body);
  return r.data;
}
export async function del<T = unknown>(url: string) {
  const r = await api.delete<T>(url);
  return r.data;
}
