import type { User } from '@planai/shared';

import { currentUser } from '@/api/mock/store';

function wait<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function makeToken(): string {
  return `mock-token-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export async function mockGoogleLogin() {
  const user: User = { ...currentUser, email: 'lea.fontaine@gmail.com' };
  return wait({ token: makeToken(), user }, 1100);
}

export async function mockChangePassword(_current: string, next: string) {
  if (next.length < 4) throw new Error('invalid-password');
  return wait({ success: true }, 700);
}

export async function mockUpdateProfile(patch: Partial<Pick<User, 'pseudo'>>) {
  return wait(patch, 500);
}

export async function mockDeleteAccount() {
  return wait({ success: true }, 800);
}
