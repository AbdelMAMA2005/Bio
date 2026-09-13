const ACCESS_KEY = 'planai-admin-access-token';
const REFRESH_KEY = 'planai-admin-refresh-token';

/**
 * localStorage plutôt que cookies : pas de backend spécifique à la console pour poser un
 * cookie httpOnly, et la même API (déjà pensée Bearer token pour le mobile) est réutilisée
 * telle quelle (voir API_CONTRACT.md §10 — pas de 2e système d'auth).
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
