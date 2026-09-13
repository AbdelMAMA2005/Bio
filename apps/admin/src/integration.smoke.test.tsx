import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

/**
 * Test d'intégration RÉEL (pas de mock) : rend l'app complète et parle au VRAI backend
 * (voir vite.config.ts, `environmentOptions.jsdom.url` posé à l'origine du serveur dev
 * pour que le CORS dev — apps/api/src/main.ts, `devLanOrigin` — laisse passer la requête
 * comme un vrai navigateur le ferait).
 *
 * AUCUN identifiant en dur ici (ç'a été l'erreur lors de l'écriture initiale de ce fichier,
 * corrigée avant tout commit — voir rapport.md) : un compte admin de test doit être créé
 * manuellement (POST /auth/register puis promotion role='admin' en base, voir rapport.md
 * §Vérification) et ses identifiants fournis via variables d'environnement
 * VITE_SMOKE_ADMIN_EMAIL / VITE_SMOKE_ADMIN_PASSWORD (voir .env.example). Sans ces
 * variables (cas par défaut), ou si l'API n'est pas démarrée, le test s'ignore
 * silencieusement plutôt que d'échouer toute la suite.
 */
const API_URL = 'http://localhost:3000';
const TEST_EMAIL = import.meta.env.VITE_SMOKE_ADMIN_EMAIL as string | undefined;
const TEST_PASSWORD = import.meta.env.VITE_SMOKE_ADMIN_PASSWORD as string | undefined;

async function apiIsUp(): Promise<boolean> {
  try {
    const res = await fetch(API_URL, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Intégration réelle — connexion + tableau de bord', () => {
  it('se connecte pour de vrai, atteint le tableau de bord, et affiche des données réelles', async () => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      console.warn(
        '[smoke] VITE_SMOKE_ADMIN_EMAIL/VITE_SMOKE_ADMIN_PASSWORD non fournies — test ignoré (voir .env.example).',
      );
      return;
    }
    if (!(await apiIsUp())) {
      console.warn('[smoke] apps/api indisponible sur ' + API_URL + ' — test ignoré.');
      return;
    }

    localStorage.clear();
    render(<App />);

    // Écran 1 : connexion.
    await screen.findByText('Connexion');
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), TEST_EMAIL);
    await userEvent.type(screen.getByLabelText('Mot de passe'), TEST_PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    // Écran 2 : tableau de bord — vraies données lues depuis Postgres via l'API.
    await waitFor(() => expect(screen.getByText('Tableau de bord')).toBeInTheDocument(), {
      timeout: 10_000,
    });
    await waitFor(() => expect(screen.getByText('Utilisateurs actifs')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Santé des services')).toBeInTheDocument());
    // Au moins un service de santé réellement pingé doit apparaître (API NestJS toujours "OK").
    expect(await screen.findByText('API NestJS')).toBeInTheDocument();

    // Navigation réelle vers Utilisateurs (le compte de test doit s'y trouver).
    await userEvent.click(screen.getByRole('link', { name: /utilisateurs/i }));
    await waitFor(() => expect(screen.getByText(TEST_EMAIL)).toBeInTheDocument(), { timeout: 10_000 });

    // Déconnexion réelle.
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    await waitFor(() => expect(screen.getByText('Connexion')).toBeInTheDocument());
  }, 30_000);
});
