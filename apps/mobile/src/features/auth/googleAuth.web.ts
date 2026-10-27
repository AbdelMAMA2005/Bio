import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';

import type { GoogleCredential } from '@/features/auth/googleAuth.native';

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
export function useGoogleSignIn(): { isConfigured: boolean; signIn: () => Promise<GoogleCredential | null> } {
  const redirectUri = AuthSession.makeRedirectUri();
  // Google reçoit l'empreinte SHA-256 du nonce et Supabase le nonce brut, qu'il hache à
  // son tour pour la comparer au jeton : sans lui, signInWithIdToken refuse le jeton.
  const nonce = useMemo(() => Crypto.randomUUID(), []);
  const [hashedNonce, setHashedNonce] = useState<string | null>(null);

  useEffect(() => {
    void Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce).then(setHashedNonce);
  }, [nonce]);

  const [, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: WEB_CLIENT_ID || 'not-configured',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      // PKCE ne s'applique qu'au flux par code : Google rejette code_challenge_method
      // sur une demande d'id_token (erreur 400 invalid_request).
      usePKCE: false,
      extraParams: { nonce: hashedNonce ?? '' },
    },
    discovery,
  );

  const signIn = async (): Promise<GoogleCredential | null> => {
    const result = await promptAsync();
    if (result.type !== 'success') return null; // annulé/dismiss
    const idToken = result.params.id_token;
    return idToken ? { idToken, nonce } : null;
  };

  return { isConfigured: !!WEB_CLIENT_ID && hashedNonce !== null, signIn };
}
