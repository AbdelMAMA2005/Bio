/** XP attribuée à la capture selon la rareté (TODO.md phase 1). */
export function calculateXpForRarity(rarity: string | null): number {
  if (rarity === 'Épique') return 100;
  if (rarity === 'Rare') return 50;
  return 25;
}
