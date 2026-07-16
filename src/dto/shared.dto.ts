import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';
import { PlantType } from '../entities/enums/plant-type.enum';
import { HealthStatus } from '../entities/enums/health-status.enum';
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional, IsNumber, IsString, IsUUID } from 'class-validator';

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
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}