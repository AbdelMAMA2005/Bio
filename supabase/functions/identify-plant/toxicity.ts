export type Toxicity = 'green' | 'orange' | 'red';

// These conservative cutoffs are policy gates, not calibrated probabilities.
export function assessToxicity(extra: unknown, identificationScore: number): Toxicity {
  if (!extra || typeof extra !== 'object') return 'orange';
  const value = extra as Record<string, unknown>;
  const confidence = value.toxicityConfidence;
  if (!Number.isFinite(identificationScore) || identificationScore < 0.9 || identificationScore > 1
      || typeof confidence !== 'number' || !Number.isFinite(confidence)
      || confidence < 0.95 || confidence > 1
      || typeof value.toxicityReason !== 'string' || !value.toxicityReason.trim()) return 'orange';
  if (value.toxicity === 'toxic') return 'red';
  if (value.toxicity === 'non_toxic') return 'green';
  return 'orange';
}

export function preserveToxicWarning(previous: unknown, assessed: Toxicity): Toxicity {
  // An automated reevaluation must not erase an existing toxic warning.
  return previous === 'red' ? 'red' : assessed;
}

export const toxicityInstructions = `Évalue séparément la toxicité, sans déduire son innocuité de la photo ou de l'absence d'information.
toxic = toxicité connue pour l'humain OU les chats OU les chiens (ingestion ou contact).
non_toxic = absence de toxicité connue pour ces trois groupes, uniquement si tu disposes d'informations botaniques solides sur l'espèce exacte.
uncertain = doute, données insuffisantes, espèce ambiguë, informations contradictoires ou groupe non évalué.
Ne confonds jamais identification et toxicité. Donne toxicityConfidence entre 0 et 1 et toxicityReason expliquant les groupes concernés et tes limites. Ne prétends pas avoir consulté une source externe.
Si tu hésites, réponds uncertain. Non toxique ne signifie pas comestible.`;

export const enrichmentSchema = {
  type: 'object',
  properties: {
    toxicity: { type: 'string', enum: ['toxic', 'non_toxic', 'uncertain'] },
    toxicityConfidence: { type: 'number', minimum: 0, maximum: 1 },
    toxicityReason: { type: 'string' },
    badgeRarete: { type: 'string', enum: ['Commun', 'Rare', 'Épique'] },
    aPropos: { type: 'string' },
    conseilsEntretien: { type: 'object', properties: {
      lumiere: { type: 'string' }, sol: { type: 'string' }, arrosage: { type: 'string' }, multiplication: { type: 'string' },
    }, required: ['lumiere', 'sol', 'arrosage', 'multiplication'] },
    // Intervalle conseillé entre deux arrosages : alimente plants.frequence_arrosage_jours.
    frequenceArrosageJours: { type: 'integer', minimum: 1, maximum: 60 },
  }, required: ['toxicity', 'toxicityConfidence', 'toxicityReason', 'badgeRarete', 'aPropos', 'conseilsEntretien', 'frequenceArrosageJours'],
};
