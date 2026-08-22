import { useMutation, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';
import { queryKeys } from '@/api/queryKeys';

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

/**
 * GET /notifications/unread-count
 * Retourne le nombre de notifications non lues pour l'utilisateur connecté.
 * Rafraîchi automatiquement toutes les 30 s pour maintenir le badge à jour.
 */
async function fetchUnreadNotificationsCount(): Promise<number> {
  if (USE_MOCK_API) return 0;
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: fetchUnreadNotificationsCount,
    refetchInterval: 30_000,
    // Ne bloque pas le rendu si la requête échoue (backend inaccessible en dev)
    retry: false,
  });
}

export type AppNotification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      if (USE_MOCK_API) return [] as AppNotification[];
      const { data } = await apiClient.get<AppNotification[]>('/notifications');
      return data;
    },
  });
}
