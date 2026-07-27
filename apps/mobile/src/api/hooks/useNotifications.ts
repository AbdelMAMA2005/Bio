import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';

type RegisterDeviceInput = { expoPushToken: string; plateforme: string };

/**
 * POST /notifications/device (voir API_CONTRACT.md §9) : persiste le token Expo Push
 * côté back pour un futur envoi serveur. Les notifications d'arrosage réelles restent
 * programmées localement (useWateringNotifications, expo-notifications) — cet appel ne
 * fait qu'enregistrer l'appareil, best-effort (son échec ne doit jamais empêcher les
 * notifications locales déjà programmées).
 */
async function registerDevice(input: RegisterDeviceInput): Promise<void> {
  if (USE_MOCK_API) return;
  await apiClient.post('/notifications/device', input);
}

export function useRegisterDeviceToken() {
  return useMutation({ mutationFn: registerDevice });
}

async function unregisterDevice(expoPushToken?: string): Promise<void> {
  if (USE_MOCK_API) return;
  await apiClient.delete('/notifications/device', { data: expoPushToken ? { expoPushToken } : {} });
}

export function useUnregisterDeviceToken() {
  return useMutation({ mutationFn: unregisterDevice });
}
