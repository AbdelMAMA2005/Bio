import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';

// ----- Pagination générique (mêmes bornes que FeedQueryDto) -----
export class AdminPageQueryDto {
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

  @IsOptional()
  @IsString()
  q?: string;
}

// ----- Utilisateurs -----
export class AdminUsersQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @IsIn(['tous', 'admins', 'inactifs', 'suspendus'])
  filtre?: 'tous' | 'admins' | 'inactifs' | 'suspendus' = 'tous';
}

export class AdminUpdateRoleDto {
  @IsIn(['membre', 'moderateur', 'admin'])
  role!: 'membre' | 'moderateur' | 'admin';
}

export class AdminUpdateStatusDto {
  @IsBoolean()
  suspendu!: boolean;
}

// ----- Référentiel plantes -----
export class AdminPlantsQueryDto extends AdminPageQueryDto {}

export class AdminConseilsEntretienDto {
  @IsOptional()
  @IsString()
  lumiere?: string;

  @IsOptional()
  @IsString()
  sol?: string;

  @IsOptional()
  @IsString()
  arrosage?: string;

  @IsOptional()
  @IsString()
  multiplication?: string;
}

export class AdminCreatePlantDto {
  @IsNotEmpty()
  @IsString()
  nomScientifique!: string;

  @IsNotEmpty()
  @IsString()
  nomCommun!: string;

  @IsOptional()
  @IsString()
  famille?: string;

  @IsEnum(ToxicityLevel)
  toxicite!: ToxicityLevel;

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
  @Type(() => AdminConseilsEntretienDto)
  conseilsEntretien?: AdminConseilsEntretienDto;
}

export class AdminUpdatePlantDto {
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
  @Type(() => AdminConseilsEntretienDto)
  conseilsEntretien?: AdminConseilsEntretienDto;
}

// ----- Modération -----
export class AdminModerationQueryDto extends AdminPageQueryDto {}

// ----- Défis -----
export class AdminCreateQuestDto {
  @IsNotEmpty()
  @IsString()
  id!: string;

  @IsNotEmpty()
  @IsString()
  libelle!: string;

  @IsIn(['quotidien', 'exploration'])
  type!: 'quotidien' | 'exploration';

  @IsNumber()
  @Min(1)
  objectif!: number;

  @IsNumber()
  @Min(0)
  recompenseXp!: number;

  @IsNumber()
  @Min(0)
  recompensePieces!: number;
}

export class AdminUpdateQuestDto {
  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsIn(['quotidien', 'exploration'])
  type?: 'quotidien' | 'exploration';

  @IsOptional()
  @IsNumber()
  @Min(1)
  objectif?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recompenseXp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recompensePieces?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

// ----- Feature flags -----
export class AdminUpdateFeatureFlagDto {
  @IsBoolean()
  actif!: boolean;
}
