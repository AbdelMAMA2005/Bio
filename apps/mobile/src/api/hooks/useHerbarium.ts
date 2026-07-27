import { useQuery } from '@tanstack/react-query';

import type { BackendCollectionItem } from '@/api/adapters';
import { toHerbariumDiscovery } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { queryKeys } from '@/api/queryKeys';
import type { HerbariumDiscovery } from '@/api/types';
import { useAuth } from '@/features/auth/AuthProvider';

async function fetchHerbarium(userId: string): Promise<HerbariumDiscovery[]> {
  const { data } = await apiClient.get<BackendCollectionItem[]>('/collection', { params: { type: 'discovered' } });
  return data.map((item) => toHerbariumDiscovery(item, userId, API_BASE_URL));
}

export function useHerbarium() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.herbarium,
    queryFn: () => fetchHerbarium(user!.id),
    enabled: !!user,
  });
}
