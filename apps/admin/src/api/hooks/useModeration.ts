import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminReportGroup } from '@planai/shared';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export type ModerationQuery = { page: number; limit: number };

export function useModeration(params: ModerationQuery) {
  return useQuery({
    queryKey: queryKeys.moderation(params),
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: AdminReportGroup[]; total: number }>(
        '/admin/moderation',
        { params },
      );
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useIgnoreReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/admin/moderation/${id}/ignore`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] }),
  });
}

export function useRemoveReportedContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/moderation/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] }),
  });
}
