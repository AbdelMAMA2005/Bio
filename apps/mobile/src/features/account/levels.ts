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
