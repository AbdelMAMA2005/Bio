import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendConversation, BackendMessage, BackendStoryPreview } from '@/api/adapters';
import { toChatMessage, toConversation } from '@/api/adapters';
import { queryKeys } from '@/api/queryKeys';
import { requireUserId } from '@/api/supabaseUser';
import { getStoragePublicUrl, supabase } from '@/lib/supabase';
import type { ChatMessage, Conversation } from '@planai/shared';

/** Aperçu des stories citées dans les réponses (une story expirée n'est plus lisible : pas d'aperçu). */
async function fetchStoryPreviews(storyIds: (string | null)[]): Promise<Map<string | null, BackendStoryPreview>> {
  const ids = [...new Set(storyIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from('stories').select('id,url_media,media_type').in('id', ids);
  return new Map((data ?? []).map((story) => [story.id, { id: story.id, urlMedia: getStoragePublicUrl('stories', story.url_media), mediaType: story.media_type }]));
}

async function fetchConversations(): Promise<Conversation[]> {
  const userId = await requireUserId();
  const { data: conversations, error } = await supabase.from('conversations').select('id,user1_id,user2_id,dernier_message,date_dernier_message').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).order('date_dernier_message', { ascending: false, nullsFirst: false });
  if (error) throw error;
  const peerIds = (conversations ?? []).map((conversation) => conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id);
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,nom_utilisateur,url_avatar').in('id', peerIds);
  if (profileError) throw profileError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  // Requêtes lancées en parallèle (avant : deux allers-retours successifs par conversation).
  const rows = await Promise.all((conversations ?? []).map(async (conversation): Promise<BackendConversation | null> => {
    const peerId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    const peer = profileMap.get(peerId);
    if (!peer) return null;
    const [{ data: lastMessage }, { count }] = await Promise.all([
      supabase.from('messages').select('contenu,created_at,sender_id,story_id').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation.id).eq('sender_id', peerId).eq('lu', false),
    ]);
    const previews = await fetchStoryPreviews(lastMessage?.story_id ? [lastMessage.story_id] : []);
    return { id: conversation.id, autreUtilisateur: { id: peer.id, nomUtilisateur: peer.nom_utilisateur, urlAvatar: peer.url_avatar ? getStoragePublicUrl('avatars', peer.url_avatar) : null }, dernierMessage: lastMessage ? { contenu: lastMessage.contenu, dateEnvoi: lastMessage.created_at, estDeMoi: lastMessage.sender_id === userId, storyPreview: previews.get(lastMessage.story_id) ?? null } : null, nonLusCount: count ?? 0 };
  }));
  const result = rows.filter((row): row is BackendConversation => row !== null);
  return result.map((conversation) => toConversation(conversation));
}

/** Liste des conversations, triée par activité récente. */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: fetchConversations,
  });
}

async function fetchMessagesWith(peerId: string): Promise<ChatMessage[]> {
  const userId = await requireUserId();
  const first = userId < peerId ? userId : peerId;
  const second = userId < peerId ? peerId : userId;
  const { data: conversation, error: conversationError } = await supabase.from('conversations').select('id').eq('user1_id', first).eq('user2_id', second).maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) return [];
  const { data, error } = await supabase.from('messages').select('id,conversation_id,sender_id,contenu,created_at,lu,story_id').eq('conversation_id', conversation.id).order('created_at', { ascending: true });
  if (error) throw error;
  const [previews] = await Promise.all([
    fetchStoryPreviews((data ?? []).map((message) => message.story_id)),
    supabase.from('messages').update({ lu: true }).eq('conversation_id', conversation.id).eq('sender_id', peerId).eq('lu', false),
  ]);
  return (data ?? []).map((message) => toChatMessage({ id: message.id, idConversation: message.conversation_id, idExpediteur: message.sender_id, contenu: message.contenu, dateEnvoi: message.created_at, lu: message.sender_id === peerId ? true : message.lu, storyPreview: previews.get(message.story_id) ?? null } satisfies BackendMessage));
}

/**
 * Historique avec `peerId`. Les messages reçus sont marqués lus au passage
 * (fetchMessagesWith) : on invalide aussi
 * la liste des conversations pour que le badge "non lus" s'efface immédiatement.
 */
export function useMessagesWith(peerId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.messagesWith(peerId ?? ''),
    queryFn: async () => {
      const messages = await fetchMessagesWith(peerId!);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      return messages;
    },
    enabled: !!peerId,
  });
}

type SendMessageInput = { peerId: string; contenu: string; storyId?: string };

/**
 * Envoie un message privé, avec citation de statut
 * optionnelle (`storyId`, réponse depuis StoryViewer.tsx). Invalide l'historique de la
 * conversation ET la liste des conversations (nouvel aperçu du dernier message).
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peerId, contenu, storyId }: SendMessageInput) => {
      const userId = await requireUserId();
      const first = userId < peerId ? userId : peerId;
      const second = userId < peerId ? peerId : userId;
      let { data: conversation, error: conversationError } = await supabase.from('conversations').select('id').eq('user1_id', first).eq('user2_id', second).maybeSingle();
      if (conversationError) throw conversationError;
      if (!conversation) {
        const created = await supabase.from('conversations').insert({ user1_id: first, user2_id: second }).select('id').single();
        if (created.error?.code === '23505') {
          // L'autre personne vient d'ouvrir la conversation au même moment.
          const existing = await supabase.from('conversations').select('id').eq('user1_id', first).eq('user2_id', second).single();
          if (existing.error) throw existing.error;
          conversation = existing.data;
        } else {
          if (created.error) throw created.error;
          conversation = created.data;
        }
      }
      const { data, error } = await supabase.from('messages').insert({ conversation_id: conversation.id, sender_id: userId, contenu, story_id: storyId ?? null }).select('id,conversation_id,sender_id,contenu,created_at,lu,story_id').single();
      if (error) throw error;
      const [previews] = await Promise.all([
        fetchStoryPreviews([data.story_id]),
        supabase.from('conversations').update({ dernier_message: contenu, date_dernier_message: data.created_at }).eq('id', conversation.id),
      ]);
      return toChatMessage({ id: data.id, idConversation: data.conversation_id, idExpediteur: data.sender_id, contenu: data.contenu, dateEnvoi: data.created_at, lu: data.lu, storyPreview: previews.get(data.story_id) ?? null } satisfies BackendMessage);
    },
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messagesWith(variables.peerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
