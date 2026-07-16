import type { CollectionItem, Plante } from '@planai/shared';

import type { IconName } from '@/theme/icons';

export type ConseilsEntretien = {
  light: string;
  soil: string;
  temperature: string;
  habitat: string;
  about: string;
};

export function parseConseilsEntretien(raw: string): ConseilsEntretien {
  return JSON.parse(raw) as ConseilsEntretien;
}

/** Icône représentant l'espèce (silhouette utilisée en attendant la vraie photo). */
export type PlantWithIcon = Plante & { icon: IconName };

export type WateringSchedule =
  | { key: 'jardin.today' }
  | { key: 'jardin.tomorrow' }
  | { key: 'jardin.inDays'; count: number };

export type GardenClone = {
  item: CollectionItem;
  plant: PlantWithIcon;
  nextWatering: WateringSchedule;
  lightHint: string;
};

export type HerbariumDiscovery = {
  item: CollectionItem;
  plant: PlantWithIcon;
  placeLabel: string;
};

export type Story = {
  id: string;
  initial: string;
  name: string;
  imageUri?: string;
};

export type FeedPost = {
  id: string;
  authorInitial: string;
  authorName: string;
  createdAt: string;
  /** Présent uniquement si l'auteur a taggé une plante de sa collection. */
  plant?: PlantWithIcon;
  /** Détermine l'icône du chip plante taguée : jardin perso vs découverte sauvage. */
  tagType?: 'owned' | 'discovered';
  /** Photo réelle (picker) — sinon on retombe sur la vignette icône de la plante taguée. */
  imageUri?: string;
  caption: string;
  likes: number;
  liked: boolean;
  comments: number;
  distanceMeters: number | null;
};

export type TaggableCollectionItem = {
  collectionItemId: string;
  plant: PlantWithIcon;
  type: 'owned' | 'discovered';
};

export type PlantDetail = {
  plant: PlantWithIcon;
  placeLabel: string;
  dateAjout: string;
};

export type Quest = {
  id: string;
  label: string;
  done: boolean;
  rewardXp?: number;
  rewardCoins?: number;
};

export type IdentificationResult = {
  plant: PlantWithIcon;
  confidence: number;
  xpAwarded: number;
};
