import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';

vi.mock('../auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

function setup(login = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({ state: { status: 'anonymous' }, login, logout: vi.fn() });
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('appelle login avec l’e-mail et le mot de passe saisis', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    setup(login);

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'djawad@planai.app');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(login).toHaveBeenCalledWith('djawad@planai.app', 'motdepasse');
  });

  it('affiche un message d’erreur si la connexion échoue (ex: 403, rôle insuffisant)', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError("Ce compte n'a pas accès à la console admin.", 403));
    setup(login);

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'membre@planai.app');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByText("Ce compte n'a pas accès à la console admin.")).toBeInTheDocument();
  });

  it('bascule la visibilité du mot de passe', async () => {
    setup();
    const input = screen.getByLabelText('Mot de passe') as HTMLInputElement;
    expect(input.type).toBe('password');

    await userEvent.click(screen.getByLabelText('Afficher le mot de passe'));

    expect(input.type).toBe('text');
  });
});
