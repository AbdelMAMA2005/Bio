/**
 * baseURL configurable par variable d'environnement (mission ADMIN.md §1) — voir
 * `.env.example` à la racine de apps/admin. `http://localhost:3000` par défaut pour un
 * dev local classique (API sur l'hôte ou via Docker, voir DOCKER.md).
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
