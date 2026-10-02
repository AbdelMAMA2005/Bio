import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendComment, BackendPost, BackendStoryGroup } from '@/api/adapters';
import { toComment, toFeedPost, toStoryGroup } from '@/api/adapters';
import { useHerbarium } from '@/api/hooks/useHerbarium';
import { useMyGarden } from '@/api/hooks/useMyGarden';
import { queryKeys } from '@/api/queryKeys';
import type { FeedComment, StoryGroup, TaggableCollectionItem } from '@/api/types';
import type { StoryViewer } from '@planai/shared';
import { requireUserId } from '@/api/supabaseUser';
import { getStoragePublicUrl, supabase, uriToBlob } from '@/lib/supabase';

type BackendFeedResponse = { items: BackendPost[]; total: number; fetchedCount: number };

type Coordinates = { latitude: number; longitude: number };
type FeedFilter = 'all' | 'near';
type ProfileRow = { id: string; nom_utilisateur: string; url_avatar: string | null };

const FEED_PAGE_SIZE = 15;

async function fetchFeedPage(page: number, coords?: Coordinates, filter?: FeedFilter): Promise<BackendFeedResponse> {
  const userId = await requireUserId();
  const source = filter === 'near' && coords
    ? supabase.rpc('nearby_posts', { p_latitude: coords.latitude, p_longitude: coords.longitude }, { count: 'exact' })
    : supabase.from('posts');
  const { data: rows, error, count } = await source.select('id,user_id,contenu,url_image,latitude,longitude,created_at,collection:plant_collection_id(plant_id,type_collection,plants(*))', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false }).range((page - 1) * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE - 1);
  if (error) throw error;
  const posts = (rows ?? []) as any[];
  const [{ data: profiles, error: profilesError }, { data: likes, error: likesError }, { data: comments, error: commentsError }] = await Promise.all([
    supabase.from('profiles').select('id,nom_utilisateur,url_avatar').in('id', [...new Set(posts.map((post) => post.user_id))]),
    supabase.from('likes').select('post_id,user_id').in('post_id', posts.map((post) => post.id)),
    supabase.from('comments').select('post_id').in('post_id', posts.map((post) => post.id)),
  ]);
  if (profilesError || likesError || commentsError) throw profilesError ?? likesError ?? commentsError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const distance = (post: any) => {
    if (!coords || post.latitude == null || post.longitude == null) return null;
    const rad = (value: number) => (value * Math.PI) / 180;
    const a = Math.sin(rad(post.latitude - coords.latitude) / 2) ** 2 + Math.cos(rad(coords.latitude)) * Math.cos(rad(post.latitude)) * Math.sin(rad(post.longitude - coords.longitude) / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const items = posts.flatMap((post) => {
    const profile = profileMap.get(post.user_id);
    const distanceMeters = distance(post);
    if (!profile) return [];
    const postLikes = (likes ?? []).filter((like) => like.post_id === post.id);
    const postComments = (comments ?? []).filter((comment) => comment.post_id === post.id);
    const plant = post.collection?.plants;
    return [{ id: post.id, idUtilisateur: post.user_id, contenuTexte: post.contenu, imageUrl: getStoragePublicUrl('posts', post.url_image), dateCreation: post.created_at, auteur: { id: profile.id, nomUtilisateur: profile.nom_utilisateur, urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null }, plante: plant ? { id: post.collection.plant_id, nomScientifique: plant.nom_scientifique, nomCommun: plant.nom_commun, badgeRarete: plant.badge_rarete, urlImage: plant.url_image } : undefined, typeCollection: post.collection?.type_collection, likesCount: postLikes.length, commentairesCount: postComments.length, estLikedParUtilisateur: postLikes.some((like) => like.user_id === userId), distanceMetres: distanceMeters } satisfies BackendPost];
  });
  return { items, total: count ?? posts.length, fetchedCount: posts.length };
}

/**
 * Pagination réelle (`page`/`limit`, voir API_CONTRACT.md §5) via `useInfiniteQuery` : le fil
 * ne charge plus jamais tous les posts d'un coup — seulement `FEED_PAGE_SIZE` par page,
 * `fetchNextPage()` déclenché par `onEndReached` dans CommunityScreen.tsx.
 *
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
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.feed, filter ?? 'all', coords],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam, coords, filter),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.fetchedCount, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((p) => p.items.map((post) => toFeedPost(post, ''))),
  };
}

async function fetchStories(): Promise<StoryGroup[]> {
  const userId = await requireUserId();
  const { data: stories, error } = await supabase.from('stories').select('id,user_id,url_media,media_type,created_at,date_expiration').gt('date_expiration', new Date().toISOString()).order('created_at', { ascending: true });
  if (error) throw error;
  const rows = stories ?? [];
  const [{ data: profiles, error: profilesError }, { data: views, error: viewsError }, { data: likes, error: likesError }] = await Promise.all([
    supabase.from('profiles').select('id,nom_utilisateur,url_avatar').in('id', [...new Set(rows.map((story) => story.user_id))]),
    supabase.from('story_views').select('story_id,viewer_id').in('story_id', rows.map((story) => story.id)),
    supabase.from('story_likes').select('story_id,user_id').in('story_id', rows.map((story) => story.id)),
  ]);
  if (profilesError || viewsError || likesError) throw profilesError ?? viewsError ?? likesError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const groups = new Map<string, BackendStoryGroup>();
  for (const story of rows) {
    const profile = profileMap.get(story.user_id);
    if (!profile) continue;
    const storyViews = (views ?? []).filter((view) => view.story_id === story.id);
    const storyLikes = (likes ?? []).filter((like) => like.story_id === story.id);
    const seen = storyViews.some((view) => view.viewer_id === userId);
    const group: BackendStoryGroup = groups.get(story.user_id) ?? { idUtilisateur: story.user_id, nomUtilisateur: profile.nom_utilisateur, urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null, estMoi: story.user_id === userId, entierementVue: true, medias: [] };
    group.medias.push({ id: story.id, urlMedia: getStoragePublicUrl('stories', story.url_media), mediaType: story.media_type, dateCreation: story.created_at, dateExpiration: story.date_expiration, vuParMoi: story.user_id === userId || seen, vuesCount: storyViews.length, likesCount: storyLikes.length, aimeParMoi: storyLikes.some((like) => like.user_id === userId) });
    group.entierementVue = group.entierementVue && (story.user_id === userId || seen);
    groups.set(story.user_id, group);
  }
  return [...groups.values()].map((group) => toStoryGroup(group, ''));
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
      const userId = await requireUserId();
      const { data: existing, error: readError } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
      if (readError) throw readError;
      const result = existing ? await supabase.from('likes').delete().eq('id', existing.id) : await supabase.from('likes').insert({ post_id: postId, user_id: userId });
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      // Un post liké depuis la grille du profil public (usePublicProfile.ts) vit dans un
      // cache séparé (['userPosts', authorId]) : sans cette invalidation, le like resterait
      // affiché comme non pris en compte tant que l'écran de profil n'est pas rouvert.
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
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
      const userId = await requireUserId();
      const path = `${userId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('stories').upload(path, await uriToBlob(imageUri), { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('stories').insert({ user_id: userId, url_media: path, media_type: 'image' });
      if (error) throw error;
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
      const userId = await requireUserId();
      const { error } = await supabase.from('story_views').upsert({ story_id: mediaId, viewer_id: userId }, { onConflict: 'viewer_id,story_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
    },
  });
}

/**
 * POST /stories/:mediaId/like (toggle) — mise à jour optimiste immédiate de `aimeParMoi`/
 * `likesCount` dans le cache `stories` dès le tap (StoryViewer lit ce cache en direct, voir
 * StoryViewer.tsx, plutôt qu'un instantané figé) : corrige le bug où il fallait quitter et
 * rouvrir la story pour voir l'effet d'un like. Rollback sur `onError`, refetch propre sur
 * `onSettled` pour repartir de la vérité serveur (autres viewers ayant liké entre-temps…).
 */
export function useToggleStoryLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: string) => {
      const userId = await requireUserId();
      const { data: existing, error: readError } = await supabase.from('story_likes').select('id').eq('story_id', mediaId).eq('user_id', userId).maybeSingle();
      if (readError) throw readError;
      const result = existing ? await supabase.from('story_likes').delete().eq('id', existing.id) : await supabase.from('story_likes').insert({ story_id: mediaId, user_id: userId });
      if (result.error) throw result.error;
      return undefined;
    },
    onMutate: async (mediaId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.stories });
      const previous = queryClient.getQueryData<StoryGroup[]>(queryKeys.stories);
      if (previous) {
        queryClient.setQueryData<StoryGroup[]>(
          queryKeys.stories,
          previous.map((group) => ({
            ...group,
            medias: group.medias.map((media) =>
              media.id === mediaId
                ? {
                    ...media,
                    aimeParMoi: !media.aimeParMoi,
                    likesCount: media.likesCount + (media.aimeParMoi ? -1 : 1),
                  }
                : media,
            ),
          })),
        );
      }
      return { previous };
    },
    onError: (_error, _mediaId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.stories, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
    },
  });
}

/** Supprime un média de sa propre story avant son expiration naturelle (voir StoryViewer). */
export function useDeleteStoryMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await supabase.from('stories').delete().eq('id', mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stories });
    },
  });
}

async function fetchStoryViewers(mediaId: string): Promise<StoryViewer[]> {
  const { data, error } = await supabase.from('story_views').select('viewer_id,created_at,profiles(id,nom_utilisateur,url_avatar)').eq('story_id', mediaId).order('created_at', { ascending: false });
  if (error) throw error;
  // Le back renvoie urlAvatar en URL relative (comme pour les auteurs de post/story) — sans
  // cette résolution, StoryViewersSheet.tsx recevrait un chemin `/uploads/...` inutilisable
  // tel quel par <Avatar>.
  return data.map((viewer) => ({
    idUtilisateur: viewer.viewer_id,
    nomUtilisateur: (Array.isArray(viewer.profiles) ? viewer.profiles[0] : viewer.profiles).nom_utilisateur,
    urlAvatar: ((Array.isArray(viewer.profiles) ? viewer.profiles[0] : viewer.profiles).url_avatar) ? getStoragePublicUrl('avatars', (Array.isArray(viewer.profiles) ? viewer.profiles[0] : viewer.profiles).url_avatar) : null,
    dateVue: viewer.created_at,
  }));
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
      const userId = await requireUserId();
      const path = `${userId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('posts').upload(path, await uriToBlob(input.imageUri), { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      let coordinates: { latitude: number | null; longitude: number | null } | null = null;
      if (input.collectionItemId) {
        const { data, error } = await supabase.from('collection').select('latitude,longitude').eq('id', input.collectionItemId).eq('user_id', userId).single();
        if (error) throw error;
        coordinates = data;
      }
      const { error } = await supabase.from('posts').insert({ user_id: userId, plant_collection_id: input.collectionItemId ?? null, contenu: input.texte, url_image: path, latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null });
      if (error) throw error;
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
  const { data, error } = await supabase.from('comments').select('id,post_id,user_id,contenu,created_at,profiles(id,nom_utilisateur,url_avatar)').eq('post_id', postId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((comment) => { const profile = (Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles) as ProfileRow; return toComment({ id: comment.id, idPost: comment.post_id, idUtilisateur: comment.user_id, contenu: comment.contenu, dateCreation: comment.created_at, auteur: { id: profile.id, nomUtilisateur: profile.nom_utilisateur, urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null } } satisfies BackendComment, ''); });
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
      const userId = await requireUserId();
      const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, contenu: texte });
      if (error) throw error;
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

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const userId = await requireUserId();
      const { data, error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Post could not be deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
    },
  });
}
