/**
 * Backend réel (apps/api, Abdel) : pas de préfixe /v1 (voir API_CONTRACT.md, en-tête).
 * À adapter selon l'environnement via EXPO_PUBLIC_API_URL (ex: EAS build) — la valeur
 * par défaut cible le serveur de dev local.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
