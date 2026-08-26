import type { User } from '@planai/shared';

function wait<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockChangePassword(_current: string, next: string) {
  if (next.length < 4) throw new Error('invalid-password');
  return wait({ success: true }, 700);
}

export async function mockUpdateProfile(patch: Partial<Pick<User, 'pseudo' | 'fullName' | 'email'>>) {
  return wait(patch, 500);
}

export async function mockDeleteAccount() {
  return wait({ success: true }, 800);
}
