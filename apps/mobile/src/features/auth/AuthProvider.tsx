import type { User } from '@planai/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { clearSession, readSession, writeSession } from '@/features/auth/authStorage';
import {
  mockChangePassword,
  mockDeleteAccount,
  mockGoogleLogin,
  mockLogin,
  mockRegister,
  mockUpdateProfile,
} from '@/features/auth/mockAuthApi';
import { xpTargetForLevel } from '@/features/account/levels';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isBusy: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (pseudo: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'pseudo'>>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  addXp: (amount: number) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export async function restoreSession(): Promise<User | null> {
  const session = await readSession();
  return session?.user ?? null;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isBusy, setIsBusy] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isBusy,
      login: async (email, password) => {
        setIsBusy(true);
        try {
          const { token, user: loggedInUser } = await mockLogin(email, password);
          await writeSession({ token, user: loggedInUser });
          setUser(loggedInUser);
        } finally {
          setIsBusy(false);
        }
      },
      register: async (pseudo, email, password) => {
        setIsBusy(true);
        try {
          const { token, user: registeredUser } = await mockRegister(pseudo, email, password);
          await writeSession({ token, user: registeredUser });
          setUser(registeredUser);
        } finally {
          setIsBusy(false);
        }
      },
      loginWithGoogle: async () => {
        setIsBusy(true);
        try {
          const { token, user: googleUser } = await mockGoogleLogin();
          await writeSession({ token, user: googleUser });
          setUser(googleUser);
        } finally {
          setIsBusy(false);
        }
      },
      logout: async () => {
        await clearSession();
        setUser(null);
      },
      updateProfile: async (patch) => {
        await mockUpdateProfile(patch);
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...patch };
          readSession().then((session) => {
            if (session) writeSession({ ...session, user: next });
          });
          return next;
        });
      },
      changePassword: async (current, next) => {
        await mockChangePassword(current, next);
      },
      deleteAccount: async () => {
        await mockDeleteAccount();
        await clearSession();
        setUser(null);
      },
      addXp: (amount) => {
        setUser((prev) => {
          if (!prev) return prev;
          let xp = prev.xp + amount;
          let niveau = prev.niveau;
          let target = xpTargetForLevel(niveau);
          while (xp >= target) {
            xp -= target;
            niveau += 1;
            target = xpTargetForLevel(niveau);
          }
          const next = { ...prev, xp, niveau };
          readSession().then((session) => {
            if (session) writeSession({ ...session, user: next });
          });
          return next;
        });
      },
    }),
    [user, isBusy],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
