import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminMe } from '@planai/shared';
import { ApiError, rpc, supabase, toApiError } from '../api/client';

type AuthState =
  | { status: 'checking' }
  | { status: 'authed'; me: AdminMe }
  | { status: 'anonymous' };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session admin : connexion Supabase Auth (même compte que l'app mobile), puis
 * confirmation du rôle via la RPC admin_me(), qui refuse (42501) tout compte qui n'est
 * ni admin ni modérateur. Le rôle n'est donc jamais décidé côté navigateur.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'checking' });

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    setState({ status: 'anonymous' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        if (!cancelled) setState({ status: 'anonymous' });
        return;
      }
      try {
        const me = await rpc<AdminMe>('admin_me');
        if (!cancelled) setState({ status: 'authed', me });
      } catch {
        await supabase.auth.signOut();
        if (!cancelled) setState({ status: 'anonymous' });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setState({ status: 'anonymous' });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    if (error) throw toApiError(error, 'Connexion impossible.');
    try {
      const me = await rpc<AdminMe>('admin_me');
      setState({ status: 'authed', me });
    } catch (err) {
      await supabase.auth.signOut();
      if (err instanceof ApiError && err.status === 403) {
        throw new ApiError("Ce compte n'a pas accès à la console admin.", 403);
      }
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}
