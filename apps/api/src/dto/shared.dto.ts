import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';
import { PlantType } from '../entities/enums/plant-type.enum';
import { HealthStatus } from '../entities/enums/health-status.enum';
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional, IsNumber, IsString, IsUUID, Min } from 'class-validator';

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
  conseilsEntretien!:
    | {
        arrosage?: string;
        lumiere?: string;
        temperature?: string;
        rempotage?: string;
      }
    | null;
  urlImage!: string | null;
  xpGagne!: number;
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
  badgeRarete!: string | null;
  toxicite!: ToxicityLevel;
  etatSante!: HealthStatus;
  dateAjout!: Date;
  urlImage!: string | null;
  latitude!: number | null;
  longitude!: number | null;
  historiquePhotos!: string[];
  type!: PlantType;
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
  likesCount!: number;
  commentairesCount!: number;
  estLikedParUtilisateur!: boolean;
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
  conseilsEntretien?: {
    arrosage?: string;
    lumiere?: string;
    temperature?: string;
    rempotage?: string;
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
  conseilsEntretien?: {
    arrosage?: string;
    lumiere?: string;
    temperature?: string;
    rempotage?: string;
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
  conseilsEntretien!: {
    arrosage?: string;
    lumiere?: string;
    temperature?: string;
    rempotage?: string;
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