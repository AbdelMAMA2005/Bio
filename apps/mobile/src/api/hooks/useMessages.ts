import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendConversation, BackendMessage } from '@/api/adapters';
import { toChatMessage, toConversation } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { queryKeys } from '@/api/queryKeys';
import type { ChatMessage, Conversation } from '@planai/shared';

async function fetchConversations(): Promise<Conversation[]> {
  const { data } = await apiClient.get<BackendConversation[]>('/messages/conversations');
  return data.map((conversation) => toConversation(conversation, API_BASE_URL));
}

/** GET /messages/conversations — liste des conversations, triée par activité récente. */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: fetchConversations,
  });
}

async function fetchMessagesWith(peerId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<BackendMessage[]>(`/messages/with/${peerId}`);
  return data.map((message) => toChatMessage(message, API_BASE_URL));
}

/**
 * GET /messages/with/:userId — historique avec `peerId`. Le back marque les messages
 * reçus comme lus au passage (voir MessagesService#getMessagesWith) : on invalide aussi
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
 * POST /messages/with/:userId — envoie un message privé, avec citation de statut
 * optionnelle (`storyId`, réponse depuis StoryViewer.tsx). Invalide l'historique de la
 * conversation ET la liste des conversations (nouvel aperçu du dernier message).
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peerId, contenu, storyId }: SendMessageInput) => {
      const { data } = await apiClient.post<BackendMessage>(`/messages/with/${peerId}`, { contenu, storyId });
      return toChatMessage(data, API_BASE_URL);
    },
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messagesWith(variables.peerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
