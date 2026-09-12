import { useQuery } from '@tanstack/react-query';

import type { BackendPost, BackendPublicProfile } from '@/api/adapters';
import { toFeedPost, toPublicProfile } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { queryKeys } from '@/api/queryKeys';
import type { FeedPost } from '@/api/types';
import type { PublicProfile } from '@planai/shared';

async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const { data } = await apiClient.get<BackendPublicProfile>(`/users/${userId}/public-profile`);
  return toPublicProfile(data, API_BASE_URL);
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
  const { data } = await apiClient.get<{ items: BackendPost[]; total: number }>(`/users/${userId}/posts`);
  return data.items.map((post) => toFeedPost(post, API_BASE_URL));
}

/** GET /users/:id/posts — grille des publications d'un utilisateur (profil public). */
export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userPosts(userId ?? ''),
    queryFn: () => fetchUserPosts(userId!),
    enabled: !!userId,
  });
}
