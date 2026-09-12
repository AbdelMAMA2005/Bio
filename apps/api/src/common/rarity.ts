/**
 * Rareté d'une espèce dérivée du nombre de fois qu'elle a déjà été capturée
 * (Jardin + Herbarium confondus, tous utilisateurs) AVANT la capture en cours.
 * Remplace le badgeRarete auparavant figé à "Commun" (voir BACKEND_ISSUES.md §5) :
 * ici la rareté est une vraie donnée dérivée de l'usage réel de l'app, pas une
 * constante — plus une espèce est capturée par la communauté, plus elle devient
 * "Commun", à l'inverse une première capture mondiale est "Épique".
 */
export function computeRarityFromPriorCaptures(
  priorCaptures: number,
): 'Épique' | 'Rare' | 'Commun' {
  if (priorCaptures === 0) return 'Épique';
  if (priorCaptures < 5) return 'Rare';
  return 'Commun';
}
