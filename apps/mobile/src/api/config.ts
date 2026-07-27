import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;

/**
 * "localhost" ne pointe vers la machine de dev que depuis le navigateur web :
 * sur device physique ou émulateur, il pointe vers l'appareil lui-même. On
 * dérive donc l'IP LAN à partir du hostUri que Metro utilise déjà pour le
 * hot-reload (fonctionne identiquement pour device physique et émulateur),
 * avec 10.0.2.2 comme repli pour l'émulateur Android si hostUri est absent
 * (ex. build standalone).
 */
function resolveDevApiUrl(): string {
  if (Platform.OS === 'web') return `http://localhost:${API_PORT}`;

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const lanHost = hostUri?.split(':')[0];
  if (lanHost) return `http://${lanHost}:${API_PORT}`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

/**
 * Backend réel (apps/api, Abdel) : pas de préfixe /v1 (voir API_CONTRACT.md, en-tête).
 * À adapter selon l'environnement via EXPO_PUBLIC_API_URL (ex: EAS build, ou pour
 * pointer explicitement vers une autre machine) — sinon détection automatique
 * par plateforme ci-dessus.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? resolveDevApiUrl();

/**
 * Bascule manuelle mock/réel pour les endpoints devenus disponibles côté back
 * (diagnostic, rappels, profil, badges) mais dont le serveur peut être
 * indisponible en dev (pas de Postgres lancé, offline, etc.). Les endpoints
 * encore réellement absents du back (quêtes, stories, /auth/google...)
 * restent mockés inconditionnellement, ce flag ne les concerne pas.
 */
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
