import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminQuest, AdminQuestType } from '@planai/shared';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useAdminQuests() {
  return useQuery({
    queryKey: queryKeys.quests,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminQuest[]>('/admin/quests');
      return data;
    },
  });
}

export type CreateQuestInput = {
  id: string;
  libelle: string;
  type: AdminQuestType;
  objectif: number;
  recompenseXp: number;
  recompensePieces: number;
};

export function useCreateQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuestInput) => {
      const { data } = await apiClient.post<AdminQuest>('/admin/quests', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.quests }),
  });
}

export function useUpdateQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateQuestInput> & { actif?: boolean } }) => {
      const { data } = await apiClient.patch<AdminQuest>(`/admin/quests/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.quests }),
  });
}
