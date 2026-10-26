import type { User } from '@planai/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import {
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginWithGoogle,
  updateProfile as apiUpdateProfile,
  uploadAvatar as apiUploadAvatar,
  deleteAccount as apiDeleteAccount,
  fetchProfile as apiFetchProfile,
  logout as apiLogout,
  changePassword as apiChangePassword,
} from '@/features/auth/authApi';
import { xpTargetForLevel } from '@/features/account/levels';
import { getSafeSession, supabase } from '@/lib/supabase';

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
   * Remplace la photo de profil (bucket `avatars`). Met à jour `user` immédiatement
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
   * après toute action dont le crédit XP/pièces est décidé par la base sans que
   * le front connaisse déjà le montant exact (ex. défis quotidiens complétés).
   */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export async function restoreSession(): Promise<User | null> {
  const session = await getSafeSession();
  if (!session) return null;
  try {
    const profile = await apiFetchProfile();
    return profile;
  } catch (error) {
    console.error('[restoreSession] Supabase profile error', error);
    return null;
  }
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
    let active = true;
    let revision = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentRevision = ++revision;
      clearTimeout(pending);
      if (!session) {
        setUser(null);
        return;
      }
      // Run outside the auth callback, and ignore a response from an old session.
      pending = setTimeout(() => {
        void apiFetchProfile()
          .then((profile) => {
            if (active && revision === currentRevision) setUser(profile);
          })
          .catch((error) => {
            console.error('[AuthProvider] Supabase profile error', error);
            if (active && revision === currentRevision) setUser(null);
          });
      }, 0);
    });
    return () => {
      active = false;
      clearTimeout(pending);
      data.subscription.unsubscribe();
    };
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
          void token;
          void refreshToken;
          setUser(loggedInUser);
        } finally {
          setIsBusy(false);
        }
      },
      register: async (pseudo, email, password) => {
        setIsBusy(true);
        try {
          const { token, refreshToken, user: registeredUser } = await apiRegister(pseudo, email, password);
          void token;
          void refreshToken;
          setUser(registeredUser);
        } finally {
          setIsBusy(false);
        }
      },
      loginWithGoogle: async (idToken) => {
        setIsBusy(true);
        try {
          const { token, refreshToken, user: googleUser } = await apiLoginWithGoogle(idToken);
          void token;
          void refreshToken;
          setUser(googleUser);
        } finally {
          setIsBusy(false);
        }
      },
      logout: async () => {
        // Révocation de la session best-effort : la déconnexion locale a
        // lieu dans tous les cas, même si le serveur est injoignable — sinon un utilisateur
        // hors-ligne ne pourrait jamais se déconnecter.
        try {
          await apiLogout();
        } finally {
          setUser(null);
        }
      },
      updateProfile: async (patch) => {
        await apiUpdateProfile(patch);
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...patch };
          return next;
        });
      },
      updateAvatar: async (imageUri) => {
        setIsBusy(true);
        try {
          const fresh = await apiUploadAvatar(imageUri);
          setUser(fresh);
          // Le feed/les stories déjà en cache portent un instantané de l'ancien
          // urlAvatar (résolu au moment de leur propre lecture) — sans cette
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
        await apiChangePassword(current, next);
      },
      deleteAccount: async (password) => {
        // RPC delete_my_account, après vérification du mot de passe (authApi.deleteAccount).
        await apiDeleteAccount(password);
        await apiLogout().catch(() => undefined);
        setUser(null);
      },
      refreshUser: async () => {
        // Pas de session active (mock/tests, ou 401 déjà géré ailleurs) : rien à
        // rafraîchir plutôt que d'échouer.
        if (!user) return;
        try {
          const fresh = await apiFetchProfile();
          setUser(fresh);
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
