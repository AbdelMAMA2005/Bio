import { useQuery } from '@tanstack/react-query';

import { badgesFromInsignes } from '@/api/adapters';
import { mockBadges, type Badge } from '@/api/mock/badges';
import { requireUserId } from '@/api/supabaseUser';
import { supabase } from '@/lib/supabase';

/**
 * GET /users/me existe désormais côté back et renvoie `insignes: string[]`
 * (voir API_CONTRACT.md §2) : on croise avec le catalogue front pour obtenir
 * nom/description/statut d'obtention. Repli mock via EXPO_PUBLIC_USE_MOCK_API.
 */
async function fetchBadges(): Promise<Badge[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('profiles').select('insignes').eq('id', userId).single<{ insignes: string[] | null }>();
  if (error) throw error;
  return badgesFromInsignes(data?.insignes ?? [], mockBadges);
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: fetchBadges });
}
