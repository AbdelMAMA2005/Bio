import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { findPlantDetail, wait } from '@/api/mock/store';
import type { PlantDetail } from '@/api/types';

async function fetchPlantDetail(id: string): Promise<PlantDetail | null> {
  return wait(findPlantDetail(id), 300);
}

export function usePlantDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.plantDetail(id),
    queryFn: () => fetchPlantDetail(id),
  });
}
