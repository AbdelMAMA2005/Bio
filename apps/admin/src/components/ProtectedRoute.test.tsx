import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../auth/AuthProvider';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

function renderWithState(status: 'checking' | 'anonymous' | 'authed') {
  vi.mocked(useAuth).mockReturnValue({
    state:
      status === 'authed'
        ? { status: 'authed', me: { id: '1', nomUtilisateur: 'Djawad', email: 'a@a.com', role: 'admin' } }
        : { status },
    login: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Page de connexion</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Contenu protégé</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it("affiche un état de chargement pendant la vérification de session", () => {
    renderWithState('checking');
    expect(screen.getByText('Chargement…')).toBeInTheDocument();
  });

  it('redirige vers /login sans session valide', () => {
    renderWithState('anonymous');
    expect(screen.getByText('Page de connexion')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  it('affiche le contenu protégé pour une session admin valide', () => {
    renderWithState('authed');
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });
});
