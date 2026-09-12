import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { useAppTheme } from '@/theme';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const { seen: onboardingSeen } = useOnboarding();
  const { colors } = useAppTheme();

  useEffect(() => {
    // router.replace (post-mount) plutôt que <Redirect> synchrone : sur web, un
    // <Redirect> rendu pendant le premier passage de rendu de "index" peut être
    // avalé si le Stack racine (avec ses Stack.Protected) n'a pas fini de se
    // réconcilier, laissant cet écran (qui ne rend rien d'autre) blanc pour de
    // bon. Naviguer après le premier rendu garantit que le navigateur est monté.
    //
    // Doit refléter EXACTEMENT les mêmes guards que _layout.tsx#RootNavigator :
    // sinon (bug réel trouvé le 11/09/2026, premier test sur device physique)
    // cet écran redirige vers une route désactivée par Stack.Protected (ex.
    // "/(auth)/login" alors que l'onboarding n'a pas été vu) — la navigation
    // échoue silencieusement et l'app reste blanche indéfiniment, y compris au
    // tout premier lancement (avant même la création de compte).
    if (!onboardingSeen) {
      router.replace('/onboarding');
    } else {
      router.replace(isAuthenticated ? '/(tabs)/jardin' : '/(auth)/login');
    }
  }, [isAuthenticated, onboardingSeen]);

  return <View style={{ flex: 1, backgroundColor: colors.screen }} />;
}
