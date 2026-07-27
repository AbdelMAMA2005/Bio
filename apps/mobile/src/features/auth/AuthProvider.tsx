import type { User } from '@planai/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setAuthToken } from '@/api/authToken';
import { setUnauthorizedHandler } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';
import { clearSession, readSession, writeSession } from '@/features/auth/authStorage';
import {
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginWithGoogle,
  updateProfile as apiUpdateProfile,
  deleteAccount as apiDeleteAccount,
  fetchProfile as apiFetchProfile,
} from '@/features/auth/authApi';
import { mockChangePassword, mockDeleteAccount, mockUpdateProfile } from '@/features/auth/mockAuthApi';
import { xpTargetForLevel } from '@/features/account/levels';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isBusy: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (pseudo: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'pseudo'>>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  addXp: (amount: number) => void;
  /**
   * Relit /users/me et remplace l'état local par la vérité serveur — utilisé
   * après toute action dont le crédit XP/pièces est décidé côté back sans que
   * le front connaisse déjà le montant exact (ex. défis quotidiens complétés).
   */
  refreshUser: () => Promise<void>;
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

  useEffect(() => {
    // Pas de refresh token côté back : sur 401, on déconnecte — le route guard de
    // _layout.tsx renvoie alors automatiquement vers l'écran de connexion.
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      clearSession();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
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
      loginWithGoogle: async (idToken) => {
        setIsBusy(true);
        try {
          const { token, user: googleUser } = await apiLoginWithGoogle(idToken);
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
        // PATCH /users/me existe désormais côté back (API_CONTRACT.md §2), repli mock
        // activable via EXPO_PUBLIC_USE_MOCK_API.
        if (USE_MOCK_API) {
          await mockUpdateProfile(patch);
        } else {
          await apiUpdateProfile(patch);
        }
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
      deleteAccount: async (password) => {
        // DELETE /users/me existe désormais côté back, protégé par re-saisie du mot de
        // passe (API_CONTRACT.md §2), repli mock activable via EXPO_PUBLIC_USE_MOCK_API.
        if (USE_MOCK_API) {
          await mockDeleteAccount();
        } else {
          await apiDeleteAccount(password);
        }
        setAuthToken(null);
        await clearSession();
        setUser(null);
      },
      refreshUser: async () => {
        // Pas de session active (mock/tests, ou 401 déjà géré ailleurs) : rien à
        // rafraîchir plutôt que d'échouer.
        if (!user) return;
        try {
          const fresh = await apiFetchProfile();
          setUser(fresh);
          readSession().then((session) => {
            if (session) writeSession({ ...session, user: fresh });
          });
        } catch {
          // Le prochain accès normal à l'API remontera l'erreur (401, réseau…) via
          // le mécanisme habituel — un simple refresh en arrière-plan ne doit pas
          // faire planter l'écran appelant.
        }
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
