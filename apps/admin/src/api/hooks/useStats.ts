import { useQuery } from '@tanstack/react-query';
import type { AdminStats } from '@planai/shared';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminStats>('/admin/stats');
      return data;
    },
    refetchInterval: 60_000,
  });
}
