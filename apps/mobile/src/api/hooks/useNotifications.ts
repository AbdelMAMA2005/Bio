import { useMutation } from '@tanstack/react-query';

import { requireUserId } from '@/api/supabaseUser';
import { supabase } from '@/lib/supabase';

type RegisterDeviceInput = { expoPushToken: string; plateforme: string };

/**
 * POST /notifications/device (voir API_CONTRACT.md §9) : persiste le token Expo Push
 * côté back pour un futur envoi serveur. Les notifications d'arrosage réelles restent
 * programmées localement (useWateringNotifications, expo-notifications) — cet appel ne
 * fait qu'enregistrer l'appareil, best-effort (son échec ne doit jamais empêcher les
 * notifications locales déjà programmées).
 */
async function registerDevice(input: RegisterDeviceInput): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('device_tokens').upsert(
    { user_id: userId, token: input.expoPushToken, plateforme: input.plateforme },
    { onConflict: 'user_id,token' },
  );
  if (error) throw error;
}

export function useRegisterDeviceToken() {
  return useMutation({ mutationFn: registerDevice });
}

async function unregisterDevice(expoPushToken?: string): Promise<void> {
  const userId = await requireUserId();
  let query = supabase.from('device_tokens').delete().eq('user_id', userId);
  if (expoPushToken) query = query.eq('token', expoPushToken);
  const { error } = await query;
  if (error) throw error;
}

export function useUnregisterDeviceToken() {
  return useMutation({ mutationFn: unregisterDevice });
}
