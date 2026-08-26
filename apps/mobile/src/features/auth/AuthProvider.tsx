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
  checkUsernameAvailability as apiCheckUsernameAvailability,
  getSuggestions as apiGetSuggestions,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  setUsername as apiSetUsername,
  uploadAvatar as apiUploadAvatar,
} from '@/features/auth/authApi';
import { mockChangePassword, mockDeleteAccount, mockUpdateProfile } from '@/features/auth/mockAuthApi';
import { xpTargetForLevel } from '@/features/account/levels';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isBusy: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, username: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  setUsername: (username: string) => Promise<void>;
  uploadAvatar: (imageUri: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'email' | 'fullName'>>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<{ available: boolean; suggestions: string[] }>;
  getSuggestions: (fullName: string) => Promise<{ suggestions: string[] }>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<{ message: string }>;
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
      register: async (fullName, username, email, password) => {
        setIsBusy(true);
        try {
          const { token, user: registeredUser } = await apiRegister(fullName, username, email, password);
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
          const { token, user: googleUser, needsUsername } = await apiLoginWithGoogle(idToken);
          setAuthToken(token);
          await writeSession({ token, user: googleUser });
          setUser(googleUser);
          return needsUsername;
        } finally {
          setIsBusy(false);
        }
      },
      setUsername: async (username) => {
        const updated = await apiSetUsername(username);
        setUser(updated);
        const session = await readSession();
        if (session) await writeSession({ ...session, user: updated });
      },
      uploadAvatar: async (imageUri) => {
        const updated = await apiUploadAvatar(imageUri);
        setUser(updated);
        const session = await readSession();
        if (session) await writeSession({ ...session, user: updated });
      },
      logout: async () => {
        setAuthToken(null);
        await clearSession();
        setUser(null);
      },
      updateProfile: async (patch) => {
        // PATCH /users/me existe désormais côté back (API_CONTRACT.md §2), repli mock
        // activable via EXPO_PUBLIC_USE_MOCK_API.
        let updated: User;
        if (USE_MOCK_API) {
          await mockUpdateProfile(patch);
          updated = { ...user!, ...patch };
        } else {
          updated = await apiUpdateProfile(patch);
        }
        setUser((prev) => {
          if (!prev) return prev;
          readSession().then((session) => {
            if (session) writeSession({ ...session, user: updated });
          });
          return updated;
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
      checkUsernameAvailability: async (username) => {
        return apiCheckUsernameAvailability(username);
      },
      getSuggestions: async (fullName) => {
        return apiGetSuggestions(fullName);
      },
      forgotPassword: async (email) => {
        return apiForgotPassword(email);
      },
      resetPassword: async (email, token, newPassword) => {
        return apiResetPassword(email, token, newPassword);
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
