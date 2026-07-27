import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';
import { PlantType } from '../entities/enums/plant-type.enum';
import { HealthStatus } from '../entities/enums/health-status.enum';
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsIn, IsOptional, IsNumber, IsString, IsUUID, Min } from 'class-validator';

// ----- DTOs pour l'identification -----
export class IdentifyPlantRequestDto {
  @IsNotEmpty()
  @IsString()
  imageBase64!: string; // ou FormData selon votre choix
}

export class IdentifyPlantResponseDto {
  plantId!: string;
  nomScientifique!: string;
  nomCommun!: string;
  famille!: string | null;
  toxicite!: ToxicityLevel;
  badgeRarete!: string | null;
  /** Description réelle de l'espèce (Plant.id `description.value`), null si non fournie. */
  aPropos!: string | null;
  conseilsEntretien!:
    | {
        lumiere?: string;
        sol?: string;
        arrosage?: string;
        multiplication?: string;
      }
    | null;
  urlImage!: string | null;
  xpGagne!: number;
  /** Score de confiance réel de Plant.id (0-100), voir identification.service.ts. */
  confiance!: number;
}

// ----- DTOs pour la collection -----
export class CreateCollectionRequestDto {
  @IsUUID()
  plantId!: string;

  @IsEnum(PlantType)
  type!: PlantType;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateCollectionResponseDto {
  id!: string;
  idUtilisateur!: string;
  idPlante!: string;
  type!: PlantType;
  etatSante!: HealthStatus;
  dateAjout!: Date;
  latitude!: number | null;
  longitude!: number | null;
}

export class GetCollectionResponseDto {
  id!: string;
  idPlante!: string;
  nomScientifique!: string;
  nomCommun!: string;
  famille!: string | null;
  badgeRarete!: string | null;
  toxicite!: ToxicityLevel;
  etatSante!: HealthStatus;
  dateAjout!: Date;
  urlImage!: string | null;
  /** Description réelle de l'espèce (Plant.id `description.value`), null si non fournie. */
  aPropos!: string | null;
  conseilsEntretien!:
    | {
        lumiere?: string;
        sol?: string;
        arrosage?: string;
        multiplication?: string;
      }
    | null;
  latitude!: number | null;
  longitude!: number | null;
  historiquePhotos!: string[];
  /**
   * Dernier diagnostic de santé sauvegardé (POST /collection/:id/diagnosis), `null` si la
   * plante n'a jamais été diagnostiquée. Toujours le plus récent — pas un historique.
   * Alimente le bouton "Voir le diagnostic" du front (visible seulement si `etatSante ===
   * 'malade'` ET ce champ non-null, voir CloneCard.tsx).
   */
  dernierDiagnostic!: {
    maladieNom: string | null;
    scoreGlobal: number;
    traitement: { biologique?: string; chimique?: string; prevention?: string } | null;
    description: string | null;
    estSain: boolean;
    dateDiagnostic: string;
  } | null;
  type!: PlantType;
  /**
   * Prochaine échéance d'arrosage calculée côté back : `derniereArrosage` (collection) +
   * intervalle de l'espèce (`Plant.frequenceArrosageJours`, ou
   * DEFAULT_WATERING_INTERVAL_DAYS à défaut) — voir CollectionService#computeProchainArrosage
   * et common/watering.ts. Alimente le bandeau "N arrosages prévus aujourd'hui" et les
   * notifications locales côté front (jamais une valeur inventée : recalculée à chaque
   * lecture, jamais stockée telle quelle).
   */
  prochainArrosage!: Date;
}

// ----- DTOs pour Auth -----
export class RegisterRequestDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  nomUtilisateur!: string;

  @MinLength(4)
  motDePasse!: string;
}

export class RegisterResponseDto {
  id!: string;
  email!: string;
  nomUtilisateur!: string;
  experience!: number;
  niveau!: number;
  insignes!: string[];
  pieces!: number;
}

export class LoginRequestDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  motDePasse!: string;
}

export class LoginResponseDto {
  accessToken!: string;
  user!: RegisterResponseDto;
}

export class GoogleLoginRequestDto {
  @IsNotEmpty()
  idToken!: string;
}

// ----- DTOs pour le Feed -----

import { Type } from 'class-transformer';

export class CreatePostRequestDto {
  @IsOptional()
  @IsUUID()
  collectionId?: string; // Plante taguée (optionnelle)

  @IsNotEmpty()
  @IsString()
  contenuTexte!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string; // Pour les publications avec image (upload séparé)
}

export class CreatePostResponseDto {
  id!: string;
  idUtilisateur!: string;
  idCollection?: string;
  contenuTexte!: string;
  imageUrl?: string;
  dateCreation!: Date;
  auteur!: {
    id: string;
    nomUtilisateur: string;
    urlAvatar?: string | null;
  };
  plante?: {
    id: string;
    nomScientifique: string;
    nomCommun: string;
    badgeRarete?: string | null;
    urlImage?: string | null;
  };
  /** Type réel de la collection taguée ('owned'/'discovered'), voir feed.service.ts. */
  typeCollection?: PlantType;
  likesCount!: number;
  commentairesCount!: number;
  estLikedParUtilisateur!: boolean;
  /**
   * Distance en mètres entre le post (géo héritée de la collection taguée) et la
   * position fournie en query (`latitude`/`longitude`) — null si l'un des deux
   * n'est pas disponible. Alimente le filtre "Près de moi" (cahier des charges §3.3).
   */
  distanceMetres!: number | null;
}

export class CreateCommentRequestDto {
  @IsNotEmpty()
  @IsString()
  contenu!: string;
}

export class CreateCommentResponseDto {
  id!: string;
  idPost!: string;
  idUtilisateur!: string;
  contenu!: string;
  dateCreation!: Date;
  auteur!: {
    id: string;
    nomUtilisateur: string;
    urlAvatar?: string | null;
  };
}

export class FeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  /** Position actuelle de l'appelant, pour calculer distanceMetres (filtre "Près de moi"). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  /**
   * `'near'` : ne renvoie que les posts géo-tagués à moins de `radiusMetres` de
   * `latitude`/`longitude` (calcul réel en base, formule de haversine) — cahier des charges
   * §3.3. Sans `latitude`/`longitude`, ignoré (jamais de filtre inventé sans position réelle).
   */
  @IsOptional()
  @IsIn(['all', 'near'])
  filter?: 'all' | 'near';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radiusMetres?: number = 5000;
}

// ----- DTOs pour les Stories (comportement "statuts WhatsApp", voir StoriesService) -----

export class CreateStoryResponseDto {
  id!: string;
  idUtilisateur!: string;
  nomUtilisateur!: string;
  urlAvatar!: string | null;
  urlMedia!: string;
  mediaType!: 'image' | 'video';
  dateCreation!: Date;
  dateExpiration!: Date;
}

/** Un média au sein d'une bulle de story groupée (GET /stories). */
export class StoryMediaDto {
  id!: string;
  urlMedia!: string;
  mediaType!: 'image' | 'video';
  dateCreation!: Date;
  dateExpiration!: Date;
  /** Vu par l'appelant courant — toujours `true` pour ses propres médias. */
  vuParMoi!: boolean;
  /** Nombre de vues distinctes (tous appelants confondus). */
  vuesCount!: number;
}

/** Une bulle de story = tous les médias actifs d'un même auteur, regroupés à la lecture. */
export class StoryGroupDto {
  idUtilisateur!: string;
  nomUtilisateur!: string;
  urlAvatar!: string | null;
  /** `true` si l'appelant courant est l'auteur de cette bulle ("Ta story"). */
  estMoi!: boolean;
  /** `true` si tous les médias de la bulle ont été vus par l'appelant (anneau plein plutôt que dégradé). */
  entierementVue!: boolean;
  medias!: StoryMediaDto[];
}

/** Une entrée de la liste "vu par" (GET /stories/:id/viewers, réservé à l'auteur du média). */
export class StoryViewerDto {
  idUtilisateur!: string;
  nomUtilisateur!: string;
  urlAvatar!: string | null;
  dateVue!: Date;
}

// ----- DTOs pour le diagnostic de santé -----
export class DiagnosisRequestDto {
  @IsUUID()
  collectionId!: string;
}

export class DiagnosisResponseDto {
  estSain!: boolean;
  probabiliteSante!: number;
  suggestions!: {
    id: string;
    nom: string;
    probabilite: number;
    estNuisible: boolean;
    traitement?: {
      biologique?: string;
      chimique?: string;
      prevention?: string;
    };
    description?: string;
  }[];
  scoreGlobal!: number;
}

// ----- DTOs pour User me -----
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nomUtilisateur?: string;

  @IsOptional()
  @IsString()
  urlAvatar?: string;
}

export class AddBadgeDto {
  @IsString()
  @IsNotEmpty()
  badge!: string;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  motDePasse!: string;
}

export class UserProfileResponseDto {
  id!: string;
  email!: string;
  nomUtilisateur!: string;
  experience!: number;
  niveau!: number;
  insignes!: string[];
  pieces!: number;
  urlAvatar!: string | null;
}

// ----- DTOs pour Collection update -----
export class UpdateCollectionDto {
  @IsOptional()
  @IsEnum(HealthStatus)
  etatSante?: HealthStatus;

  @IsOptional()
  @IsEnum(PlantType)
  typeCollection?: PlantType;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

// ----- DTOs pour Post update -----
export class UpdatePostDto {
  @IsOptional()
  @IsString()
  contenuTexte?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

// ----- DTOs pour Plants -----
export class CreatePlantDto {
  @IsNotEmpty()
  @IsString()
  nomScientifique!: string;

  @IsOptional()
  @IsString()
  nomCommun?: string;

  @IsOptional()
  @IsString()
  famille?: string;

  @IsOptional()
  @IsEnum(ToxicityLevel)
  toxicite?: ToxicityLevel;

  @IsOptional()
  @IsString()
  urlImage?: string;

  @IsOptional()
  @IsString()
  badgeRarete?: string;

  @IsOptional()
  @IsString()
  aPropos?: string;

  @IsOptional()
  conseilsEntretien?: {
    lumiere?: string;
    sol?: string;
    arrosage?: string;
    multiplication?: string;
  };
}

export class UpdatePlantDto {
  @IsOptional()
  @IsString()
  nomScientifique?: string;

  @IsOptional()
  @IsString()
  nomCommun?: string;

  @IsOptional()
  @IsString()
  famille?: string;

  @IsOptional()
  @IsEnum(ToxicityLevel)
  toxicite?: ToxicityLevel;

  @IsOptional()
  @IsString()
  urlImage?: string;

  @IsOptional()
  @IsString()
  badgeRarete?: string;

  @IsOptional()
  @IsString()
  aPropos?: string;

  @IsOptional()
  conseilsEntretien?: {
    lumiere?: string;
    sol?: string;
    arrosage?: string;
    multiplication?: string;
  };
}

export class PlantResponseDto {
  id!: string;
  nomScientifique!: string;
  nomCommun!: string | null;
  famille!: string | null;
  toxicite!: ToxicityLevel;
  urlImage!: string | null;
  badgeRarete!: string | null;
  aPropos!: string | null;
  conseilsEntretien!: {
    lumiere?: string;
    sol?: string;
    arrosage?: string;
    multiplication?: string;
  } | null;
}

export class PlantListQueryDto extends FeedQueryDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  famille?: string;

  @IsOptional()
  @IsEnum(ToxicityLevel)
  toxicite?: ToxicityLevel;
}

// ----- DTOs pour Reminders -----
export class CreateReminderDto {
  @IsUUID()
  collectionId!: string;

  @IsNotEmpty()
  @IsString()
  typeRappel!: string;

  @IsNotEmpty()
  @Type(() => Date)
  datePlanification!: Date;
}

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  typeRappel?: string;

  @IsOptional()
  @Type(() => Date)
  datePlanification?: Date;
}

export class ReminderResponseDto {
  id!: string;
  userId!: string;
  collectionId!: string;
  typeRappel!: string;
  datePlanification!: Date;
  estNotifie!: boolean;
}

export class ReminderFilterDto extends FeedQueryDto {
  @IsOptional()
  @IsString()
  estNotifie?: string;
}

// ----- DTOs pour les défis (quests) -----
export class QuestResponseDto {
  id!: string;
  libelle!: string;
  type!: 'quotidien';
  progression!: number;
  objectif!: number;
  complete!: boolean;
  recompense!: { xp: number; pieces: number };
}

// ----- DTOs pour Notifications (enregistrement de token push) -----
export class RegisterDeviceDto {
  @IsNotEmpty()
  @IsString()
  expoPushToken!: string;

  @IsNotEmpty()
  @IsString()
  plateforme!: string;
}

export class UnregisterDeviceDto {
  @IsOptional()
  @IsString()
  expoPushToken?: string;
}