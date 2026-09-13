import { AxiosError, create } from 'axios';
import { API_BASE_URL } from './config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth-storage';

export class ApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/** Enregistré par AuthProvider : redirige vers /login quand toute tentative de session échoue. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// Un seul refresh en vol à la fois — mêmes raisons que apps/mobile/src/api/client.ts
// (rotation du refresh token : un 2e appel concurrent avec l'ancien token échouerait).
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await create({ baseURL: API_BASE_URL }).post('/auth/refresh', { refreshToken });
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

const NO_REFRESH_ROUTES = ['/auth/refresh', '/auth/login'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    const status = error.response?.status ?? null;
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const url = config?.url ?? '';

    const canRetry =
      status === 401 && !!config && !config._retry && !NO_REFRESH_ROUTES.some((r) => url.includes(r));

    if (canRetry) {
      config!._retry = true;
      refreshPromise ??= tryRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        config!.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient.request(config!);
      }
    }

    if (status === 401) {
      clearTokens();
      onUnauthorized?.();
    }
    const raw = error.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : (raw ?? error.message);
    return Promise.reject(new ApiError(message, status));
  },
);
