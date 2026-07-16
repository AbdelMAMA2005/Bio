import type { User } from '@planai/shared';

import { currentUser } from '@/api/mock/store';

function wait<T>(value: T, ms = 700): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function makeToken(): string {
  return `mock-token-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

export async function mockLogin(email: string, password: string) {
  if (!email.includes('@') || password.length < 4) {
    throw new Error('invalid-credentials');
  }
  // Compte de démonstration : renvoie le profil pré-rempli pour que Jardin/Herbarium/Feed aient du contenu.
  const user: User = { ...currentUser, email };
  return wait({ token: makeToken(), user }, 800);
}

export async function mockRegister(pseudo: string, email: string, password: string) {
  if (!pseudo.trim() || !email.includes('@') || password.length < 4) {
    throw new Error('invalid-fields');
  }
  const user: User = { id: `user-${Date.now()}`, pseudo, email, niveau: 1, xp: 0 };
  return wait({ token: makeToken(), user }, 900);
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
