import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const { colors } = useAppTheme();

  useEffect(() => {
    // router.replace (post-mount) plutôt que <Redirect> synchrone : sur web, un
    // <Redirect> rendu pendant le premier passage de rendu de "index" peut être
    // avalé si le Stack racine (avec ses Stack.Protected) n'a pas fini de se
    // réconcilier, laissant cet écran (qui ne rend rien d'autre) blanc pour de
    // bon. Naviguer après le premier rendu garantit que le navigateur est monté.
    router.replace(isAuthenticated ? '/(tabs)/jardin' : '/(auth)/login');
  }, [isAuthenticated]);

  return <View style={{ flex: 1, backgroundColor: colors.screen }} />;
}
