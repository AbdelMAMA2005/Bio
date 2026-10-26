import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

/**
 * Variante native (iOS/Android — Metro résout ce fichier automatiquement, voir
 * googleAuth.web.ts pour la cible web) : le SDK natif Google Sign-In est désormais
 * la méthode recommandée par Expo (expo-auth-session/providers/google est marqué
 * @deprecated dans les types installés — voir AGENTS.md, "Expo HAS CHANGED").
 *
 * Nécessite un build de développement (EAS ou `expo run:ios`/`run:android`) : ce
 * module natif ne fonctionne PAS dans Expo Go — `TurboModuleRegistry.getEnforcing`
 * lève à l'évaluation du module ET cette invariant violation traverse un `try/catch`
 * JS normal autour du `require()` (testé en réel dans Expo Go : toujours remontée
 * comme "Uncaught Error" malgré le catch). La seule protection fiable est donc de ne
 * JAMAIS appeler `require()` sur ce module tant qu'on tourne dans Expo Go — détecté
 * via `Constants.executionEnvironment === ExecutionEnvironment.StoreClient` — plutôt
 * que de compter sur un catch pour absorber l'échec après coup.
 *
 * `webClientId` est le client OAuth "Application Web" — c'est TOUJOURS lui qui
 * apparaît comme audience du idToken renvoyé, même sur iOS/Android (le
 * iosClientId/package Android+SHA-1 ne servent qu'à l'écran de consentement natif,
 * jamais à l'audience du token) : Supabase Auth n'a donc besoin de vérifier
 * qu'un seul GOOGLE_CLIENT_ID, celui-ci.
 */
const runningInExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cachedModule: GoogleSigninModule | null | undefined;
function loadGoogleSignin(): GoogleSigninModule | null {
  if (runningInExpoGo) return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    cachedModule = null; // module natif absent/mal lié — dégradé, pas fatal.
  }
  return cachedModule;
}

let configured = false;
function ensureConfigured(mod: GoogleSigninModule) {
  if (configured) return;
  mod.GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID || undefined,
  });
  configured = true;
}

export function useGoogleSignIn(): { isConfigured: boolean; signIn: () => Promise<string | null> } {
  const envConfigured = Platform.OS === 'ios' ? !!(WEB_CLIENT_ID && IOS_CLIENT_ID) : !!WEB_CLIENT_ID;
  const mod = envConfigured ? loadGoogleSignin() : null;
  const isConfigured = envConfigured && mod !== null;

  useEffect(() => {
    if (mod) ensureConfigured(mod);
  }, [mod]);

  const signIn = async (): Promise<string | null> => {
    if (!mod) {
      throw new Error('Google Sign-In indisponible (nécessite un build de développement, absent dans Expo Go).');
    }
    // Configure synchronously too: a tap can arrive before the effect runs.
    ensureConfigured(mod);
    if (Platform.OS === 'android') {
      await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await mod.GoogleSignin.signIn();
    if (!mod.isSuccessResponse(response)) return null; // annulé par l'utilisateur

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In n\'a renvoyé aucun idToken (vérifier webClientId).');
    }
    return idToken;
  };

  return { isConfigured, signIn };
}
