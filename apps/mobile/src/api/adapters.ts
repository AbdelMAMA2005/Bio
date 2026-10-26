import type {
  ChatMessage,
  CollectionItem,
  CollectionPhoto,
  Conversation,
  Plante,
  PublicProfile,
  Rarete,
  StoryMediaType,
  StoryPreview,
  Toxicite,
} from '@planai/shared';

import type {
  ConseilsEntretien,
  DiagnosisResult,
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
 * Traduction des lignes Supabase (colonnes snake_case, valeurs brutes 'green'|'orange'|'red',
 * rareté en chaîne libre, conseils d'entretien en objet) vers les types « propres » de
 * packages/shared utilisés par les écrans. Toute la conversion est regroupée ici.
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
 * l'Edge Function identify-plant).
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

// ----- Collection (table collection + plants) -----

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
  historiquePhotos?: (string | CollectionPhoto)[];
  dernierDiagnostic?: BackendDernierDiagnostic | null;
  /** Prochaine échéance d'arrosage (collection.prochain_arrosage), fixée à l'ajout puis à chaque arrosage. */
  prochainArrosage: string;
};

/**
 * Supabase stocke des objets { url, date }; les anciens historiques contiennent
 * uniquement des URLs. Conserver la date de chaque photo lorsqu'elle est disponible.
 */
function resolveHistoriquePhotos(item: BackendCollectionItem): CollectionPhoto[] {
  if (!Array.isArray(item.historiquePhotos)) return [];
  return item.historiquePhotos.flatMap((photo) => {
    const url = typeof photo === 'string' ? photo : photo?.url;
    if (typeof url !== 'string' || !url.trim()) return [];
    const date = typeof photo === 'object' && typeof photo?.date === 'string' && photo.date
      ? photo.date : item.dateAjout;
    return [{ url: url, date }];
  });
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
 * Convertit le diagnostic sauvegardé (collection.dernier_diagnostic, réécrit à chaque
 * analyse par l'Edge Function diagnose-health) vers le même type
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
 * Convertit `prochainArrosage` (ISO, collection.prochain_arrosage) en badge de présentation
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
 * Aucune donnée d'exposition par plante en base : on affiche une valeur de repli plutôt
 * que d'inventer une donnée. `prochainArrosage` (voir wateringScheduleFromDate) et
 * `historiquePhotos` viennent de la ligne de collection.
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
      historiquePhotos: resolveHistoriquePhotos(item),
      dernierDiagnostic: item.dernierDiagnostic ?? null,
      prochainArrosage: item.prochainArrosage,
    },
    plant: toPlantWithIcon(item.idPlante, item),
    nextWatering: wateringScheduleFromDate(item.prochainArrosage),
    lightHint: '—',
    savedDiagnosis: savedDiagnosisFromBackend(item.dernierDiagnostic),
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
      historiquePhotos: resolveHistoriquePhotos(item),
      dernierDiagnostic: item.dernierDiagnostic ?? null,
    },
    plant: toPlantWithIcon(item.idPlante, item),
    // Le back ne fait pas de reverse-geocoding (lieuLabel du contrat) : on
    // n'affiche les coordonnées que si elles existent, sans lieu nommé.
    placeLabel: item.latitude !== null && item.longitude !== null ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}` : '',
  };
}

// ----- Diagnostic (Edge Function diagnose-health) -----

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

// ----- Badges (repli sur profiles.insignes si la RPC get_my_badges est absente) -----

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

// ----- Fil communautaire (table posts) -----

export type BackendPost = {
  id: string;
  idUtilisateur: string;
  contenuTexte: string;
  imageUrl?: string;
  dateCreation: string;
  auteur: { id: string; nomUtilisateur: string; urlAvatar?: string | null };
  plante?: { id: string; nomScientifique: string; nomCommun: string; badgeRarete?: string | null; urlImage?: string | null };
  /** Type réel de la collection taguée ('owned'/'discovered'). */
  typeCollection?: 'owned' | 'discovered';
  likesCount: number;
  commentairesCount: number;
  estLikedParUtilisateur: boolean;
  /** Distance réelle (mètres) depuis la position de l'appareil, null si indisponible. */
  distanceMetres: number | null;
};

export function toFeedPost(post: BackendPost): FeedPost {
  return {
    id: post.id,
    authorId: post.auteur.id,
    authorInitial: post.auteur.nomUtilisateur.charAt(0).toUpperCase(),
    authorName: post.auteur.nomUtilisateur,
    authorAvatarUrl: post.auteur.urlAvatar ? post.auteur.urlAvatar : null,
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
    // pas une valeur fixe.
    tagType: post.plante ? post.typeCollection ?? 'owned' : undefined,
    imageUri: post.imageUrl,
    caption: post.contenuTexte,
    likes: post.likesCount,
    liked: post.estLikedParUtilisateur,
    comments: post.commentairesCount,
    // Distance réelle (haversine, calculée dans useFeed) depuis la position de
    // l'appareil — null si la position n'est pas fournie ou
    // si le post n'a pas de Geo-Tag hérité de sa collection taguée.
    distanceMeters: post.distanceMetres,
  };
}

// ----- Stories (comportement "statuts WhatsApp") -----

export type BackendStoryMedia = {
  id: string;
  urlMedia: string;
  mediaType: StoryMediaType;
  dateCreation: string;
  dateExpiration: string;
  vuParMoi: boolean;
  vuesCount: number;
  likesCount: number;
  aimeParMoi: boolean;
};

export type BackendStoryGroup = {
  idUtilisateur: string;
  nomUtilisateur: string;
  urlAvatar: string | null;
  estMoi: boolean;
  entierementVue: boolean;
  medias: BackendStoryMedia[];
};

function toStoryMedia(media: BackendStoryMedia): StoryMedia {
  return { ...media, urlMedia: media.urlMedia };
}

export function toStoryGroup(group: BackendStoryGroup): StoryGroup {
  return {
    idUtilisateur: group.idUtilisateur,
    nomUtilisateur: group.nomUtilisateur,
    urlAvatar: group.urlAvatar,
    estMoi: group.estMoi,
    entierementVue: group.entierementVue,
    medias: group.medias.map((media) => toStoryMedia(media)),
  };
}

// ----- Commentaires -----

export type BackendComment = {
  id: string;
  idPost: string;
  idUtilisateur: string;
  contenu: string;
  dateCreation: string;
  auteur: { id: string; nomUtilisateur: string; urlAvatar?: string | null };
};

// ----- Messagerie privée -----

export type BackendStoryPreview = { id: string; urlMedia: string; mediaType: StoryMediaType };

export type BackendMessage = {
  id: string;
  idConversation: string;
  idExpediteur: string;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  storyPreview: BackendStoryPreview | null;
};

export type BackendConversation = {
  id: string;
  autreUtilisateur: { id: string; nomUtilisateur: string; urlAvatar: string | null };
  dernierMessage: { contenu: string; dateEnvoi: string; estDeMoi: boolean; storyPreview: BackendStoryPreview | null } | null;
  nonLusCount: number;
};

function toStoryPreview(preview: BackendStoryPreview | null): StoryPreview | null {
  if (!preview) return null;
  return { ...preview, urlMedia: preview.urlMedia };
}

export function toChatMessage(message: BackendMessage): ChatMessage {
  return { ...message, storyPreview: toStoryPreview(message.storyPreview) };
}

export function toConversation(conversation: BackendConversation): Conversation {
  return {
    id: conversation.id,
    autreUtilisateur: {
      ...conversation.autreUtilisateur,
      urlAvatar: conversation.autreUtilisateur.urlAvatar
        ? conversation.autreUtilisateur.urlAvatar
        : null,
    },
    dernierMessage: conversation.dernierMessage
      ? { ...conversation.dernierMessage, storyPreview: toStoryPreview(conversation.dernierMessage.storyPreview) }
      : null,
    nonLusCount: conversation.nonLusCount,
  };
}

// ----- Profil public -----

export type BackendPublicProfile = {
  id: string;
  nomUtilisateur: string;
  urlAvatar: string | null;
  niveau: number;
  experience: number;
  insignes: string[];
  stats: { captures: number; especes: number; rares: number };
};

export function toPublicProfile(profile: BackendPublicProfile): PublicProfile {
  return {
    ...profile,
    urlAvatar: profile.urlAvatar ? profile.urlAvatar : null,
  };
}

export function toComment(comment: BackendComment): FeedComment {
  return {
    id: comment.id,
    authorId: comment.auteur.id,
    authorInitial: comment.auteur.nomUtilisateur.charAt(0).toUpperCase(),
    authorName: comment.auteur.nomUtilisateur,
    authorAvatarUrl: comment.auteur.urlAvatar ? comment.auteur.urlAvatar : null,
    createdAt: comment.dateCreation,
    text: comment.contenu,
  };
}
