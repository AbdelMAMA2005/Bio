import type { User } from '@planai/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setAuthToken } from '@/api/authToken';
import { clearSession, readSession, writeSession } from '@/features/auth/authStorage';
import { login as apiLogin, register as apiRegister } from '@/features/auth/authApi';
import {
  mockChangePassword,
  mockDeleteAccount,
  mockGoogleLogin,
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

  useEffect(() => {
    // Le client HTTP ne garde le token qu'en mémoire : on le réhydrate depuis
    // SecureStore au boot (initialUser seul ne suffit pas à authentifier les requêtes).
    readSession().then((session) => {
      if (session) setAuthToken(session.token);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isBusy,
      login: async (email, password) => {
        setIsBusy(true);
        try {
          const { token, user: loggedInUser } = await apiLogin(email, password);
          setAuthToken(token);
          await writeSession({ token, user: loggedInUser });
          setUser(loggedInUser);
        } finally {
          setIsBusy(false);
        }
      },
      register: async (pseudo, email, password) => {
        setIsBusy(true);
        try {
          const { token, user: registeredUser } = await apiRegister(pseudo, email, password);
          setAuthToken(token);
          await writeSession({ token, user: registeredUser });
          setUser(registeredUser);
        } finally {
          setIsBusy(false);
        }
      },
      loginWithGoogle: async () => {
        setIsBusy(true);
        try {
          // Pas d'endpoint POST /auth/google côté back — reste mocké (BACKEND_ISSUES.md §6).
          const { token, user: googleUser } = await mockGoogleLogin();
          setAuthToken(token);
          await writeSession({ token, user: googleUser });
          setUser(googleUser);
        } finally {
          setIsBusy(false);
        }
      },
      logout: async () => {
        setAuthToken(null);
        await clearSession();
        setUser(null);
      },
      updateProfile: async (patch) => {
        // Pas d'endpoint PATCH /users/me côté back — reste mocké (BACKEND_ISSUES.md §6).
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
        // Pas d'endpoint POST /auth/change-password côté back — reste mocké (BACKEND_ISSUES.md §6).
        await mockChangePassword(current, next);
      },
      deleteAccount: async () => {
        // Pas d'endpoint DELETE /auth/account côté back — reste mocké (BACKEND_ISSUES.md §6).
        await mockDeleteAccount();
        setAuthToken(null);
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
