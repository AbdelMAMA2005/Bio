/**
 * Détenteur en mémoire du JWT courant et du refresh token, lus par le client HTTP
 * (src/api/client.ts). Mis à jour par AuthProvider à la connexion/déconnexion, en plus du
 * stockage persistant (SecureStore, voir features/auth/authStorage.ts).
 */
let currentToken: string | null = null;
let currentRefreshToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

export function setRefreshToken(token: string | null): void {
  currentRefreshToken = token;
}

export function getRefreshToken(): string | null {
  return currentRefreshToken;
}
