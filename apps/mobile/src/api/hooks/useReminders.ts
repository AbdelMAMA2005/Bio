import { useMutation } from '@tanstack/react-query';

import { requireUserId } from '@/api/supabaseUser';
import { supabase } from '@/lib/supabase';

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
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      plant_collection_id: input.collectionId,
      frequence_jours: 7,
      prochain_arrosage: input.datePlanification.toISOString(),
      actif: true,
    })
    .select('id,user_id,plant_collection_id,prochain_arrosage,actif')
    .single();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        userId: data.user_id,
        collectionId: data.plant_collection_id,
        typeRappel: input.typeRappel,
        datePlanification: data.prochain_arrosage,
        estNotifie: !data.actif,
      }
    : null;
}

export function useCreateReminder() {
  return useMutation({ mutationFn: createReminder });
}
