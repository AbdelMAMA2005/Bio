export type LevelTitleKey =
  | 'account.levels.beginner'
  | 'account.levels.apprentice'
  | 'account.levels.explorer'
  | 'account.levels.confirmed'
  | 'account.levels.expert';

export function levelTitleKey(niveau: number): LevelTitleKey {
  if (niveau < 5) return 'account.levels.beginner';
  if (niveau < 10) return 'account.levels.apprentice';
  if (niveau < 15) return 'account.levels.explorer';
  if (niveau < 20) return 'account.levels.confirmed';
  return 'account.levels.expert';
}

const XP_PER_LEVEL = 250;

export function xpTargetForLevel(niveau: number): number {
  return niveau * XP_PER_LEVEL;
}

export function levelProgress(niveau: number, xp: number): number {
  const target = xpTargetForLevel(niveau);
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, xp / target));
}

/**
 * `profiles.experience` est l'XP cumulée depuis l'inscription (créditée côté serveur par les
 * défis et les ajouts à la collection). On en déduit le niveau et l'XP déjà gagnée dans ce
 * niveau, avec la même règle que `addXp` : passer du niveau n au niveau n+1 coûte n × 250 XP.
 */
export function levelFromExperience(experience: number): { niveau: number; xp: number } {
  let niveau = 1;
  let xp = Math.max(0, Math.floor(experience || 0));
  while (xp >= xpTargetForLevel(niveau)) {
    xp -= xpTargetForLevel(niveau);
    niveau += 1;
  }
  return { niveau, xp };
}
