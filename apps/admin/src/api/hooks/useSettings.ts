import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminApiKeyStatus, AdminAuditLogEntry, AdminFeatureFlag } from '@planai/shared';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminFeatureFlag[]>('/admin/settings/flags');
      return data;
    },
  });
}

export function useSetFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cle, actif }: { cle: string; actif: boolean }) => {
      const { data } = await apiClient.patch<AdminFeatureFlag>(`/admin/settings/flags/${cle}`, { actif });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLog });
    },
  });
}

export function useApiKeysStatus() {
  return useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminApiKeyStatus[]>('/admin/settings/api-keys');
      return data;
    },
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: queryKeys.auditLog,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminAuditLogEntry[]>('/admin/settings/audit-log');
      return data;
    },
  });
}
