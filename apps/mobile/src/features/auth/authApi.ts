import type { User } from '@planai/shared';

import { userFromBackend, type BackendUser } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';

type LoginResponse = { accessToken: string; refreshToken: string; user: BackendUser };
type AuthResult = { token: string; refreshToken: string; user: User };

export async function login(email: string, password: string): Promise<AuthResult> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, motDePasse: password });
  return { token: data.accessToken, refreshToken: data.refreshToken, user: userFromBackend(data.user, API_BASE_URL) };
}

/**
 * POST /auth/google : le back vérifie le idToken Google (audience = GOOGLE_CLIENT_ID)
 * et crée le compte au premier login (voir apps/api/src/modules/auth/auth.service.ts).
 */
export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const { data } = await apiClient.post<LoginResponse>('/auth/google', { idToken });
  return { token: data.accessToken, refreshToken: data.refreshToken, user: userFromBackend(data.user, API_BASE_URL) };
}

/**
 * POST /auth/register ne renvoie pas de token (voir API_CONTRACT.md §1) : on enchaîne
 * un login juste après pour connecter l'utilisateur immédiatement, comme le veut le
 * flux front existant.
 */
export async function register(pseudo: string, email: string, password: string): Promise<AuthResult> {
  await apiClient.post<BackendUser>('/auth/register', {
    email,
    nomUtilisateur: pseudo,
    motDePasse: password,
  });
  return login(email, password);
}

type RefreshResponse = { accessToken: string; refreshToken: string };

/**
 * POST /auth/refresh — échange un refresh token contre un nouveau couple access/refresh
 * (rotation côté back, voir API_CONTRACT.md §1) : appelé silencieusement par le client HTTP
 * sur un 401 (voir client.ts), jamais directement par un écran.
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', { refreshToken });
  return data;
}

/**
 * POST /auth/logout — révoque le refresh token côté back (best-effort : la déconnexion
 * locale a lieu même si cet appel échoue, voir AuthProvider.tsx).
 */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

/**
 * GET /users/me — relit le profil réel (XP/pièces/niveau à jour), utilisé après
 * toute action susceptible de créditer XP/pièces côté back sans que le front
 * en ait déjà la valeur exacte (ex. défis quotidiens, voir useQuests()).
 */
export async function fetchProfile(): Promise<User> {
  const { data } = await apiClient.get<BackendUser>('/users/me');
  return userFromBackend(data, API_BASE_URL);
}

/** PATCH /users/me existe désormais côté back (voir API_CONTRACT.md §2). */
export async function updateProfile(patch: Partial<Pick<User, 'pseudo'>>): Promise<User> {
  const { data } = await apiClient.patch<BackendUser>('/users/me', {
    nomUtilisateur: patch.pseudo,
  });
  return userFromBackend(data, API_BASE_URL);
}

/**
 * POST /users/me/avatar (multipart, champ `image`) — chaque upload écrit un nouveau
 * fichier (nom en uuid, voir UserController#uploadAvatar côté back) : l'URL renvoyée
 * change donc systématiquement, ce qui suffit à invalider le cache image sans paramètre
 * de cache-busting supplémentaire.
 */
export async function uploadAvatar(imageUri: string): Promise<User> {
  const formData = new FormData();
  formData.append('image', { uri: imageUri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
  const { data } = await apiClient.post<BackendUser>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return userFromBackend(data, API_BASE_URL);
}

/** DELETE /users/me existe désormais côté back, protégé par re-saisie du mot de passe. */
export async function deleteAccount(password: string): Promise<void> {
  await apiClient.delete('/users/me', { data: { motDePasse: password } });
}
