import * as SecureStore from 'expo-secure-store';
import type { User } from '@planai/shared';

const SESSION_KEY = 'planai.session';

export type StoredSession = {
  token: string;
  user: User;
};

export async function readSession(): Promise<StoredSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    // SecureStore has no web implementation: treat as "no session" instead of crashing boot.
    return null;
  }
}

export async function writeSession(session: StoredSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Not available on this platform (e.g. web) — session won't persist across reloads.
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Not available on this platform (e.g. web).
  }
}
