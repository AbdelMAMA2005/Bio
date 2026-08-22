import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';
import { queryKeys } from '@/api/queryKeys';

/**
 * GET /messages/unread-count
 * Retourne le nombre de messages prives non lus pour l'utilisateur connecte.
 * Rafraichi automatiquement toutes les 30 s pour maintenir le badge a jour
 * sans connexion persistante (WebSocket).
 */
async function fetchUnreadMessagesCount(): Promise<number> {
  if (USE_MOCK_API) return 0;
  const { data } = await apiClient.get<{ count: number }>('/messages/unread-count');
  return data.count;
}

export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: queryKeys.messagesUnread,
    queryFn: fetchUnreadMessagesCount,
    refetchInterval: 30_000,
    // Ne bloque pas le rendu si la requete echoue (backend inaccessible en dev)
    retry: false,
  });
}

export type MessageConversation = {
  otherUser: { id: string; username: string; fullName: string; urlAvatar?: string | null };
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
};

export function useConversations() {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: async () => {
      if (USE_MOCK_API) return [] as MessageConversation[];
      const { data } = await apiClient.get<MessageConversation[]>('/messages/conversations');
      return data;
    },
  });
}
