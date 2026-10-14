import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminReportGroup } from '@planai/shared';
import { rpc } from '../client';
import { queryKeys } from '../queryKeys';

export type ModerationQuery = { page: number; limit: number };

export function useModeration(params: ModerationQuery) {
  return useQuery({
    queryKey: queryKeys.moderation(params),
    queryFn: () => rpc<{ items: AdminReportGroup[]; total: number }>('admin_moderation', {
      p_page: params.page,
      p_limit: params.limit,
    }),
    placeholderData: (prev) => prev,
  });
}

function useResolveReport(supprimer: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rpc<void>('admin_moderation_resolve', { p_report_id: id, p_supprimer: supprimer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLog });
    },
  });
}

export function useIgnoreReport() {
  return useResolveReport(false);
}

export function useRemoveReportedContent() {
  return useResolveReport(true);
}
