import { AxiosError, create } from 'axios';

import { getAuthToken } from '@/api/authToken';
import { API_BASE_URL } from '@/api/config';

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
  const token = getAuthToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * Sur un 401, la dernière option reste de déconnecter (session vraiment invalide, ou
 * refresh lui-même en échec) — AuthProvider enregistre ce callback au montage.
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/**
 * Tentative de renouvellement silencieux du token d'accès (voir API_CONTRACT.md §1,
 * `POST /auth/refresh`) — enregistrée par AuthProvider, qui seul connaît le refresh token
 * courant et sait où le persister. Renvoie le nouvel accessToken, ou `null` si le
 * refresh a lui-même échoué (refresh token expiré/révoqué) : dans ce cas, `onUnauthorized`
 * prend le relais (déconnexion).
 *
 * Un seul appel de refresh à la fois (`refreshPromise` partagée) : si plusieurs requêtes
 * échouent en 401 au même instant (ex. plusieurs appels parallèles au démarrage d'un
 * écran), elles attendent toutes le même refresh au lieu d'en déclencher un chacune (ce
 * qui ferait échouer les suivantes, le refresh token ayant déjà tourné par rotation).
 */
let onRefresh: (() => Promise<string | null>) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  onRefresh = handler;
}

// Jamais de tentative de refresh silencieux sur ces routes : /auth/refresh lui-même
// (boucle infinie sinon) et /auth/login|register|google (un 401 là est un vrai échec de
// connexion, pas une session expirée à renouveler).
const AUTH_ROUTES_WITHOUT_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/google'];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    const status = error.response?.status ?? null;
    const config = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const url = config?.url ?? '';

    const canRetryWithRefresh =
      status === 401 &&
      !!onRefresh &&
      !!config &&
      !config._retry &&
      !AUTH_ROUTES_WITHOUT_REFRESH.some((route) => url.includes(route));

    if (canRetryWithRefresh) {
      config._retry = true;
      refreshPromise ??= onRefresh!().finally(() => {
        refreshPromise = null;
      });
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        config.headers.set('Authorization', `Bearer ${newAccessToken}`);
        return apiClient.request(config);
      }
    }

    if (status === 401) {
      onUnauthorized?.();
    }
    const raw = error.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : (raw ?? error.message);
    return Promise.reject(new ApiError(message, status));
  },
);
