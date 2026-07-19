import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendPost } from '@/api/adapters';
import { toFeedPost } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { useHerbarium } from '@/api/hooks/useHerbarium';
import { useMyGarden } from '@/api/hooks/useMyGarden';
import { addStory, stories, wait } from '@/api/mock/store';
import { queryKeys } from '@/api/queryKeys';
import type { FeedPost, Story, TaggableCollectionItem } from '@/api/types';

type BackendFeedResponse = { items: BackendPost[]; total: number };

async function fetchFeed(): Promise<{ stories: Story[]; posts: FeedPost[] }> {
  const { data } = await apiClient.get<BackendFeedResponse>('/feed');
  return {
    // Pas d'endpoint /stories côté back (aucune entité Story) — reste mocké,
    // voir BACKEND_ISSUES.md §6.
    stories: [...stories],
    posts: data.items.map((post) => toFeedPost(post, API_BASE_URL)),
  };
}

export function useFeed() {
  return useQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.post(`/feed/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

/** Pas d'endpoint /stories côté back — reste mocké, voir BACKEND_ISSUES.md §6. */
export function usePublishStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageUri: string) => wait(addStory(imageUri), 700),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

type PublishPostInput = { imageUri: string; texte: string; collectionItemId?: string };

/**
 * POST /feed/posts attend `imageUrl` (une URL déjà hébergée), pas un fichier — il n'y a
 * pas d'endpoint d'upload générique pour le feed (voir API_CONTRACT.md §5). On ne peut
 * donc pas envoyer la photo prise par l'utilisateur : seul le texte est publié pour
 * l'instant. Voir BACKEND_ISSUES.md §6.
 */
export function usePublishPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishPostInput) => {
      await apiClient.post('/feed/posts', {
        contenuTexte: input.texte,
        collectionId: input.collectionItemId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

export function useTaggableCollection() {
  const garden = useMyGarden();
  const herbarium = useHerbarium();

  const items: TaggableCollectionItem[] = [
    ...(garden.data ?? []).map((c) => ({ collectionItemId: c.item.id ?? c.item.idPlante, plant: c.plant, type: 'owned' as const })),
    ...(herbarium.data ?? []).map((d) => ({
      collectionItemId: d.item.id ?? d.item.idPlante,
      plant: d.plant,
      type: 'discovered' as const,
    })),
  ];

  return {
    data: items,
    isPending: garden.isPending || herbarium.isPending,
  };
}
