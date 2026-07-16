import { useQuery } from '@tanstack/react-query';

import { wait } from '@/api/mock/store';
import { mockBadges, type Badge } from '@/api/mock/badges';

async function fetchBadges(): Promise<Badge[]> {
  return wait([...mockBadges], 350);
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: fetchBadges });
}
