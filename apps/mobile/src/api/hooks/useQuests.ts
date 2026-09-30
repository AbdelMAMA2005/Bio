import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import type { Quest } from '@/api/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

type BackendQuest = {
  id: string;
  libelle: string;
  type: 'quotidien' | 'exploration';
  progression: number;
  objectif: number;
  complete: boolean;
  recompense: { xp: number; pieces: number };
};

/**
 * Les défis eux-mêmes sont un catalogue fixe (5 défis, dont 1 Exploration géolocalisé,
 * voir apps/api/src/modules/quests/quest-catalog.ts) — seule leur PROGRESSION change
 * réellement par utilisateur. On garde donc des libellés traduits localement par
 * id plutôt que d'afficher le `libelle` français brut renvoyé par le back (pas
 * adapté aux utilisateurs EN/ES), avec repli sur ce libelle si jamais un id
 * inconnu apparaissait (nouveau défi pas encore traduit côté front).
 */
const LABEL_KEY_BY_QUEST_ID: Record<string, string> = {
  'scan-3': 'quests.scan3',
  'add-garden': 'quests.addGarden',
  'publish-tip': 'quests.postTip',
  'get-5-likes': 'quests.get5Likes',
  'explore-rare': 'quests.rare1km',
};

function toFrontQuest(backend: BackendQuest): Quest {
  return {
    id: backend.id,
    label: LABEL_KEY_BY_QUEST_ID[backend.id] ?? backend.libelle,
    done: backend.complete,
    rewardXp: backend.recompense.xp > 0 ? backend.recompense.xp : undefined,
    rewardCoins: backend.recompense.pieces > 0 ? backend.recompense.pieces : undefined,
    type: backend.type,
  };
}

async function fetchQuestsFromApi(): Promise<Quest[]> {
  const { data, error } = await supabase.rpc('get_daily_quests');
  if (error) {
    // Older Supabase deployments may not have the optional quests RPC yet.
    // Quests must not prevent the rest of the authenticated app from loading.
    if (error.code === 'PGRST202') return [];
    console.error('[quests] Supabase RPC failed', error);
    throw error;
  }
  return ((data ?? []) as BackendQuest[]).map(toFrontQuest);
}

export function useQuests() {
  const { user, refreshUser } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.quests,
    queryFn: async () => {
      const quests = await fetchQuestsFromApi();
      // Un défi peut venir de se compléter (XP/pièces crédités côté back à
      // l'instant) : on resynchronise le profil pour que le solde affiché soit
      // toujours la vraie valeur serveur, jamais une estimation locale.
      refreshUser().catch(() => {});
      return quests;
    },
  });

  return {
    ...query,
    data: query.data ? { quests: query.data, coins: user?.pieces ?? 0 } : undefined,
  };
}
