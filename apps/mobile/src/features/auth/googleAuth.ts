import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * Prêt à brancher sur un vrai client Google (EXPO_PUBLIC_GOOGLE_CLIENT_ID côté Abdel/backend).
 * Sans client id, `isConfigured` est false et l'appelant doit retomber sur le flux simulé.
 */
export function useGoogleAuthRequest() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mobile' });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID || 'not-configured',
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    },
    discovery,
  );

  return { request, response, promptAsync, isConfigured: !!GOOGLE_CLIENT_ID };
}
