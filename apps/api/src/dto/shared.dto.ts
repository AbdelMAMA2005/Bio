import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';
import { PlantType } from '../entities/enums/plant-type.enum';
import { HealthStatus } from '../entities/enums/health-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsIn,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

// ----- DTOs pour l'identification -----
export class IdentifyPlantRequestDto {
  @ApiProperty({
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    description: "Image en Base64 ou URL de l'image pour identification",
  })
  @IsNotEmpty()
  @IsString()
  imageBase64!: string; // ou FormData selon votre choix
}

export class IdentifyPlantResponseDto {
  @ApiProperty({ example: 'uuid-1234-5678-90ab' })
  plantId!: string;
  @ApiProperty({ example: 'Monstera deliciosa' })
  nomScientifique!: string;
  @ApiProperty({ example: 'Monstera' })
  nomCommun!: string;
  @ApiProperty({ example: 'Araceae' })
  famille!: string | null;
  @ApiProperty({ example: 'orange', enum: ToxicityLevel })
  toxicite!: ToxicityLevel;
  @ApiProperty({ example: 'Commune' })
  badgeRarete!: string | null;
  /** Description réelle de l'espèce (Plant.id `description.value`), null si non fournie. */
  @ApiProperty({
    example: "Plante d'intérieur populaire avec de grandes feuilles découpées.",
  })
  aPropos!: string | null;
  @ApiProperty({
    example: {
      lumiere: 'Lumière indirecte brillante',
      sol: 'Terreau bien drainé',
      arrosage: 'Laisser sécher le sol entre les arrosages',
      multiplication: 'Par bouturage de tige',
    },
  })
  conseilsEntretien!: {
    lumiere?: string;
    sol?: string;
    arrosage?: string;
    multiplication?: string;
  } | null;
  @ApiProperty({ example: 'https://images.example.com/monstera.jpg' })
  urlImage!: string | null;
  @ApiProperty({ example: 150 })
  xpGagne!: number;
  /** Score de confiance réel de Plant.id (0-100), voir identification.service.ts. */
  @ApiProperty({ example: 98 })
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
  conseilsEntretien!: {
    lumiere?: string;
    sol?: string;
    arrosage?: string;
    multiplication?: string;
  } | null;
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
    traitement: {
      biologique?: string;
      chimique?: string;
      prevention?: string;
    } | null;
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
  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jean Dupont' })
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({ example: 'jean_dpt' })
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, { message: 'Le mot de passe doit contenir au moins 8 caractères, dont 1 lettre et 1 chiffre.' })
  motDePasse!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;
  @ApiProperty({ example: 'jean.dupont@example.com' })
  email!: string;
  @ApiProperty({ example: 'Jean Dupont' })
  fullName!: string;
  @ApiProperty({ example: 'jean_dpt' })
  username!: string | null;
  @ApiProperty({ example: 100 })
  experience!: number;
  @ApiProperty({ example: 2 })
  niveau!: number;
  @ApiProperty({ example: ['badge_1', 'badge_2'] })
  insignes!: string[];
  @ApiProperty({ example: 50 })
  pieces!: number;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'jean.dupont@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
  motDePasse!: string;
}

export class LoginResponseDto {
  accessToken!: string;
  user!: RegisterResponseDto;
  needsUsername!: boolean;
}

export class GoogleLoginRequestDto {
  @IsNotEmpty()
  idToken!: string;
}

// ----- DTOs pour le Feed -----

export class CreatePostRequestDto {
  @IsOptional()
  @IsUUID()
  collectionId?: string; // Plante taguée (optionnelle)

  @IsOptional()
  @IsString()
  contenuTexte?: string;

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
    username: string;
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
    username: string;
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
  username!: string;
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
  username!: string;
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
  username!: string;
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
  fullName?: string;

  @IsOptional()
  @IsString()
  urlAvatar?: string;
}

export class SetUsernameDto {
  @IsNotEmpty()
  @IsString()
  username!: string;
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
  fullName!: string;
  username!: string;
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
