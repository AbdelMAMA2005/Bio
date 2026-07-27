import { useQuery } from '@tanstack/react-query';

import { badgesFromInsignes, type BackendUser } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';
import { wait } from '@/api/mock/store';
import { mockBadges, type Badge } from '@/api/mock/badges';

/**
 * GET /users/me existe désormais côté back et renvoie `insignes: string[]`
 * (voir API_CONTRACT.md §2) : on croise avec le catalogue front pour obtenir
 * nom/description/statut d'obtention. Repli mock via EXPO_PUBLIC_USE_MOCK_API.
 */
async function fetchBadges(): Promise<Badge[]> {
  if (USE_MOCK_API) return wait([...mockBadges], 350);

  const { data } = await apiClient.get<BackendUser>('/users/me');
  return badgesFromInsignes(data.insignes ?? [], mockBadges);
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: fetchBadges });
}
