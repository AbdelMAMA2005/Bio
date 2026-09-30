import { useQuery } from '@tanstack/react-query';

import type { BackendPost, BackendPublicProfile } from '@/api/adapters';
import { toFeedPost, toPublicProfile } from '@/api/adapters';
import { queryKeys } from '@/api/queryKeys';
import type { FeedPost } from '@/api/types';
import type { PublicProfile } from '@planai/shared';
import { getStoragePublicUrl, supabase } from '@/lib/supabase';

async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const { data: profile, error } = await supabase.from('profiles').select('id,nom_utilisateur,url_avatar,niveau,experience,insignes').eq('id', userId).single();
  if (error || !profile) throw error ?? new Error('Profile not found');
  const { data: stats, error: statsError } = await supabase.rpc('get_user_stats', { uid: userId });
  if (statsError) throw statsError;
  const row: BackendPublicProfile = { id: profile.id, nomUtilisateur: profile.nom_utilisateur, urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null, niveau: profile.niveau, experience: profile.experience, insignes: profile.insignes ?? [], stats: stats ?? { captures: 0, especes: 0, rares: 0 } };
  return toPublicProfile(row, '');
}

/** GET /users/:id/public-profile — profil + stats d'un autre utilisateur. */
export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicProfile(userId ?? ''),
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
  });
}

async function fetchUserPosts(userId: string): Promise<FeedPost[]> {
  const { data, error } = await supabase.from('posts').select('id,user_id,contenu,url_image,created_at,profiles!posts_user_id_fkey(id,nom_utilisateur,url_avatar),collection:plant_collection_id(id,plant_id,type_collection,plants(*))').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as { id: string; nom_utilisateur: string; url_avatar: string | null };
    return toFeedPost({ id: row.id, idUtilisateur: row.user_id, contenuTexte: row.contenu, imageUrl: row.url_image ? getStoragePublicUrl('posts', row.url_image) : undefined, dateCreation: row.created_at, auteur: { id: profile.id, nomUtilisateur: profile.nom_utilisateur, urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null }, likesCount: 0, commentairesCount: 0, estLikedParUtilisateur: false, distanceMetres: null } as BackendPost, '');
  });
}

/** GET /users/:id/posts — grille des publications d'un utilisateur (profil public). */
export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userPosts(userId ?? ''),
    queryFn: () => fetchUserPosts(userId!),
    enabled: !!userId,
  });
}
