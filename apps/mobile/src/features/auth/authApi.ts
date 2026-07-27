import type { User } from '@planai/shared';

import { userFromBackend, type BackendUser } from '@/api/adapters';
import { apiClient } from '@/api/client';

type LoginResponse = { accessToken: string; user: BackendUser };

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, motDePasse: password });
  return { token: data.accessToken, user: userFromBackend(data.user) };
}

/**
 * POST /auth/google : le back vérifie le idToken Google (audience = GOOGLE_CLIENT_ID)
 * et crée le compte au premier login (voir apps/api/src/modules/auth/auth.service.ts).
 */
export async function loginWithGoogle(idToken: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/google', { idToken });
  return { token: data.accessToken, user: userFromBackend(data.user) };
}

/**
 * POST /auth/register ne renvoie pas de token (voir API_CONTRACT.md §1) : on enchaîne
 * un login juste après pour connecter l'utilisateur immédiatement, comme le veut le
 * flux front existant.
 */
export async function register(pseudo: string, email: string, password: string): Promise<{ token: string; user: User }> {
  await apiClient.post<BackendUser>('/auth/register', {
    email,
    nomUtilisateur: pseudo,
    motDePasse: password,
  });
  return login(email, password);
}

/**
 * GET /users/me — relit le profil réel (XP/pièces/niveau à jour), utilisé après
 * toute action susceptible de créditer XP/pièces côté back sans que le front
 * en ait déjà la valeur exacte (ex. défis quotidiens, voir useQuests()).
 */
export async function fetchProfile(): Promise<User> {
  const { data } = await apiClient.get<BackendUser>('/users/me');
  return userFromBackend(data);
}

/** PATCH /users/me existe désormais côté back (voir API_CONTRACT.md §2). */
export async function updateProfile(patch: Partial<Pick<User, 'pseudo'>>): Promise<User> {
  const { data } = await apiClient.patch<BackendUser>('/users/me', {
    nomUtilisateur: patch.pseudo,
  });
  return userFromBackend(data);
}

/** DELETE /users/me existe désormais côté back, protégé par re-saisie du mot de passe. */
export async function deleteAccount(password: string): Promise<void> {
  await apiClient.delete('/users/me', { data: { motDePasse: password } });
}
