import { useQuery } from '@tanstack/react-query';

import type { BackendPublicProfile } from '@/api/adapters';
import { toFeedPost, toPublicProfile } from '@/api/adapters';
import { enrichPosts, POST_COLUMNS } from '@/api/hooks/useFeed';
import { queryKeys } from '@/api/queryKeys';
import { requireUserId } from '@/api/supabaseUser';
import type { FeedPost } from '@/api/types';
import type { PublicProfile } from '@planai/shared';
import { levelFromExperience } from '@/features/account/levels';
import { getStoragePublicUrl, supabase } from '@/lib/supabase';

async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const { data: profile, error } = await supabase.from('profiles').select('id,nom_utilisateur,url_avatar,niveau,experience,insignes').eq('id', userId).single();
  if (error || !profile) throw error ?? new Error('Profile not found');
  const { data: stats, error: statsError } = await supabase.rpc('get_user_stats', { uid: userId });
  if (statsError) throw statsError;
  const { niveau } = levelFromExperience(profile.experience);
  const row: BackendPublicProfile = { id: profile.id, nomUtilisateur: profile.nom_utilisateur, urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null, niveau, experience: profile.experience, insignes: profile.insignes ?? [], stats: stats ?? { captures: 0, especes: 0, rares: 0 } };
  return toPublicProfile(row);
}

/** Profil + stats (RPC get_user_stats) d'un autre utilisateur. */
export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicProfile(userId ?? ''),
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
  });
}

async function fetchUserPosts(userId: string): Promise<FeedPost[]> {
  const viewerId = await requireUserId();
  const { data, error } = await supabase.from('posts').select(POST_COLUMNS).eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  // Mêmes compteurs que le fil : sans ça, chaque post du profil affichait 0 like et 0 commentaire.
  const posts = await enrichPosts((data ?? []) as unknown as Parameters<typeof enrichPosts>[0], viewerId);
  return posts.map((post) => toFeedPost(post));
}

/** Grille des publications d'un utilisateur (profil public). */
export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userPosts(userId ?? ''),
    queryFn: () => fetchUserPosts(userId!),
    enabled: !!userId,
  });
}
