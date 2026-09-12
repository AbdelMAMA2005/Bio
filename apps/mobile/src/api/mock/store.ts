import type { User } from '@planai/shared';

import type {
  FeedPost,
  GardenClone,
  HerbariumDiscovery,
  IdentificationResult,
  PlantDetail,
  Quest,
  TaggableCollectionItem,
} from '@/api/types';

import { mockPlants } from './plants';

export function wait<T>(value: T, ms = 550): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export const currentUser: User = {
  id: 'user-lea',
  pseudo: 'Léa Fontaine',
  email: 'lea.fontaine@example.com',
  niveau: 12,
  xp: 2480,
  pieces: 340,
  urlAvatar: null,
};

export const gardenClones: GardenClone[] = [
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.monstera.id,
      dateAjout: daysAgoIso(48),
      type: 'owned',
      etatSante: 'sain',
    },
    plant: mockPlants.monstera,
    nextWatering: { key: 'jardin.tomorrow' },
    lightHint: 'Lumière indirecte',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.lavande.id,
      dateAjout: daysAgoIso(120),
      type: 'owned',
      etatSante: 'malade',
      historiquePhotos: [],
    },
    plant: mockPlants.lavande,
    nextWatering: { key: 'jardin.inDays', count: 3 },
    lightHint: 'Plein soleil',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.calathea.id,
      dateAjout: daysAgoIso(20),
      type: 'owned',
      etatSante: 'alerte',
    },
    plant: mockPlants.calathea,
    nextWatering: { key: 'jardin.today' },
    lightHint: 'Mi-ombre',
  },
];

export const herbariumDiscoveries: HerbariumDiscovery[] = [
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.orchideeSauvage.id,
      dateAjout: daysAgoIso(3),
      type: 'discovered',
      latitude: 49.4172,
      longitude: 2.9022,
    },
    plant: mockPlants.orchideeSauvage,
    placeLabel: 'Forêt de Compiègne',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.monsteraSauvage.id,
      dateAjout: daysAgoIso(7),
      type: 'discovered',
    },
    plant: mockPlants.monsteraSauvage,
    placeLabel: 'à 3 km',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.fougereRoyale.id,
      dateAjout: daysAgoIso(14),
      type: 'discovered',
      latitude: 45.7797,
      longitude: 4.8322,
    },
    plant: mockPlants.fougereRoyale,
    placeLabel: 'Parc de la Tête d’Or',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.pissenlit.id,
      dateAjout: daysAgoIso(14),
      type: 'discovered',
    },
    plant: mockPlants.pissenlit,
    placeLabel: 'à 500 m',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.coquelicot.id,
      dateAjout: daysAgoIso(30),
      type: 'discovered',
      latitude: 45.7746,
      longitude: 4.8322,
    },
    plant: mockPlants.coquelicot,
    placeLabel: 'Croix-Rousse',
  },
  {
    item: {
      idUtilisateur: currentUser.id,
      idPlante: mockPlants.digitale.id,
      dateAjout: daysAgoIso(30),
      type: 'discovered',
    },
    plant: mockPlants.digitale,
    placeLabel: 'Monts du Lyonnais',
  },
];

export const feedPosts: FeedPost[] = [
  {
    id: 'post-1',
    authorId: 'user-marco',
    authorInitial: 'M',
    authorName: 'Marco_Botanic',
    authorAvatarUrl: null,
    createdAt: daysAgoIso(1 / 12),
    plant: mockPlants.orchideeSauvage,
    tagType: 'discovered',
    caption:
      'Trouvée en pleine floraison au bord du sentier. Espèce protégée : on observe, on ne cueille pas !',
    likes: 248,
    liked: false,
    comments: 31,
    distanceMeters: 2000,
  },
  {
    id: 'post-2',
    authorId: 'user-sophie',
    authorInitial: 'S',
    authorName: 'Sophie.Verde',
    authorAvatarUrl: null,
    createdAt: daysAgoIso(5 / 24),
    plant: mockPlants.calathea,
    tagType: 'owned',
    caption:
      "Astuce : si les feuilles jaunissent, vérifiez l'humidité ! Un plateau de billes d'argile change tout.",
    likes: 97,
    liked: false,
    comments: 12,
    distanceMeters: null,
  },
  {
    id: 'post-3',
    authorId: 'user-theo',
    authorInitial: 'T',
    authorName: 'Theo_Green',
    authorAvatarUrl: null,
    createdAt: daysAgoIso(1),
    plant: mockPlants.digitale,
    tagType: 'discovered',
    caption:
      'Magnifique mais très toxique — ne pas toucher puis se frotter les yeux. Repérée en lisière de forêt.',
    likes: 156,
    liked: false,
    comments: 24,
    distanceMeters: 4500,
  },
  {
    id: 'post-4',
    authorId: 'user-aida',
    authorInitial: 'A',
    authorName: 'Aida.Plants',
    authorAvatarUrl: null,
    createdAt: daysAgoIso(1),
    plant: mockPlants.monstera,
    tagType: 'owned',
    caption: 'Jour 7 de ma bouture : première racine ! Tuto complet en story.',
    likes: 64,
    liked: false,
    comments: 8,
    distanceMeters: null,
  },
];

export const dailyQuests: Quest[] = [
  { id: 'quest-scan-3', label: 'quests.scan3', done: true, rewardXp: 30, type: 'quotidien' },
  { id: 'quest-post-tip', label: 'quests.postTip', done: false, rewardXp: 40, type: 'quotidien' },
  { id: 'quest-rare-1km', label: 'quests.rare1km', done: false, rewardCoins: 50, type: 'exploration' },
];

export const dailyCoinsBalance = 340;

export const xpByRarity = { commun: 15, rare: 45, epique: 90 } as const;

const identifyPool = ['orchideeSauvage', 'monsteraSauvage', 'fougereRoyale', 'coquelicot'] as const;
let identifyCursor = 0;

export function pickNextIdentification(): IdentificationResult {
  const key = identifyPool[identifyCursor % identifyPool.length];
  identifyCursor += 1;
  const plant = mockPlants[key];
  return {
    plant,
    confidence: Math.round(82 + Math.random() * 16),
    xpAwarded: xpByRarity[plant.rarete],
  };
}

export function addCollectionItem(
  plant: IdentificationResult['plant'],
  type: 'owned' | 'discovered',
  geoTagged: boolean,
) {
  const base = {
    idUtilisateur: currentUser.id,
    idPlante: plant.id,
    dateAjout: new Date().toISOString(),
  };
  if (type === 'owned') {
    gardenClones.unshift({
      item: { ...base, type: 'owned', etatSante: 'sain' },
      plant,
      nextWatering: { key: 'jardin.inDays', count: 5 },
      lightHint: 'À déterminer',
    });
  } else {
    herbariumDiscoveries.unshift({
      item: {
        ...base,
        type: 'discovered',
        ...(geoTagged ? { latitude: 45.75, longitude: 4.85 } : {}),
      },
      plant,
      placeLabel: geoTagged ? 'Position enregistrée' : 'Position non partagée',
    });
  }
}

export function setCloneHealth(idPlante: string, etatSante: GardenClone['item']['etatSante']) {
  const clone = gardenClones.find((c) => c.item.idPlante === idPlante);
  if (clone) clone.item.etatSante = etatSante;
}

export function addCloneTrackingPhoto(idPlante: string, uri: string) {
  const clone = gardenClones.find((c) => c.item.idPlante === idPlante);
  if (!clone) return;
  const photo = { url: uri, date: new Date().toISOString() };
  clone.item.historiquePhotos = [...(clone.item.historiquePhotos ?? []), photo];
}

export function toggleLike(postId: string) {
  const post = feedPosts.find((p) => p.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
}

export function findPlantDetail(plantId: string): PlantDetail | null {
  const discovery = herbariumDiscoveries.find((d) => d.plant.id === plantId);
  if (discovery) return { plant: discovery.plant, placeLabel: discovery.placeLabel, dateAjout: discovery.item.dateAjout };

  const clone = gardenClones.find((c) => c.plant.id === plantId);
  if (clone) return { plant: clone.plant, placeLabel: '', dateAjout: clone.item.dateAjout };

  const post = feedPosts.find((p) => p.plant?.id === plantId);
  if (post?.plant) return { plant: post.plant, placeLabel: '', dateAjout: post.createdAt };

  return null;
}

export function getTaggableCollectionItems(): TaggableCollectionItem[] {
  return [
    ...gardenClones.map((c) => ({ collectionItemId: c.plant.id, plant: c.plant, type: 'owned' as const })),
    ...herbariumDiscoveries.map((d) => ({ collectionItemId: d.plant.id, plant: d.plant, type: 'discovered' as const })),
  ];
}

export function addPost(input: { imageUri: string; texte: string; collectionItemId?: string }): FeedPost {
  const tagged = input.collectionItemId
    ? getTaggableCollectionItems().find((item) => item.collectionItemId === input.collectionItemId)
    : undefined;

  const post: FeedPost = {
    id: `post-${Date.now()}`,
    authorId: currentUser.id,
    authorInitial: currentUser.pseudo.charAt(0),
    authorName: currentUser.pseudo,
    authorAvatarUrl: currentUser.urlAvatar,
    createdAt: new Date().toISOString(),
    plant: tagged?.plant,
    tagType: tagged?.type,
    imageUri: input.imageUri,
    caption: input.texte,
    likes: 0,
    liked: false,
    comments: 0,
    distanceMeters: null,
  };
  feedPosts.unshift(post);
  return post;
}
