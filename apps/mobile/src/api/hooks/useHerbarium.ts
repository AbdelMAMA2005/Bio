import { useInfiniteQuery } from '@tanstack/react-query';

import type { BackendCollectionItem } from '@/api/adapters';
import { toHerbariumDiscovery } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/AuthProvider';

const HERBARIUM_PAGE_SIZE = 20;

type BackendCollectionPage = { items: BackendCollectionItem[]; total: number };

async function fetchHerbariumPage(page: number): Promise<BackendCollectionPage> {
  const { data } = await apiClient.get<BackendCollectionPage>('/collection', {
    params: { type: 'discovered', page, limit: HERBARIUM_PAGE_SIZE },
  });
  return data;
}

/**
 * Même pattern que useMyGarden.ts : pagination réelle via useInfiniteQuery, `.data` reste
 * un tableau à plat pour les consommateurs existants (useTaggableCollection, ScanScreen...).
 */
export function useHerbarium() {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: queryKeys.herbarium,
    queryFn: ({ pageParam }) => fetchHerbariumPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: !!user,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((p) => p.items.map((item) => toHerbariumDiscovery(item, user!.id, API_BASE_URL))),
  };
}
