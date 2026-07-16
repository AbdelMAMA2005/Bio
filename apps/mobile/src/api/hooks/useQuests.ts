import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { dailyCoinsBalance, dailyQuests, wait } from '@/api/mock/store';
import type { Quest } from '@/api/types';

async function fetchQuests(): Promise<{ quests: Quest[]; coins: number }> {
  return wait({ quests: [...dailyQuests], coins: dailyCoinsBalance }, 350);
}

export function useQuests() {
  return useQuery({ queryKey: queryKeys.quests, queryFn: fetchQuests });
}
