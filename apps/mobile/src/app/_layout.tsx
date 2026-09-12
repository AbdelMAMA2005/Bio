import type { User } from '@planai/shared';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { QueryClientProvider } from '@tanstack/react-query';

import { BootGate } from '@/components/BootGate';
import { AuthProvider, restoreSession, useAuth } from '@/features/auth/AuthProvider';
import { useWateringNotificationTapNavigation } from '@/features/jardin/useWateringNotifications';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { hasSeenOnboarding } from '@/features/onboarding/onboardingStorage';
import { initI18n } from '@/i18n';
import { queryClient } from '@/api/queryClient';
import { AppThemeProvider, useAppTheme } from '@/theme';
import { FontsToLoad } from '@/theme/typography';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const { seen: onboardingSeen } = useOnboarding();
  const { isDark } = useAppTheme();

  // Monté une seule fois au niveau racine pour capter le tap sur une notification
  // d'arrosage quel que soit l'écran affiché (voir useWateringNotifications.ts).
  useWateringNotificationTapNavigation();

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!onboardingSeen}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboardingSeen && isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="compte" options={{ presentation: 'modal' }} />
          <Stack.Screen name="badges" options={{ presentation: 'modal' }} />
          <Stack.Screen name="plante/[id]" />
          <Stack.Screen name="conseil/[type]" />
          <Stack.Screen name="profil/[id]" />
          <Stack.Screen name="messages" />
        </Stack.Protected>
        <Stack.Protected guard={onboardingSeen && !isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FontsToLoad);
  const [boot, setBoot] = useState<{ ready: boolean; user: User | null; onboardingSeen: boolean }>({
    ready: false,
    user: null,
    onboardingSeen: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initI18n();
      const [user, onboardingSeen] = await Promise.all([restoreSession(), hasSeenOnboarding()]);
      if (!cancelled) setBoot({ ready: true, user, onboardingSeen });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const appReady = fontsLoaded && boot.ready;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <AppThemeProvider>
          <QueryClientProvider client={queryClient}>
            <BootGate appReady={appReady}>
              {boot.ready ? (
                <OnboardingProvider initialSeen={boot.onboardingSeen}>
                  <AuthProvider initialUser={boot.user}>
                    <RootNavigator />
                  </AuthProvider>
                </OnboardingProvider>
              ) : null}
            </BootGate>
          </QueryClientProvider>
        </AppThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
