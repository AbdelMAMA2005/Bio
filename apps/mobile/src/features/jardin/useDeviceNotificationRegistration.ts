import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useRegisterDeviceToken, useUnregisterDeviceToken } from '@/api/hooks/useNotifications';

const runningInExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Demande la permission de notifications et enregistre le token Expo Push
 * (table device_tokens) tant que la préférence "notifications" de l'utilisateur
 * (usePreferences, AccountScreen) est active ; le retire (DELETE) sinon. Best-effort de
 * bout en bout : ni la demande de permission ni l'appel back ne doivent bloquer l'app —
 * les notifications d'arrosage réelles viennent de useWateringNotifications
 * (programmation locale), indépendante de cet enregistrement.
 */
export function useDeviceNotificationRegistration(enabled: boolean): void {
  const registerDevice = useRegisterDeviceToken();
  const unregisterDevice = useUnregisterDeviceToken();

  useEffect(() => {
    if (runningInExpoGo) return;
    let cancelled = false;

    (async () => {
      if (!enabled) {
        unregisterDevice.mutate(undefined);
        return;
      }

      try {
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;

        registerDevice.mutate({ expoPushToken, plateforme: Platform.OS });
      } catch {
        // Best-effort : pas de credentials push configurés sur ce build, appareil sans
        // Google Play Services, etc. — jamais bloquant pour le reste de l'app.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
