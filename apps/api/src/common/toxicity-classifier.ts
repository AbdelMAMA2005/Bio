import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';

/**
 * Classe la toxicité réelle d'une espèce à partir de la réponse Plant.id.
 *
 * Remplace un classifieur par mots-clés qui ne regardait QUE le texte libre
 * `details.toxicity` : il suffisait que le mot "toxic" apparaisse une seule fois
 * dans le texte pour classer toute l'espèce ROUGE, même quand ce texte décrit un
 * risque partiel (ex. "le fruit mûr est comestible, mais les feuilles et tiges
 * sont toxiques"). Vérifié en conditions réelles (23/07/2026) : la tomate
 * (`Solanum lycopersicum`) et la mangue (`Mangifera indica`) — deux fruits
 * comestibles très communs — étaient toutes deux classées "Toxique" à cause de
 * ce défaut, alors que Plant.id fournit par ailleurs un champ structuré
 * `edible_parts` qui dit explicitement quelles parties sont comestibles.
 *
 * Nouvelle logique, ancrée sur `edible_parts` (donnée structurée, plus fiable
 * qu'une analyse de texte libre) :
 * - Pas de texte de toxicité du tout → `incertaine` (jamais une fausse
 *   assurance "non toxique" en l'absence de donnée).
 * - Texte de toxicité qui ne mentionne aucun risque réel (ou le nie
 *   explicitement, ex. "generally safe") → `non_toxique`.
 * - Risque mentionné, ET aucune partie comestible listée (ou termes de gravité
 *   du type "toute la plante"/"hautement toxique") → `toxique` : rien chez
 *   cette espèce n'est sans danger.
 * - Risque mentionné, MAIS au moins une partie réellement comestible listée →
 *   cas mixte (ex. tomate, mangue) : ni "sans danger" ni "toxique" en bloc ne
 *   seraient honnêtes → `incertaine`.
 */
export function classifyToxicity(toxicityText: string | null | undefined, edibleParts: string[] | null | undefined): ToxicityLevel {
  if (!toxicityText) {
    return ToxicityLevel.ORANGE;
  }

  const text = toxicityText.toLowerCase();
  const hasEdibleParts = Array.isArray(edibleParts) && edibleParts.length > 0;

  const explicitlySafe =
    /non[\s-]?toxique|non-toxic|not toxic|sans danger|generally safe|considered safe|no known toxic|not known to be toxic/.test(
      text,
    );
  const mentionsToxicity = /toxi[qc]|poisonous|dangereux|harmful if ingested|cardiac glycosides/.test(text);
  const severe = /highly toxic|extremely toxic|all parts|hautement toxique|très toxique|toutes les parties/.test(text);

  if (!mentionsToxicity || explicitlySafe) {
    return ToxicityLevel.GREEN;
  }

  if (!hasEdibleParts || severe) {
    return ToxicityLevel.RED;
  }

  return ToxicityLevel.ORANGE;
}
