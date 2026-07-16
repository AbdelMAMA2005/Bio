import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { herbariumDiscoveries, wait } from '@/api/mock/store';
import type { HerbariumDiscovery } from '@/api/types';

async function fetchHerbarium(): Promise<HerbariumDiscovery[]> {
  return wait([...herbariumDiscoveries], 400);
}

export function useHerbarium() {
  return useQuery({ queryKey: queryKeys.herbarium, queryFn: fetchHerbarium });
}
