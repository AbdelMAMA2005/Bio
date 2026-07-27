/**
 * Traduit l'échelle d'arrosage structurée de Plant.id (`watering.min`/`max`, un
 * entier 1 à 3) en un libellé FR lisible pour la fiche détail plante.
 *
 * Vérifié empiriquement (23/07/2026, vraie clé API) : Plant.id n'a AUCUN champ
 * structuré "température" ou "habitat" (les deux cases historiques de la grille
 * de conseils d'entretien du front n'avaient donc jamais de vraie donnée
 * derrière — toujours "—"). `watering` est en revanche un vrai signal structuré,
 * différent par espèce (ex. cactus = 1, tomate/basilic/muguet = 2) — voir
 * rapport.md.
 */
export function describeWatering(watering: { min?: number; max?: number } | null | undefined): string | undefined {
  if (!watering || (watering.min == null && watering.max == null)) {
    return undefined;
  }

  const labels = ['Faible', 'Modéré', 'Abondant'];
  const labelFor = (value: number) => labels[Math.min(Math.max(Math.round(value), 1), 3) - 1];

  const min = watering.min ?? watering.max!;
  const max = watering.max ?? watering.min!;

  return min === max ? labelFor(min) : `${labelFor(min)} à ${labelFor(max)}`;
}

/**
 * Repli utilisé quand une plante n'a aucune donnée `watering` Plant.id exploitable
 * (espèce du seed, ou identifiée avant l'ajout de ce champ) — un intervalle "modéré"
 * plutôt que de ne jamais calculer de prochain arrosage.
 */
export const DEFAULT_WATERING_INTERVAL_DAYS = 7;

/**
 * Traduit la même échelle Plant.id (`watering.min`/`max`, 1 à 3) que `describeWatering`
 * en un intervalle d'arrosage concret, utilisé pour calculer `prochainArrosage`
 * (derniereArrosage + N jours) — un cactus (1) est espacé (10j), une tomate/un basilic
 * (2) modéré (5j), une plante tropicale humide (3) fréquent (2j).
 */
export function wateringIntervalDays(watering: { min?: number; max?: number } | null | undefined): number | undefined {
  if (!watering || (watering.min == null && watering.max == null)) {
    return undefined;
  }

  const intervalsByScale = [10, 5, 2];
  const min = watering.min ?? watering.max!;
  const max = watering.max ?? watering.min!;
  const avgScale = Math.min(Math.max(Math.round((min + max) / 2), 1), 3);

  return intervalsByScale[avgScale - 1];
}
