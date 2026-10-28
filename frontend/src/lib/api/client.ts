import { ApiEnvelope, ApiError, PaginationMeta } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : '/api/proxy';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, unknown>;
  organizationId?: string | null;
  signal?: AbortSignal;
  skipRefresh?: boolean;
}

let accessToken: string | null = null;
let activeOrganizationId: string | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setActiveOrganizationId(orgId: string | null): void {
  activeOrganizationId = orgId;
}

export function setRefreshHandler(handler: () => Promise<boolean>): void {
  refreshHandler = handler;
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(
    `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
    typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
  );
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.organizationId ?? activeOrganizationId) {
    headers['x-organization-id'] = (options.organizationId ?? activeOrganizationId) as string;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as ApiEnvelope<T> | { statusCode: number; code: string; message: string }) : null;

  if (!response.ok) {
    const err = json as { statusCode?: number; code?: string; message?: string; details?: unknown } | null;
    throw new ApiError(
      response.status,
      err?.code ?? 'ERROR',
      err?.message ?? `Request failed with status ${response.status}`,
      err?.details,
    );
  }

  return (json as ApiEnvelope<T>) ?? { success: true, data: undefined as T };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    const result = await rawRequest<T>(path, options);
    return result.data;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipRefresh &&
      refreshHandler &&
      !path.includes('/auth/refresh')
    ) {
      const refreshed = await refreshHandler();
      if (refreshed) {
        const retry = await rawRequest<T>(path, { ...options, skipRefresh: true });
        return retry.data;
      }
    }
    throw error;
  }
}

export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; meta: PaginationMeta }> {
  try {
    const result = await rawRequest<T[]>(path, options);
    return { data: result.data, meta: (result.meta as PaginationMeta) ?? emptyMeta() };
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipRefresh &&
      refreshHandler &&
      !path.includes('/auth/refresh')
    ) {
      const refreshed = await refreshHandler();
      if (refreshed) {
        const retry = await rawRequest<T[]>(path, { ...options, skipRefresh: true });
        return { data: retry.data, meta: (retry.meta as PaginationMeta) ?? emptyMeta() };
      }
    }
    throw error;
  }
}

function emptyMeta(): PaginationMeta {
  return { page: 1, pageSize: 0, total: 0, totalPages: 0, hasNext: false, hasPrevious: false };
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
