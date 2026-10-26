import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

/**
 * Test d'intégration RÉEL (pas de mock) : rend l'app complète et parle au vrai projet
 * Supabase (VITE_SUPABASE_URL). Aucun identifiant en dur : un compte de test ayant le
 * rôle admin doit être fourni via VITE_SMOKE_ADMIN_EMAIL / VITE_SMOKE_ADMIN_PASSWORD
 * (voir .env.example). Sans ces variables, ou si Supabase est injoignable, le test
 * s'ignore plutôt que d'échouer toute la suite.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const TEST_EMAIL = import.meta.env.VITE_SMOKE_ADMIN_EMAIL;
const TEST_PASSWORD = import.meta.env.VITE_SMOKE_ADMIN_PASSWORD;

async function supabaseIsUp(): Promise<boolean> {
  if (!SUPABASE_URL) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Intégration réelle : connexion + tableau de bord', () => {
  it('se connecte pour de vrai, atteint le tableau de bord, et affiche des données réelles', async () => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.warn(
        '[smoke] VITE_SMOKE_ADMIN_EMAIL/VITE_SMOKE_ADMIN_PASSWORD non fournies : test ignoré (voir .env.example).',
      );
      return;
    }
    if (!(await supabaseIsUp())) {
      console.warn('[smoke] Supabase injoignable (projet en pause ou VITE_SUPABASE_URL absente) : test ignoré.');
      return;
    }

    localStorage.clear();
    render(<App />);

    // Écran 1 : connexion.
    await screen.findByText('Connexion');
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), TEST_EMAIL);
    await userEvent.type(screen.getByLabelText('Mot de passe'), TEST_PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    // Écran 2 : tableau de bord, avec les vraies données de Supabase.
    await waitFor(() => expect(screen.getByText('Tableau de bord')).toBeInTheDocument(), {
      timeout: 10_000,
    });
    await waitFor(() => expect(screen.getByText('Utilisateurs actifs')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Santé des services')).toBeInTheDocument());
    // La base est interrogée à chaque chargement : son état apparaît toujours.
    expect(await screen.findByText('Base de données')).toBeInTheDocument();

    // Navigation réelle vers Utilisateurs (le compte de test doit s'y trouver).
    await userEvent.click(screen.getByRole('link', { name: /utilisateurs/i }));
    await waitFor(() => expect(screen.getByText(TEST_EMAIL)).toBeInTheDocument(), { timeout: 10_000 });

    // Déconnexion réelle.
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    await waitFor(() => expect(screen.getByText('Connexion')).toBeInTheDocument());
  }, 30_000);
});
