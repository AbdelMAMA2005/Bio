export type Rarete = 'commun' | 'rare' | 'epique';

export type TypeCollection = 'owned' | 'discovered';

export type EtatSante = 'sain' | 'alerte' | 'malade';

export type Toxicite = 'toxique' | 'non_toxique' | 'incertaine';

export interface User {
  id: string;
  pseudo: string;
  fullName?: string;
  email: string;
  urlAvatar?: string | null;
  niveau: number;
  xp: number;
  pieces: number;
  publicStories?: boolean;
  pendingEmail?: string | null;
}

export interface Plante {
  id: string;
  nomScientifique: string;
  nomCommun: string;
  famille: string;
  toxicite: Toxicite;
  rarete: Rarete;
  /** Description réelle de l'espèce (Plant.id), chaîne vide si non fournie. */
  aPropos: string;
  /** Vraie photo de référence de l'espèce (Plant.id), chaîne vide si non fournie. */
  urlImage: string;
  conseilsEntretien: string;
}

export interface CollectionPhoto {
  url: string;
  date: string;
}

export interface DernierDiagnostic {
  maladieNom: string | null;
  scoreGlobal: number;
  traitement: { biologique?: string; chimique?: string; prevention?: string } | null;
  description: string | null;
  estSain: boolean;
  dateDiagnostic: string;
}

export type StoryMediaType = 'image' | 'video';

/** Un média (photo/vidéo) au sein d'une bulle de story groupée par auteur. */
export interface StoryMedia {
  id: string;
  urlMedia: string;
  mediaType: StoryMediaType;
  dateCreation: string;
  dateExpiration: string;
  /** Vu par l'utilisateur courant — toujours `true` pour ses propres médias. */
  vuParMoi: boolean;
  vuesCount: number;
  likesCount: number;
  commentairesCount: number;
  estLikedParUtilisateur: boolean;
}

/**
 * Une bulle de story = tous les médias actifs d'un même auteur (comportement "statuts
 * WhatsApp" : plusieurs médias du même utilisateur ne font jamais plusieurs bulles).
 */
export interface StoryGroup {
  idUtilisateur: string;
  username: string;
  urlAvatar: string | null;
  /** `true` si l'utilisateur courant est l'auteur de cette bulle ("Ta story"). */
  estMoi: boolean;
  /** `true` si tous les médias ont été vus (anneau plein plutôt que dégradé). */
  entierementVue: boolean;
  medias: StoryMedia[];
}

/** Une entrée de la liste "vu par" — réservée à l'auteur du média (comportement WhatsApp). */
export interface StoryViewer {
  idUtilisateur: string;
  username: string;
  urlAvatar: string | null;
  dateVue: string;
}

export interface CollectionItem {
  /** Identifiant réel de la ligne collection côté back (absent des données mock). */
  id?: string;
  idUtilisateur: string;
  idPlante: string;
  dateAjout: string;
  type: TypeCollection;
  latitude?: number;
  longitude?: number;
  etatSante?: EtatSante;
  historiquePhotos?: CollectionPhoto[];
  /** Dernier diagnostic de santé sauvegardé (voir POST /collection/:id/diagnosis), `null`/absent si jamais diagnostiquée. */
  dernierDiagnostic?: DernierDiagnostic | null;
  /** Prochaine échéance d'arrosage calculée côté back (ISO 8601), absent des données mock. */
  prochainArrosage?: string;
}
