import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const API_PORT = 3000;

/**
 * "localhost" ne pointe vers la machine de dev que depuis le navigateur web :
 * sur device physique ou émulateur, il pointe vers l'appareil lui-même. On
 * dérive donc l'IP LAN de la machine de dev depuis l'URL du bundle JS
 * (NativeModules.SourceCode.scriptURL, ex. "http://192.168.1.27:8081/...") —
 * c'est la seule source fiable dans TOUS les cas (Expo Go, dev-client lancé
 * via deep link direct, dev-client lancé par `expo run:android`), car elle
 * vient directement de la connexion Metro établie, contrairement à
 * Constants.expoConfig.hostUri qui suppose un manifest EAS Update/Expo Go et
 * reste undefined pour un dev-client ouvert via un lien exp+scheme:// manuel
 * (constaté en debug device physique, 11/09/2026 — hostUri undefined alors
 * que scriptURL est toujours renseigné). hostUri/debuggerHost gardés en repli,
 * 10.0.2.2 en dernier recours pour l'émulateur Android sans aucune des deux.
 */
function resolveDevApiUrl(): string {
  if (Platform.OS === 'web') return `http://localhost:${API_PORT}`;

  // Pas de `new URL(...)` : Hermes n'expose pas l'API URL sans polyfill dédié
  // (react-native-url-polyfill, absent du projet) — extraction du host à la main.
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  const scriptHost = scriptURL?.replace(/^[a-z]+:\/\//i, '').split(/[/:]/)[0];

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const lanHost = scriptHost ?? hostUri?.split(':')[0];
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
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || resolveDevApiUrl();

/**
 * Bascule manuelle mock/réel pour les endpoints devenus disponibles côté back
 * (diagnostic, rappels, profil, badges) mais dont le serveur peut être
 * indisponible en dev (pas de Postgres lancé, offline, etc.). Les endpoints
 * encore réellement absents du back (quêtes, stories, /auth/google...)
 * restent mockés inconditionnellement, ce flag ne les concerne pas.
 */
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
