import type { CollectionItem, CollectionPhoto, Plante, Rarete, StoryMediaType, Toxicite, User } from '@planai/shared';

import type { DiagnosisResult } from '@/api/mock/diagnosis';
import type {
  ConseilsEntretien,
  FeedComment,
  FeedPost,
  GardenClone,
  HerbariumDiscovery,
  PlantWithIcon,
  StoryGroup,
  StoryMedia,
  WateringSchedule,
} from '@/api/types';

/**
 * Le backend réel (apps/api, voir API_CONTRACT.md pour le détail vérifié) parle un format
 * brut différent des types internes de packages/shared : toxicité/santé en
 * 'green'|'orange'|'red' au lieu de 'toxique'|'non_toxique'|'incertaine' côté front,
 * rareté en chaîne libre ("Commun", toujours cette valeur en pratique) au lieu d'un enum,
 * conseilsEntretien en objet {lumiere,sol,arrosage,multiplication} au lieu du JSON string
 * attendu par le front, etc. Ce fichier isole TOUTE la traduction à un seul endroit pour
 * que le reste du front reste écrit contre les types "propres" de packages/shared, sans
 * jamais voir les valeurs brutes du back.
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
  lumiere?: string;
  sol?: string;
  arrosage?: string;
  multiplication?: string;
} | null;

/**
 * Alimenté par de vraies données Plant.id (champs structurés `best_light_condition`,
 * `best_soil_type`, `watering`, `propagation_methods` — voir
 * IdentificationService.processPlantIdResponse et common/watering.ts côté back).
 * Plant.id n'a pas de champ "température" ni "habitat" structuré (vérifié
 * empiriquement) : la grille de conseils d'entretien montre à la place l'arrosage
 * et le mode de multiplication, seuls signaux réels et différenciants par espèce.
 * On sérialise vers le format string que `parseConseilsEntretien` attend côté
 * front, avec repli "—" quand une case précise n'est pas fournie par Plant.id.
 */
export function serializeConseilsEntretien(raw: BackendConseilsEntretien): string {
  const fallback = '—';
  const care: ConseilsEntretien = {
    light: raw?.lumiere ?? fallback,
    soil: raw?.sol ?? fallback,
    arrosage: raw?.arrosage ?? fallback,
    multiplication: raw?.multiplication ?? fallback,
  };
  return JSON.stringify(care);
}

// ----- Icône plante (repli tant que urlImage n'est pas disponible pour l'espèce) -----

function iconForPlant(): PlantWithIcon['icon'] {
  return 'eco';
}

// ----- Plante -----

type BackendPlantFields = {
  nomScientifique: string;
  nomCommun: string;
  famille?: string | null;
  toxicite: BackendToxicity;
  badgeRarete?: string | null;
  aPropos?: string | null;
  urlImage?: string | null;
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
    aPropos: backend.aPropos ?? '',
    urlImage: backend.urlImage ?? '',
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
  pieces?: number;
};

export function userFromBackend(backend: BackendUser): User {
  return {
    id: backend.id,
    pseudo: backend.nomUtilisateur,
    email: backend.email,
    niveau: backend.niveau,
    xp: backend.experience,
    pieces: backend.pieces ?? 0,
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
  aPropos: string | null;
  conseilsEntretien: BackendConseilsEntretien;
  urlImage: string | null;
  xpGagne: number;
  /** Score de confiance réel de Plant.id (0-100) — voir API_CONTRACT.md §3. */
  confiance: number;
};

// ----- Collection (GET /collection) -----

export type BackendDernierDiagnostic = {
  maladieNom: string | null;
  scoreGlobal: number;
  traitement: { biologique?: string; chimique?: string; prevention?: string } | null;
  description: string | null;
  estSain: boolean;
  dateDiagnostic: string;
};

export type BackendCollectionItem = {
  id: string;
  idPlante: string;
  nomScientifique: string;
  nomCommun: string;
  famille: string | null;
  badgeRarete: string | null;
  toxicite: BackendToxicity;
  etatSante: 'green' | 'orange' | 'red';
  dateAjout: string;
  urlImage: string | null;
  aPropos: string | null;
  conseilsEntretien: BackendConseilsEntretien;
  latitude: number | null;
  longitude: number | null;
  historiquePhotos?: string[];
  dernierDiagnostic?: BackendDernierDiagnostic | null;
  /** Calculé côté back (CollectionService#computeProchainArrosage), voir API_CONTRACT.md §4. */
  prochainArrosage: string;
};

function resolveUploadUrl(url: string, apiBaseUrl: string): string {
  return url.startsWith('http') ? url : `${apiBaseUrl}${url}`;
}

/**
 * Le back renvoie désormais historiquePhotos dans GET /collection (URLs relatives,
 * sans date par photo) : on résout les URLs contre apiBaseUrl et on retombe sur
 * dateAjout de la collection faute de date individuelle par photo.
 */
function resolveHistoriquePhotos(item: BackendCollectionItem, apiBaseUrl: string): CollectionPhoto[] {
  return (item.historiquePhotos ?? []).map((url) => ({
    url: resolveUploadUrl(url, apiBaseUrl),
    date: item.dateAjout,
  }));
}

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
 * Convertit le diagnostic sauvegardé (POST /collection/:id/diagnosis, réécrit à chaque
 * nouvelle analyse — voir DiagnosisService#diagnosePlantHealth) vers le même type
 * `DiagnosisResult` que `diagnosisFromBackend`, pour que le bouton "Voir le diagnostic"
 * réutilise exactement le même `DiagnosisSheet` sans relancer d'analyse. `undefined` si la
 * plante n'a jamais été diagnostiquée (jamais de diagnostic fictif affiché).
 */
function savedDiagnosisFromBackend(
  d: BackendDernierDiagnostic | null | undefined,
): { result: DiagnosisResult; date: string } | undefined {
  if (!d) return undefined;

  if (d.estSain) {
    return { result: { status: 'healthy', confidence: d.scoreGlobal }, date: d.dateDiagnostic };
  }

  const treatmentParts = [d.traitement?.biologique, d.traitement?.chimique, d.traitement?.prevention].filter(
    (part): part is string => !!part,
  );

  return {
    result: {
      status: 'disease',
      diseaseIcon: 'coronavirus',
      diseaseName: d.maladieNom ?? '—',
      confidence: d.scoreGlobal,
      treatment: treatmentParts.length > 0 ? treatmentParts.join(' ') : (d.description ?? '—'),
    },
    date: d.dateDiagnostic,
  };
}

/**
 * Convertit `prochainArrosage` (ISO, calculé côté back — voir
 * CollectionService#computeProchainArrosage) en badge de présentation
 * `WateringSchedule`, en comparant des dates tronquées au jour (pas l'horodatage brut) :
 * une échéance à 23h59 aujourd'hui doit afficher "aujourd'hui", pas "dans -1 jour".
 * Une échéance déjà dépassée (retard d'arrosage) affiche aussi "aujourd'hui" — c'est le
 * signal le plus urgent qu'on ait, pas un décompte négatif.
 */
export function wateringScheduleFromDate(prochainArrosage: string): WateringSchedule {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date(prochainArrosage)) - startOfDay(new Date())) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return { key: 'jardin.today' };
  if (diffDays === 1) return { key: 'jardin.tomorrow' };
  return { key: 'jardin.inDays', count: diffDays };
}

/**
 * Le back ne renvoie pas d'indice de lumière (pas de module dédié branché sur la
 * liste) : on affiche une valeur de repli plutôt que d'inventer une donnée.
 * `prochainArrosage` (voir wateringScheduleFromDate) et `historiquePhotos` sont en
 * revanche bien renvoyés par GET /collection (voir API_CONTRACT.md §4).
 */
export function toGardenClone(item: BackendCollectionItem, userId: string, apiBaseUrl: string): GardenClone {
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
      historiquePhotos: resolveHistoriquePhotos(item, apiBaseUrl),
      dernierDiagnostic: item.dernierDiagnostic ?? null,
      prochainArrosage: item.prochainArrosage,
    },
    plant: toPlantWithIcon(item.idPlante, item),
    nextWatering: wateringScheduleFromDate(item.prochainArrosage),
    lightHint: '—',
    savedDiagnosis: savedDiagnosisFromBackend(item.dernierDiagnostic),
  };
}

export function toHerbariumDiscovery(item: BackendCollectionItem, userId: string, apiBaseUrl: string): HerbariumDiscovery {
  return {
    item: {
      id: item.id,
      idUtilisateur: userId,
      idPlante: item.idPlante,
      dateAjout: item.dateAjout,
      type: 'discovered',
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
      historiquePhotos: resolveHistoriquePhotos(item, apiBaseUrl),
      dernierDiagnostic: item.dernierDiagnostic ?? null,
    },
    plant: toPlantWithIcon(item.idPlante, item),
    // Le back ne fait pas de reverse-geocoding (lieuLabel du contrat) : on
    // n'affiche les coordonnées que si elles existent, sans lieu nommé.
    placeLabel: item.latitude !== null && item.longitude !== null ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}` : '',
  };
}

// ----- Diagnostic (POST /collection/:id/diagnosis) -----

export type BackendDiagnosisResponse = {
  estSain: boolean;
  probabiliteSante: number;
  suggestions: {
    id: string;
    nom: string;
    probabilite: number;
    estNuisible: boolean;
    traitement?: { biologique?: string; chimique?: string; prevention?: string };
    description?: string;
  }[];
  scoreGlobal: number;
};

/**
 * Le back ne renvoie ni maladie unique ni icône dédiée (liste de suggestions
 * pondérées) : on retient la suggestion la plus probable pour rester
 * compatible avec le format `DiagnosisResult` déjà affiché par
 * `DiagnosisSheet` (un seul diagnostic, une seule icône générique).
 */
export function diagnosisFromBackend(backend: BackendDiagnosisResponse): DiagnosisResult {
  if (backend.estSain) {
    return { status: 'healthy', confidence: backend.scoreGlobal };
  }

  const top = backend.suggestions[0];
  const treatmentParts = [
    top?.traitement?.biologique,
    top?.traitement?.chimique,
    top?.traitement?.prevention,
  ].filter((part): part is string => !!part);

  return {
    status: 'disease',
    diseaseIcon: 'coronavirus',
    diseaseName: top?.nom ?? '—',
    confidence: backend.scoreGlobal,
    treatment: treatmentParts.length > 0 ? treatmentParts.join(' ') : (top?.description ?? '—'),
  };
}

// ----- Badges (dérivés de GET/PATCH /users/me → insignes: string[]) -----

export type BadgeCatalogEntry = { id: string; nom: string; description: string };

/**
 * Le back ne stocke qu'une liste d'identifiants de badges obtenus
 * (`insignes: string[]`), sans nom/description/icône ni date d'obtention :
 * on croise avec un catalogue statique côté front (mêmes badges que
 * l'ancien mock) pour produire l'affichage complet.
 *
 * Limite connue : faute de date réelle côté back, un badge obtenu affiche
 * la date du jour ("obtenu aujourd'hui") plutôt que sa vraie date
 * d'obtention — à corriger le jour où `insignes` devient une liste
 * d'objets `{ badge, obtenuLe }` côté back plutôt que de simples chaînes.
 */
export function badgesFromInsignes(
  insignes: string[],
  catalog: BadgeCatalogEntry[],
): { id: string; nom: string; description: string; obtenuLe: string | null }[] {
  const obtained = new Set(insignes);
  return catalog.map((entry) => ({
    ...entry,
    obtenuLe: obtained.has(entry.id) ? new Date().toISOString() : null,
  }));
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
  /** Type réel de la collection taguée ('owned'/'discovered') — voir API_CONTRACT.md §5. */
  typeCollection?: 'owned' | 'discovered';
  likesCount: number;
  commentairesCount: number;
  estLikedParUtilisateur: boolean;
  /** Distance réelle (mètres) depuis la position fournie à GET /feed, null si indisponible. */
  distanceMetres: number | null;
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
    plant: post.plante
      ? toPlantWithIcon(post.plante.id, {
          nomScientifique: post.plante.nomScientifique,
          nomCommun: post.plante.nomCommun,
          badgeRarete: post.plante.badgeRarete,
          urlImage: post.plante.urlImage,
          toxicite: 'green',
        })
      : undefined,
    // Type réel de la collection taguée (jardin perso vs découverte sauvage),
    // pas une valeur fixe (voir API_CONTRACT.md §5).
    tagType: post.plante ? post.typeCollection ?? 'owned' : undefined,
    imageUri: resolvedImageUrl,
    caption: post.contenuTexte,
    likes: post.likesCount,
    liked: post.estLikedParUtilisateur,
    comments: post.commentairesCount,
    // Distance réelle calculée côté back (haversine) à partir de la position de
    // l'appelant transmise à GET /feed — null si la position n'est pas fournie ou
    // si le post n'a pas de Geo-Tag hérité de sa collection taguée.
    distanceMeters: post.distanceMetres,
  };
}

// ----- Stories (GET/POST /stories, comportement "statuts WhatsApp") -----

export type BackendStoryMedia = {
  id: string;
  urlMedia: string;
  mediaType: StoryMediaType;
  dateCreation: string;
  dateExpiration: string;
  vuParMoi: boolean;
  vuesCount: number;
};

export type BackendStoryGroup = {
  idUtilisateur: string;
  nomUtilisateur: string;
  urlAvatar: string | null;
  estMoi: boolean;
  entierementVue: boolean;
  medias: BackendStoryMedia[];
};

function toStoryMedia(media: BackendStoryMedia, apiBaseUrl: string): StoryMedia {
  return { ...media, urlMedia: resolveUploadUrl(media.urlMedia, apiBaseUrl) };
}

export function toStoryGroup(group: BackendStoryGroup, apiBaseUrl: string): StoryGroup {
  return {
    idUtilisateur: group.idUtilisateur,
    nomUtilisateur: group.nomUtilisateur,
    urlAvatar: group.urlAvatar,
    estMoi: group.estMoi,
    entierementVue: group.entierementVue,
    medias: group.medias.map((media) => toStoryMedia(media, apiBaseUrl)),
  };
}

// ----- Commentaires (GET/POST /feed/posts/:id/comments) -----

export type BackendComment = {
  id: string;
  idPost: string;
  idUtilisateur: string;
  contenu: string;
  dateCreation: string;
  auteur: { id: string; nomUtilisateur: string; urlAvatar?: string | null };
};

export function toComment(comment: BackendComment): FeedComment {
  return {
    id: comment.id,
    authorInitial: comment.auteur.nomUtilisateur.charAt(0).toUpperCase(),
    authorName: comment.auteur.nomUtilisateur,
    createdAt: comment.dateCreation,
    text: comment.contenu,
  };
}
