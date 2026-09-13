/**
 * Valeurs de graine pour les tables éditables depuis la console admin (`quests`,
 * `feature_flags`) — utilisées à la fois par `scripts/seed.ts` (premier démarrage réel)
 * et en repli paresseux par AdminQuestsService/AdminSettingsService (si la table est
 * encore vide, par exemple dans un environnement de test qui n'exécute jamais le script
 * de seed) : jamais deux listes de valeurs par défaut à maintenir en parallèle.
 */
export const DEFAULT_FEATURE_FLAGS = [
  {
    cle: 'geotag',
    libelle: 'Geo-Tag communautaire',
    description: 'Partage de position sur les découvertes',
    actif: true,
  },
  {
    cle: 'stories',
    libelle: 'Stories 24 h',
    description: 'Publication de stories éphémères',
    actif: true,
  },
  {
    cle: 'moderationAuto',
    libelle: 'Modération automatique',
    description: 'Masquage auto au-delà de 10 signalements',
    actif: false,
  },
  {
    cle: 'coins',
    libelle: 'Pièces virtuelles',
    description: 'Gains et boutique de badges',
    actif: true,
  },
];
