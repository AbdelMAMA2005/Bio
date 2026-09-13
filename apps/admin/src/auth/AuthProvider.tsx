import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdminMe } from '@planai/shared';
import { apiClient, ApiError, setUnauthorizedHandler } from '../api/client';
import { clearTokens, getAccessToken, setTokens } from '../api/auth-storage';

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
 * Session admin — réutilise POST /auth/login (pas de 2e système d'auth, voir
 * API_CONTRACT.md §10) puis confirme le rôle via GET /admin/me : un 'membre' authentifié
 * reçoit 403 sur /admin/me (RoleGuard), ce qui suffit à le refuser ici sans dupliquer la
 * logique de rôle côté front.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'checking' });

  const logout = () => {
    clearTokens();
    setState({ status: 'anonymous' });
  };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setState({ status: 'anonymous' });
      return;
    }
    apiClient
      .get<AdminMe>('/admin/me')
      .then((res) => setState({ status: 'authed', me: res.data }))
      .catch(() => {
        clearTokens();
        setState({ status: 'anonymous' });
      });
  }, []);

  const login = async (email: string, motDePasse: string) => {
    const { data } = await apiClient.post('/auth/login', { email, motDePasse });
    setTokens(data.accessToken, data.refreshToken);
    try {
      const me = await apiClient.get<AdminMe>('/admin/me');
      setState({ status: 'authed', me: me.data });
    } catch (err) {
      clearTokens();
      if (err instanceof ApiError && err.status === 403) {
        throw new ApiError("Ce compte n'a pas accès à la console admin.", 403);
      }
      throw err;
    }
  };

  const value = useMemo<AuthContextValue>(() => ({ state, login, logout }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return ctx;
}
