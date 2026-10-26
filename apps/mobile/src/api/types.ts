import type { CollectionItem, Plante, StoryGroup as SharedStoryGroup, StoryMedia as SharedStoryMedia } from '@planai/shared';

import type { IconName } from '@/theme/icons';

/** Résultat d'un diagnostic santé (Edge Function diagnose-health), affiché par DiagnosisSheet. */
export type DiagnosisResult =
  | { status: 'healthy'; confidence: number }
  | { status: 'disease'; diseaseIcon: string; diseaseName: string; confidence: number; treatment: string };

export type ConseilsEntretien = {
  light: string;
  soil: string;
  arrosage: string;
  multiplication: string;
};

export function parseConseilsEntretien(raw: string): ConseilsEntretien {
  return JSON.parse(raw) as ConseilsEntretien;
}

/** Icône représentant l'espèce (silhouette utilisée en attendant la vraie photo). */
export type PlantWithIcon = Plante & { icon: IconName };

/**
 * Vraie photo de CET exemplaire capturé (première entrée de `historiquePhotos`, uploadée
 * juste après l'ajout — voir ScanScreen.tsx), à préférer à l'image générique du référentiel
 * d'espèce (`plant.urlImage`, partagée par tous les utilisateurs de cette espèce). Les deux
 * sont transmises séparément à `<PlantPhoto>` (pas fusionnées ici) : un lien cassé
 * (fichier disparu) doit retomber sur le second plutôt que rester silencieusement vide —
 * voir `components/PlantPhoto.tsx`.
 */
export function ownPhotoUrl(item: CollectionItem): string | undefined {
  return item.historiquePhotos?.[0]?.url || undefined;
}

export type WateringSchedule =
  | { key: 'jardin.today' }
  | { key: 'jardin.tomorrow' }
  | { key: 'jardin.inDays'; count: number };

export type GardenClone = {
  item: CollectionItem;
  plant: PlantWithIcon;
  nextWatering: WateringSchedule;
  lightHint: string;
  /**
   * Dernier diagnostic sauvegardé (`item.dernierDiagnostic`, déjà converti). `undefined` si
   * jamais diagnostiquée. Le bouton "Voir le diagnostic" (CloneCard) n'est affiché que si
   * `item.etatSante === 'malade'` ET ce champ présent
   * (le bouton se masque si la plante redevient saine, mais la donnée reste en base).
   */
  savedDiagnosis?: { result: DiagnosisResult; date: string };
};

export type HerbariumDiscovery = {
  item: CollectionItem;
  plant: PlantWithIcon;
  placeLabel: string;
};

/** `urlMedia` déjà résolue en URL absolue (voir `adapters.ts#toStoryGroup`). */
export type StoryMedia = Omit<SharedStoryMedia, 'urlMedia'> & { urlMedia: string };

export type StoryGroup = Omit<SharedStoryGroup, 'medias'> & { medias: StoryMedia[] };

export type FeedPost = {
  id: string;
  authorId: string;
  authorInitial: string;
  authorName: string;
  /** Vraie photo de profil de l'auteur, `null` si jamais définie (repli initiales). */
  authorAvatarUrl: string | null;
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

export type FeedComment = {
  id: string;
  authorId: string;
  authorInitial: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  text: string;
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
  /** Voir `ownPhotoUrl` — vraie photo de cet exemplaire si disponible. */
  ownPhotoUrl?: string;
};

export type Quest = {
  id: string;
  label: string;
  done: boolean;
  rewardXp?: number;
  rewardCoins?: number;
  /** 'exploration' : défi géolocalisé, affiché avec une icône dédiée. */
  type: 'quotidien' | 'exploration';
};

export type IdentificationResult = {
  plant: PlantWithIcon;
  confidence: number;
  xpAwarded: number;
};
