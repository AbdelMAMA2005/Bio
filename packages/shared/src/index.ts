export type Rarete = 'commun' | 'rare' | 'epique';

export type TypeCollection = 'owned' | 'discovered';

export type EtatSante = 'sain' | 'alerte' | 'malade';

export type Toxicite = 'toxique' | 'non_toxique' | 'incertaine';

export interface User {
  id: string;
  pseudo: string;
  email: string;
  niveau: number;
  xp: number;
  pieces: number;
  /** Vraie photo de profil (POST /users/me/avatar), `null` si jamais définie. */
  urlAvatar: string | null;
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
  /** Nombre de likes distincts (tous appelants confondus). */
  likesCount: number;
  /** Liké par l'utilisateur courant. */
  aimeParMoi: boolean;
}

/**
 * Une bulle de story = tous les médias actifs d'un même auteur (comportement "statuts
 * WhatsApp" : plusieurs médias du même utilisateur ne font jamais plusieurs bulles).
 */
export interface StoryGroup {
  idUtilisateur: string;
  nomUtilisateur: string;
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
  nomUtilisateur: string;
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

// ----- Messagerie privée (réponses aux statuts + messages directs) -----

/** Aperçu du statut cité au-dessus d'un message, quand il vient d'une réponse à une story. */
export interface StoryPreview {
  id: string;
  urlMedia: string;
  mediaType: StoryMediaType;
}

export interface ChatMessage {
  id: string;
  idConversation: string;
  idExpediteur: string;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  storyPreview: StoryPreview | null;
}

export interface Conversation {
  id: string;
  autreUtilisateur: { id: string; nomUtilisateur: string; urlAvatar: string | null };
  dernierMessage: { contenu: string; dateEnvoi: string; estDeMoi: boolean; storyPreview: StoryPreview | null } | null;
  nonLusCount: number;
}

// ----- Profil public -----

export interface PublicProfile {
  id: string;
  nomUtilisateur: string;
  urlAvatar: string | null;
  niveau: number;
  experience: number;
  insignes: string[];
  stats: { captures: number; especes: number; rares: number };
}

// ===================== Console admin (apps/admin) =====================
// Enums back bruts (mêmes valeurs que l'API), pas les enums d'affichage mobile
// ci-dessus (Rarete/Toxicite/EtatSante) : la console est un outil technique, le
// libellé français est calculé côté front admin (voir theme/labels.ts).

export type AdminRole = 'membre' | 'moderateur' | 'admin';
export type AdminUserStatut = 'actif' | 'inactif' | 'suspendu';
export type AdminToxicite = 'green' | 'orange' | 'red';
export type AdminReportTargetType = 'post' | 'story' | 'comment';
export type AdminReportStatut = 'ouvert' | 'ignore' | 'supprime';
export type AdminQuestType = 'quotidien' | 'exploration';
export type AdminServiceStatus = 'ok' | 'degrade' | 'down';

export interface AdminUser {
  id: string;
  nomUtilisateur: string;
  email: string;
  urlAvatar: string | null;
  role: AdminRole;
  niveau: number;
  experience: number;
  capturesCount: number;
  statut: AdminUserStatut;
}

export interface AdminUsersPage {
  items: AdminUser[];
  total: number;
}

export interface AdminConseilsEntretien {
  lumiere?: string;
  sol?: string;
  arrosage?: string;
  multiplication?: string;
}

export interface AdminPlant {
  id: string;
  nomScientifique: string;
  nomCommun: string;
  famille: string | null;
  toxicite: AdminToxicite;
  badgeRarete: string | null;
  urlImage: string | null;
  aPropos: string | null;
  conseilsEntretien: AdminConseilsEntretien | null;
  capturesCount: number;
}

export interface AdminPlantsPage {
  items: AdminPlant[];
  total: number;
}

export interface AdminPlantInput {
  nomScientifique: string;
  nomCommun: string;
  famille?: string | null;
  toxicite: AdminToxicite;
  badgeRarete?: string | null;
  urlImage?: string | null;
  aPropos?: string | null;
  conseilsEntretien?: AdminConseilsEntretien | null;
}

/** Un signalement groupé par contenu ciblé (targetType+targetId) — voir AdminModerationService. */
export interface AdminReportGroup {
  id: string;
  targetType: AdminReportTargetType;
  targetId: string;
  auteurCible: string;
  motif: string;
  extrait: string;
  signalementsCount: number;
  statut: AdminReportStatut;
  dateCreation: string;
}

export interface AdminQuest {
  id: string;
  libelle: string;
  type: AdminQuestType;
  objectif: number;
  recompenseXp: number;
  recompensePieces: number;
  actif: boolean;
  /** % (0-100) d'utilisateurs actifs ayant complété ce défi aujourd'hui. */
  tauxCompletion: number;
}

export interface AdminFeatureFlag {
  cle: string;
  libelle: string;
  description: string;
  actif: boolean;
}

export interface AdminApiKeyStatus {
  nom: string;
  env: string;
  status: 'connecte' | 'absent' | 'degrade';
}

export interface AdminAuditLogEntry {
  id: string;
  adminPseudo: string;
  action: string;
  cible: string | null;
  dateCreation: string;
}

export interface AdminKpi {
  utilisateursActifs: number;
  utilisateursActifsTrendPct: number;
  identifications7j: number;
  identificationsTrendPct: number;
  especesReferencees: number;
  especesTrendCount: number;
  signalements: number;
  signalementsTrendCount: number;
}

export interface AdminChartPoint {
  jour: string;
  valeur: number;
}

export interface AdminRarityBucket {
  rarete: string;
  count: number;
  pct: number;
}

export interface AdminServiceHealth {
  nom: string;
  latenceMs: number | null;
  status: AdminServiceStatus;
}

export interface AdminStats {
  kpi: AdminKpi;
  chart7j: AdminChartPoint[];
  raretes: AdminRarityBucket[];
  aTraiter: {
    publicationsSignalees: number;
    especesAValider: number;
    identificationsDouteuses: number;
  };
  services: AdminServiceHealth[];
}

export interface AdminMe {
  id: string;
  nomUtilisateur: string;
  email: string;
  role: AdminRole;
}
