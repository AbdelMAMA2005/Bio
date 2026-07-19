/**
 * Détenteur en mémoire du JWT courant, lu par le client HTTP (src/api/client.ts).
 * Mis à jour par AuthProvider à la connexion/déconnexion, en plus du stockage
 * persistant (SecureStore, voir features/auth/authStorage.ts).
 */
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}
