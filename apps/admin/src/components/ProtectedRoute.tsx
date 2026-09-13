import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';

/**
 * Route guard côté front (mission ADMIN.md §3, écran 1) : redirige vers /login sans
 * session admin valide. Défense en profondeur, pas la seule protection — chaque endpoint
 * /admin/* refuse déjà un membre/anonyme côté serveur (RoleGuard, voir API_CONTRACT.md §10).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth();

  if (state.status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Chargement…
      </div>
    );
  }

  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
