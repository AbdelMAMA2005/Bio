/**
 * Catalogue fixe des défis quotidiens (cahier des charges §6). Les valeurs
 * (objectif, récompenses) sont des constantes d'équilibrage, au même titre que
 * `calculateXpForRarity` (src/common/xp.ts) — ce n'est pas une donnée "démo" :
 * ce qui varie réellement par utilisateur, c'est la PROGRESSION, calculée en
 * direct depuis les vraies tables (voir QuestsService).
 */
export type QuestDefinition = {
  id: string;
  libelle: string;
  objectif: number;
  recompenseXp: number;
  recompensePieces: number;
  /** 'exploration' : nécessite un Geo-Tag + `User.latitudeReference` connu (voir QuestsService). */
  type?: 'quotidien' | 'exploration';
};

export const QUEST_CATALOG: QuestDefinition[] = [
  {
    id: 'scan-3',
    libelle: 'Scanner 3 plantes différentes',
    objectif: 3,
    recompenseXp: 30,
    recompensePieces: 0,
  },
  {
    id: 'add-garden',
    libelle: 'Ajouter une nouvelle plante à son Jardin',
    objectif: 1,
    recompenseXp: 20,
    recompensePieces: 0,
  },
  {
    id: 'publish-tip',
    libelle: "Publier une photo avec un conseil d'entretien",
    objectif: 1,
    recompenseXp: 25,
    recompensePieces: 10,
  },
  {
    id: 'get-5-likes',
    libelle: 'Recevoir 5 likes sur une publication',
    objectif: 5,
    recompenseXp: 0,
    recompensePieces: 20,
  },
  {
    id: 'explore-rare',
    libelle: 'Découvrir une espèce Rare ou Épique à plus de 1 km de chez vous',
    objectif: 1,
    recompenseXp: 50,
    recompensePieces: 30,
    type: 'exploration',
  },
];
