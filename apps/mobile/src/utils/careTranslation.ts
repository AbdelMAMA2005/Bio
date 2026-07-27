import type { ConseilsEntretien } from '@/api/types';
import type { SupportedLanguage } from '@/i18n';

/**
 * `best_light_condition` / `best_soil_type` / `propagation_methods` viennent de Plant.id en
 * anglais brut, non traduits par le paramètre `language=fr` de la requête d'identification
 * (voir `apps/api/.../identification.service.ts`) : ce paramètre ne couvre que les noms
 * d'espèce/la description chez Plant.id, pas ces champs catégoriels. `arrosage` n'est PAS
 * concerné : déjà calculé en français côté back (`common/watering.ts`).
 *
 * Dictionnaire heuristique du vocabulaire horticole anglais le plus courant renvoyé par
 * Plant.id pour ces 3 champs — traduction phrase la plus longue en premier (pour matcher
 * "rich in organic matter" avant "organic matter"). Une tournure non couverte par le
 * dictionnaire reste affichée telle quelle (anglais) plutôt qu'une traduction partielle
 * hasardeuse — voir rapport.md pour la couverture réelle et ses limites.
 */

const LIGHT_FR: Record<string, string> = {
  'full sun': 'Plein soleil',
  'partial sun': 'Mi-soleil',
  'partial shade': 'Mi-ombre',
  'full shade': 'Ombre complète',
  shade: 'Ombre',
  sun: 'Soleil',
  'bright indirect light': 'Lumière indirecte vive',
  'indirect light': 'Lumière indirecte',
  'direct sunlight': 'Soleil direct',
  'direct light': 'Lumière directe',
  'bright light': 'Lumière vive',
  'filtered light': 'Lumière filtrée',
  'low light': 'Faible luminosité',
  'morning sun': 'Soleil du matin',
  'afternoon sun': "Soleil de l'après-midi",
};

const SOIL_FR: Record<string, string> = {
  'rich in organic matter': 'riche en matière organique',
  'organic matter': 'matière organique',
  'well-drained': 'bien drainé',
  'well drained': 'bien drainé',
  'well-draining': 'bien drainant',
  'poorly drained': 'mal drainé',
  'nutrient-rich': 'riche en nutriments',
  sandy: 'sableux',
  loamy: 'limoneux',
  clayey: 'argileux',
  clay: 'argileux',
  acidic: 'acide',
  alkaline: 'alcalin',
  neutral: 'neutre',
  moist: 'humide',
  fertile: 'fertile',
  rocky: 'rocailleux',
  chalky: 'calcaire',
  peaty: 'tourbeux',
  poor: 'pauvre',
  dry: 'sec',
  soil: 'sol',
};

const PROPAGATION_FR: Record<string, string> = {
  seed: 'Semis',
  seeds: 'Semis',
  'stem cutting': 'Bouturage de tige',
  'stem cuttings': 'Bouturage de tige',
  'leaf cutting': 'Bouturage de feuille',
  'leaf cuttings': 'Bouturage de feuille',
  'root cutting': 'Bouturage de racine',
  'root cuttings': 'Bouturage de racine',
  cutting: 'Bouturage',
  cuttings: 'Bouturage',
  division: 'Division',
  grafting: 'Greffage',
  'air layering': 'Marcottage aérien',
  layering: 'Marcottage',
  bulbs: 'Bulbes',
  bulb: 'Bulbe',
  tubers: 'Tubercules',
  tuber: 'Tubercule',
  runners: 'Stolons',
  offsets: 'Rejets',
  offset: 'Rejet',
  spores: 'Spores',
  rhizomes: 'Rhizomes',
  rhizome: 'Rhizome',
  suckers: 'Drageons',
};

const CONNECTORS_FR: Record<string, string> = { to: 'à', and: 'et' };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyDictionary(text: string, dictionary: Record<string, string>): string {
  // Entrées les plus longues d'abord, sinon "organic matter" matcherait avant "rich in
  // organic matter" et casserait la traduction de la phrase complète.
  const entries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
  return entries.reduce(
    (result, [en, fr]) => result.replace(new RegExp(`\\b${escapeRegExp(en)}\\b`, 'gi'), fr),
    text,
  );
}

function translatePhrase(text: string | undefined, dictionary: Record<string, string>): string | undefined {
  if (!text || text === '—') return text;
  return applyDictionary(applyDictionary(text, dictionary), CONNECTORS_FR);
}

function translateMultiplication(text: string | undefined): string | undefined {
  if (!text || text === '—') return text;
  // `propagation_methods.join(', ')` côté back : chaque terme se traduit indépendamment
  // plutôt que la phrase entière (vocabulaire fermé, contrairement à light/soil).
  return text
    .split(', ')
    .map((part) => PROPAGATION_FR[part.trim().toLowerCase()] ?? part.trim())
    .join(', ');
}

/**
 * `arrosage` n'est jamais touché (déjà français). `light`/`soil`/`multiplication` sont
 * traduits uniquement pour l'interface française — l'anglais Plant.id est déjà correct
 * pour une UI en anglais ; l'espagnol n'a pas de dictionnaire pour l'instant (repli anglais,
 * voir rapport.md).
 */
export function translateCareAdvice(care: ConseilsEntretien, language: SupportedLanguage): ConseilsEntretien {
  if (language !== 'fr') return care;
  return {
    ...care,
    light: translatePhrase(care.light, LIGHT_FR) ?? care.light,
    soil: translatePhrase(care.soil, SOIL_FR) ?? care.soil,
    multiplication: translateMultiplication(care.multiplication) ?? care.multiplication,
  };
}
