import type { User } from '@planai/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getRefreshToken, setAuthToken, setRefreshToken } from '@/api/authToken';
import { setRefreshHandler, setUnauthorizedHandler } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { clearSession, readSession, writeSession } from '@/features/auth/authStorage';
import {
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginWithGoogle,
  updateProfile as apiUpdateProfile,
  uploadAvatar as apiUploadAvatar,
  deleteAccount as apiDeleteAccount,
  fetchProfile as apiFetchProfile,
  refreshAccessToken as apiRefreshAccessToken,
  logout as apiLogout,
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
  /**
   * POST /users/me/avatar — remplace la photo de profil. Met à jour `user` immédiatement
   * (affichage partout dans l'app) ET invalide les caches react-query dont des entrées
   * portent un instantané de l'ancien avatar (feed, stories) pour qu'elles se rafraîchissent
   * elles aussi, pas seulement les écrans qui lisent `user` directement.
   */
  updateAvatar: (imageUri: string) => Promise<void>;
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
    // Le client HTTP ne garde les tokens qu'en mémoire : on les réhydrate depuis
    // SecureStore au boot (initialUser seul ne suffit pas à authentifier les requêtes).
    readSession().then((session) => {
      if (session) {
        setAuthToken(session.token);
        setRefreshToken(session.refreshToken);
      }
    });
  }, []);

  useEffect(() => {
    // Dernier recours : session vraiment invalide (refresh token lui-même expiré/révoqué,
    // ou absent) — le route guard de _layout.tsx renvoie alors vers l'écran de connexion.
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      setRefreshToken(null);
      clearSession();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    // Renouvellement silencieux (POST /auth/refresh, voir client.ts) : appelé par le
    // client HTTP sur un 401, avant d'abandonner et de déclencher onUnauthorized.
    setRefreshHandler(async () => {
      const currentRefreshToken = getRefreshToken();
      if (!currentRefreshToken) return null;
      try {
        const { accessToken, refreshToken: newRefreshToken } = await apiRefreshAccessToken(currentRefreshToken);
        setAuthToken(accessToken);
        setRefreshToken(newRefreshToken);
        const session = await readSession();
        if (session) await writeSession({ ...session, token: accessToken, refreshToken: newRefreshToken });
        return accessToken;
      } catch {
        return null;
      }
    });
    return () => setRefreshHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isBusy,
      login: async (email, password) => {
        setIsBusy(true);
        try {
          const { token, refreshToken, user: loggedInUser } = await apiLogin(email, password);
          setAuthToken(token);
          setRefreshToken(refreshToken);
          await writeSession({ token, refreshToken, user: loggedInUser });
          setUser(loggedInUser);
        } finally {
          setIsBusy(false);
        }
      },
      register: async (pseudo, email, password) => {
        setIsBusy(true);
        try {
          const { token, refreshToken, user: registeredUser } = await apiRegister(pseudo, email, password);
          setAuthToken(token);
          setRefreshToken(refreshToken);
          await writeSession({ token, refreshToken, user: registeredUser });
          setUser(registeredUser);
        } finally {
          setIsBusy(false);
        }
      },
      loginWithGoogle: async (idToken) => {
        setIsBusy(true);
        try {
          const { token, refreshToken, user: googleUser } = await apiLoginWithGoogle(idToken);
          setAuthToken(token);
          setRefreshToken(refreshToken);
          await writeSession({ token, refreshToken, user: googleUser });
          setUser(googleUser);
        } finally {
          setIsBusy(false);
        }
      },
      logout: async () => {
        // Révocation côté back best-effort (API_CONTRACT.md §1) : la déconnexion locale a
        // lieu dans tous les cas, même si le serveur est injoignable — sinon un utilisateur
        // hors-ligne ne pourrait jamais se déconnecter.
        const currentRefreshToken = getRefreshToken();
        if (currentRefreshToken) {
          apiLogout(currentRefreshToken).catch(() => undefined);
        }
        setAuthToken(null);
        setRefreshToken(null);
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
      updateAvatar: async (imageUri) => {
        setIsBusy(true);
        try {
          const fresh = await apiUploadAvatar(imageUri);
          setUser(fresh);
          const session = await readSession();
          if (session) await writeSession({ ...session, user: fresh });
          // Le feed/les stories déjà en cache portent un instantané de l'ancien
          // urlAvatar (résolu au moment de leur propre fetch) — sans cette
          // invalidation, la nouvelle photo n'apparaîtrait qu'aux endroits qui
          // lisent `user` directement (Mon Jardin, Scan, Compte), pas dans les
          // publications/stories déjà affichées.
          queryClient.invalidateQueries({ queryKey: queryKeys.feed });
          queryClient.invalidateQueries({ queryKey: queryKeys.stories });
        } finally {
          setIsBusy(false);
        }
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
        setRefreshToken(null);
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
