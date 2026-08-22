import type { User } from '@planai/shared';

import { userFromBackend, type BackendUser } from '@/api/adapters';
import { apiClient } from '@/api/client';

type LoginResponse = { accessToken: string; user: BackendUser; needsUsername?: boolean };

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, motDePasse: password });
  return { token: data.accessToken, user: userFromBackend(data.user) };
}

export async function loginWithGoogle(idToken: string): Promise<{ token: string; user: User; needsUsername: boolean }> {
  const { data } = await apiClient.post<LoginResponse>('/auth/google', { idToken });
  return { token: data.accessToken, user: userFromBackend(data.user), needsUsername: data.needsUsername ?? !data.user.username };
}

export async function setUsername(username: string): Promise<User> {
  const { data } = await apiClient.patch<BackendUser>('/users/me/username', { username });
  return userFromBackend(data);
}

export async function register(fullName: string, username: string, email: string, password: string): Promise<{ token: string; user: User }> {
  await apiClient.post<BackendUser>('/auth/register', {
    email,
    fullName,
    username,
    motDePasse: password,
  });
  return login(email, password);
}

export async function fetchProfile(): Promise<User> {
  const { data } = await apiClient.get<BackendUser>('/users/me');
  return userFromBackend(data);
}

export async function updateProfile(patch: Partial<Pick<User, 'email' | 'fullName'>>): Promise<User> {
  const { data } = await apiClient.patch<BackendUser>('/users/me', {
    email: patch.email,
    fullName: patch.fullName,
  });
  return userFromBackend(data);
}

export async function deleteAccount(password: string): Promise<void> {
  await apiClient.delete('/users/me', { data: { motDePasse: password } });
}

export async function checkUsernameAvailability(query: string): Promise<{ available: boolean; suggestions: string[] }> {
  const { data } = await apiClient.get<{ available: boolean; suggestions: string[] }>('/users/check-username', { params: { q: query } });
  return data;
}

export async function getSuggestions(fullName: string): Promise<{ suggestions: string[] }> {
  const { data } = await apiClient.get<{ suggestions: string[] }>(`/users/suggestions/${encodeURIComponent(fullName)}`);
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', { email, token, newPassword });
  return data;
}

export async function uploadAvatar(imageUri: string): Promise<User> {
  const formData = new FormData();
  formData.append('image', { uri: imageUri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
  const { data } = await apiClient.post<BackendUser>('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return userFromBackend(data);
}