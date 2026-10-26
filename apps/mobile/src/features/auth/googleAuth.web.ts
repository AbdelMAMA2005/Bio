import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * Variante web (Metro résout ce fichier automatiquement pour la cible web, voir
 * googleAuth.native.ts pour iOS/Android) : flux OAuth implicite classique via popup
 * navigateur, valable sur web (contrairement au natif, Google n'exige pas le SDK
 * natif ici). Supabase Auth (signInWithIdToken) vérifie ce idToken directement.
 */
export function useGoogleSignIn(): { isConfigured: boolean; signIn: () => Promise<string | null> } {
  const redirectUri = AuthSession.makeRedirectUri();
  const nonce = useMemo(() => Crypto.randomUUID(), []);

  const [, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: WEB_CLIENT_ID || 'not-configured',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce },
    },
    discovery,
  );

  const signIn = async (): Promise<string | null> => {
    const result = await promptAsync();
    if (result.type !== 'success') return null; // annulé/dismiss
    return result.params.id_token ?? null;
  };

  return { isConfigured: !!WEB_CLIENT_ID, signIn };
}
