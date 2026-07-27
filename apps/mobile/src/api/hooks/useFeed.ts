import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendComment, BackendPost, BackendStoryGroup } from '@/api/adapters';
import { toComment, toFeedPost, toStoryGroup } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { useHerbarium } from '@/api/hooks/useHerbarium';
import { useMyGarden } from '@/api/hooks/useMyGarden';
import { queryKeys } from '@/api/queryKeys';
import type { FeedComment, FeedPost, StoryGroup, TaggableCollectionItem } from '@/api/types';
import type { StoryViewer } from '@planai/shared';

type BackendFeedResponse = { items: BackendPost[]; total: number };

type Coordinates = { latitude: number; longitude: number };
type FeedFilter = 'all' | 'near';

async function fetchFeed(coords?: Coordinates, filter?: FeedFilter): Promise<FeedPost[]> {
  const { data } = await apiClient.get<BackendFeedResponse>('/feed', {
    params: coords ? { latitude: coords.latitude, longitude: coords.longitude, filter } : undefined,
  });
  return data.items.map((post) => toFeedPost(post, API_BASE_URL));
}

/**
 * `coords`, si fourni (position actuelle de l'appareil), permet au back de calculer une
 * vraie distance par post. `filter: 'near'` (avec `coords`) fait en plus filtrer les posts
 * réellement en base (cahier des charges §3.3) — voir `feed.service.ts#getFeed`, pas un
 * post-filtrage côté front qui manquerait les posts proches hors de la première page.
 * Désactivée (aucun appel réseau) si `filter === 'near'` sans position connue : on ne
 * réaffiche jamais silencieusement "tout le fil" à la place d'un "près de moi" honnêtement
 * vide faute de position.
 */
export function useFeed(coords?: Coordinates, filter?: FeedFilter) {
  const enabled = filter !== 'near' || !!coords;
  return useQuery({
    queryKey: [...queryKeys.feed, filter ?? 'all', coords],
    queryFn: () => fetchFeed(coords, filter),
    enabled,
  });
}

async function fetchStories(): Promise<StoryGroup[]> {
  const { data } = await apiClient.get<BackendStoryGroup[]>('/stories');
  return data.map((group) => toStoryGroup(group, API_BASE_URL));
}

/**
 * Bulles groupées par auteur (comportement "statuts WhatsApp" — voir API_CONTRACT.md §5) :
 * plusieurs médias du même utilisateur reviennent dans UNE seule entrée `StoryGroup`, déjà
 * triée non-vues d'abord côté back.
 */
export function useStories() {
  return useQuery({
    queryKey: queryKeys.stories,
    queryFn: fetchStories,
  });
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

/**
 * POST /stories (multipart, champ `image`) — ajoute un média à la story du jour de
 * l'utilisateur ; s'empile dans sa bulle existante côté back plutôt que d'en créer une
 * nouvelle (voir StoriesService#getGroupedStories).
 */
export function usePublishStoryMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      formData.append('image', { uri: imageUri, name: 'story.jpg', type: 'image/jpeg' } as unknown as Blob);
      await apiClient.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
    },
  });
}

/**
 * POST /stories/:mediaId/view — une seule vue par (média, viewer), sans effet si l'appelant
 * est l'auteur du média (voir StoriesService#recordView). Invalide `stories` pour que
 * `vuParMoi`/l'anneau de la bulle reflètent la vue tout de suite.
 */
export function useRecordStoryView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: string) => {
      await apiClient.post(`/stories/${mediaId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
    },
  });
}

async function fetchStoryViewers(mediaId: string): Promise<StoryViewer[]> {
  const { data } = await apiClient.get<StoryViewer[]>(`/stories/${mediaId}/viewers`);
  return data;
}

/** GET /stories/:mediaId/viewers — réservé à l'auteur du média (403 sinon côté back). */
export function useStoryViewers(mediaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storyViewers(mediaId ?? ''),
    queryFn: () => fetchStoryViewers(mediaId!),
    enabled: !!mediaId,
  });
}

type PublishPostInput = { imageUri: string; texte: string; collectionItemId?: string };

/**
 * POST /feed/posts (multipart, champ `image`) — envoie la vraie photo prise dans le
 * composeur, plus `contenuTexte`/`collectionId` en champs multipart. Avant le 24/07/2026,
 * aucun endpoint d'upload générique n'existait pour le feed : seul le texte était publié
 * (voir rapport.md).
 */
export function usePublishPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublishPostInput) => {
      const formData = new FormData();
      formData.append('contenuTexte', input.texte);
      if (input.collectionItemId) formData.append('collectionId', input.collectionItemId);
      formData.append('image', { uri: input.imageUri, name: 'post.jpg', type: 'image/jpeg' } as unknown as Blob);
      await apiClient.post('/feed/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

async function fetchComments(postId: string): Promise<FeedComment[]> {
  const { data } = await apiClient.get<BackendComment[]>(`/feed/posts/${postId}/comments`);
  return data.map(toComment);
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.comments(postId ?? ''),
    queryFn: () => fetchComments(postId!),
    enabled: !!postId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, texte }: { postId: string; texte: string }) => {
      await apiClient.post(`/feed/posts/${postId}/comments`, { contenu: texte });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(variables.postId) });
      // Le compteur de commentaires affiché sur la carte vit dans la liste du fil, pas
      // uniquement dans le fil de commentaires ouvert — sans cette invalidation, il
      // resterait figé jusqu'au prochain rechargement complet de l'écran.
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}
