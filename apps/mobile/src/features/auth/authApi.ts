import type { User } from '@planai/shared';

import { userFromBackend, type BackendUser } from '@/api/adapters';
import { apiClient } from '@/api/client';

type LoginResponse = { accessToken: string; user: BackendUser };

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, motDePasse: password });
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
