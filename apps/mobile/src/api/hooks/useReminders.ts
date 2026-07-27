import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';

type CreateReminderInput = {
  collectionId: string;
  typeRappel: string;
  datePlanification: Date;
};

type BackendReminder = {
  id: string;
  userId: string;
  collectionId: string;
  typeRappel: string;
  datePlanification: string;
  estNotifie: boolean;
};

/**
 * Le module `reminders` existe côté back (POST /reminders, voir API_CONTRACT.md §4) mais
 * n'envoie aucun push serveur réel (`estNotifie` reste un simple flag) : la vraie
 * notification vient de `scheduleReminderNotification` (expo-notifications, local à
 * l'appareil). Cet appel persiste seulement le rappel côté back pour cohérence des
 * données ; son échec ne doit pas bloquer la notification locale déjà programmée.
 */
async function createReminder(input: CreateReminderInput): Promise<BackendReminder | null> {
  if (USE_MOCK_API) return null;

  const { data } = await apiClient.post<BackendReminder>('/reminders', {
    collectionId: input.collectionId,
    typeRappel: input.typeRappel,
    datePlanification: input.datePlanification.toISOString(),
  });
  return data;
}

export function useCreateReminder() {
  return useMutation({ mutationFn: createReminder });
}
