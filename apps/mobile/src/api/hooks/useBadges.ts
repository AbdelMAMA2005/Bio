import { useQuery } from '@tanstack/react-query';

import { badgesFromInsignes } from '@/api/adapters';
import { mockBadges, type Badge } from '@/api/mock/badges';
import { requireUserId } from '@/api/supabaseUser';
import { supabase } from '@/lib/supabase';

/**
 * Badges calculés côté serveur à partir des vraies données (RPC get_my_badges), avec leur
 * vraie date d'obtention, croisés avec le catalogue front pour le nom et la description.
 * Repli sur `profiles.insignes` si la RPC n'est pas encore déployée.
 */
async function fetchBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.rpc('get_my_badges');
  if (!error) {
    const obtained = new Map(((data ?? []) as { id: string; obtenuLe: string }[]).map((b) => [b.id, b.obtenuLe]));
    return mockBadges.map((entry) => ({ ...entry, obtenuLe: obtained.get(entry.id) ?? null }));
  }
  if (error.code !== 'PGRST202') throw error;
  const userId = await requireUserId();
  const { data: profile, error: profileError } = await supabase.from('profiles').select('insignes').eq('id', userId).single<{ insignes: string[] | null }>();
  if (profileError) throw profileError;
  return badgesFromInsignes(profile?.insignes ?? [], mockBadges);
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: fetchBadges });
}
