import type { CollectionItem, Plante, Rarete, Toxicite, User } from '@planai/shared';

import type { ConseilsEntretien, FeedPost, GardenClone, HerbariumDiscovery, PlantWithIcon } from '@/api/types';

/**
 * Le backend réel (apps/api, voir API_CONTRACT.md pour le détail vérifié) parle un format
 * brut différent des types internes de packages/shared : toxicité/santé en
 * 'green'|'orange'|'red' au lieu de 'toxique'|'non_toxique'|'incertaine' côté front,
 * rareté en chaîne libre ("Commun", toujours cette valeur en pratique) au lieu d'un enum,
 * conseilsEntretien en objet {arrosage,lumiere,temperature,rempotage} (toujours null en
 * pratique) au lieu du JSON string attendu par le front, etc. Ce fichier isole TOUTE la
 * traduction à un seul endroit pour que le reste du front reste écrit contre les types
 * "propres" de packages/shared, sans jamais voir les valeurs brutes du back.
 */

// ----- Toxicité -----

export type BackendToxicity = 'green' | 'orange' | 'red';

export function toxiciteFromBackend(value: BackendToxicity | null | undefined): Toxicite {
  switch (value) {
    case 'red':
      return 'toxique';
    case 'orange':
      return 'incertaine';
    case 'green':
    default:
      return 'non_toxique';
  }
}

// ----- Rareté -----

export function rareteFromBadge(badgeRarete: string | null | undefined): Rarete {
  const normalized = (badgeRarete ?? '').trim().toLowerCase();
  if (normalized === 'rare') return 'rare';
  if (normalized === 'épique' || normalized === 'epique') return 'epique';
  return 'commun';
}

// ----- Conseils d'entretien -----

export type BackendConseilsEntretien = {
  arrosage?: string;
  lumiere?: string;
  temperature?: string;
  rempotage?: string;
} | null;

/**
 * Le back n'alimente jamais ce champ pour l'instant (toujours `null` — cf.
 * IdentificationService.processPlantIdResponse). On sérialise ce qu'il fournit
 * (ou un jeu de valeurs de repli) au format string que `parseConseilsEntretien`
 * attend côté front, avec un remappage des champs FR (arrosage/rempotage n'ont
 * pas d'équivalent dans le shape front actuel : light/soil/temperature/habitat).
 */
export function serializeConseilsEntretien(raw: BackendConseilsEntretien): string {
  const fallback = '—';
  const care: ConseilsEntretien = {
    light: raw?.lumiere ?? fallback,
    soil: raw?.rempotage ?? fallback,
    temperature: raw?.temperature ?? fallback,
    habitat: fallback,
    about: raw?.arrosage ? `Arrosage : ${raw.arrosage}` : '',
  };
  return JSON.stringify(care);
}

// ----- Icône plante (le back n'a pas de notion d'icône, uniquement urlImage) -----

function iconForPlant(): PlantWithIcon['icon'] {
  // Pas de signal exploitable côté back pour choisir une icône par espèce ; le
  // vrai visuel (urlImage) devrait être préféré dès qu'il sera alimenté par Abdel.
  return 'eco';
}

// ----- Plante -----

type BackendPlantFields = {
  nomScientifique: string;
  nomCommun: string;
  famille?: string | null;
  toxicite: BackendToxicity;
  badgeRarete?: string | null;
  conseilsEntretien?: BackendConseilsEntretien;
};

export function toPlantWithIcon(id: string, backend: BackendPlantFields): PlantWithIcon {
  const plante: Plante = {
    id,
    nomScientifique: backend.nomScientifique,
    nomCommun: backend.nomCommun,
    famille: backend.famille ?? '',
    toxicite: toxiciteFromBackend(backend.toxicite),
    rarete: rareteFromBadge(backend.badgeRarete),
    conseilsEntretien: serializeConseilsEntretien(backend.conseilsEntretien ?? null),
  };
  return { ...plante, icon: iconForPlant() };
}

// ----- Utilisateur -----

export type BackendUser = {
  id: string;
  email: string;
  nomUtilisateur: string;
  experience: number;
  niveau: number;
  insignes?: string[];
};

export function userFromBackend(backend: BackendUser): User {
  return {
    id: backend.id,
    pseudo: backend.nomUtilisateur,
    email: backend.email,
    niveau: backend.niveau,
    xp: backend.experience,
  };
}

// ----- Identification (POST /identification) -----

export type BackendIdentifyResponse = {
  plantId: string;
  nomScientifique: string;
  nomCommun: string;
  famille: string | null;
  toxicite: BackendToxicity;
  badgeRarete: string | null;
  conseilsEntretien: BackendConseilsEntretien;
  urlImage: string | null;
  xpGagne: number;
};

// ----- Collection (GET /collection) -----

export type BackendCollectionItem = {
  id: string;
  idPlante: string;
  nomScientifique: string;
  nomCommun: string;
  badgeRarete: string | null;
  toxicite: BackendToxicity;
  etatSante: 'green' | 'orange' | 'red';
  dateAjout: string;
  urlImage: string | null;
  latitude: number | null;
  longitude: number | null;
};

function etatSanteFromBackend(value: BackendCollectionItem['etatSante']): NonNullable<CollectionItem['etatSante']> {
  switch (value) {
    case 'red':
      return 'malade';
    case 'orange':
      return 'alerte';
    case 'green':
    default:
      return 'sain';
  }
}

/**
 * Le back ne renvoie ni planification d'arrosage ni indice de lumière (pas de
 * module `reminders`/`diagnosis` branché sur la liste) : on affiche une valeur
 * de repli plutôt que d'inventer une donnée. Voir BACKEND_ISSUES.md §6.
 */
export function toGardenClone(item: BackendCollectionItem, userId: string): GardenClone {
  return {
    item: {
      id: item.id,
      idUtilisateur: userId,
      idPlante: item.idPlante,
      dateAjout: item.dateAjout,
      type: 'owned',
      etatSante: etatSanteFromBackend(item.etatSante),
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
    },
    plant: toPlantWithIcon(item.idPlante, item),
    nextWatering: { key: 'jardin.today' },
    lightHint: '—',
  };
}

export function toHerbariumDiscovery(item: BackendCollectionItem, userId: string): HerbariumDiscovery {
  return {
    item: {
      id: item.id,
      idUtilisateur: userId,
      idPlante: item.idPlante,
      dateAjout: item.dateAjout,
      type: 'discovered',
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
    },
    plant: toPlantWithIcon(item.idPlante, item),
    // Le back ne fait pas de reverse-geocoding (lieuLabel du contrat) : on
    // n'affiche les coordonnées que si elles existent, sans lieu nommé.
    placeLabel: item.latitude !== null && item.longitude !== null ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}` : '',
  };
}

// ----- Feed (GET/POST /feed) -----

export type BackendPost = {
  id: string;
  idUtilisateur: string;
  contenuTexte: string;
  imageUrl?: string;
  dateCreation: string;
  auteur: { id: string; nomUtilisateur: string; urlAvatar?: string | null };
  plante?: { id: string; nomScientifique: string; nomCommun: string; badgeRarete?: string | null; urlImage?: string | null };
  likesCount: number;
  commentairesCount: number;
  estLikedParUtilisateur: boolean;
};

export function toFeedPost(post: BackendPost, apiBaseUrl: string): FeedPost {
  const resolvedImageUrl = post.imageUrl
    ? post.imageUrl.startsWith('http')
      ? post.imageUrl
      : `${apiBaseUrl}${post.imageUrl}`
    : undefined;

  return {
    id: post.id,
    authorInitial: post.auteur.nomUtilisateur.charAt(0).toUpperCase(),
    authorName: post.auteur.nomUtilisateur,
    createdAt: post.dateCreation,
    // Le back ne renvoie pas le type owned/discovered de la collection taguée :
    // faute d'info, on l'assimile toujours à "owned" (jardin perso).
    plant: post.plante
      ? toPlantWithIcon(post.plante.id, {
          nomScientifique: post.plante.nomScientifique,
          nomCommun: post.plante.nomCommun,
          badgeRarete: post.plante.badgeRarete,
          toxicite: 'green',
        })
      : undefined,
    tagType: post.plante ? 'owned' : undefined,
    imageUri: resolvedImageUrl,
    caption: post.contenuTexte,
    likes: post.likesCount,
    liked: post.estLikedParUtilisateur,
    comments: post.commentairesCount,
    // Pas de geo-tag sur les posts côté back (aucun champ latitude/longitude sur
    // l'entité Post) : "Près de moi" ne peut donc jamais matcher de vraies données.
    distanceMeters: null,
  };
}
