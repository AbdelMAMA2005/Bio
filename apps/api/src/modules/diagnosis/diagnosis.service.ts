import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Collection } from '../../entities/collection.entity';
import { HealthStatus } from '../../entities/enums/health-status.enum';
import { DiagnosisResponseDto } from '../../dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Plant.id v3 Health renvoie `treatment.{biological,chemical,prevention}` comme des
 * TABLEAUX de conseils (vérifié en conditions réelles, pas des chaînes comme le laissait
 * penser l'ancien code) : on les joint en texte, et on omet une catégorie vide plutôt que
 * d'afficher une case de traitement vide (jamais de texte inventé).
 */
function joinTreatment(raw: {
  biological?: string[];
  chemical?: string[];
  prevention?: string[];
}):
  { biologique?: string; chimique?: string; prevention?: string } | undefined {
  const biologique = raw.biological?.length
    ? raw.biological.join(' ')
    : undefined;
  const chimique = raw.chemical?.length ? raw.chemical.join(' ') : undefined;
  const prevention = raw.prevention?.length
    ? raw.prevention.join(' ')
    : undefined;
  if (!biologique && !chimique && !prevention) return undefined;
  return { biologique, chimique, prevention };
}

@Injectable()
export class DiagnosisService {
  private readonly logger = new Logger(DiagnosisService.name);
  private readonly apiKey: string;
  private readonly useMock: boolean;

  constructor(
    @InjectRepository(Collection)
    private collectionRepo: Repository<Collection>,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('PLANT_ID_API_KEY')!;
    this.useMock =
      !this.apiKey || this.configService.get<string>('FORCE_MOCK') === 'true';
  }

  private getAbsolutePhotoPath(photoUrl: string): string {
    // Voir collection.service.ts#addPhoto : 3 x '..' pour remonter jusqu'à apps/api/,
    // pas 2 (sinon on cherche le fichier dans dist/uploads/... alors qu'il est réellement
    // dans apps/api/uploads/..., et le repli "dernière photo de l'historique" échoue
    // toujours avec "fichier non trouvé").
    const uploadsBase = path.join(__dirname, '..', '..', '..', 'uploads');
    const relativePart = photoUrl.replace(/^\/?uploads\/?/, '');
    return path.join(uploadsBase, relativePart);
  }

  async diagnosePlantHealth(
    userId: string,
    collectionId: string,
    imageBuffer?: Buffer,
  ): Promise<DiagnosisResponseDto> {
    // 1. Vérifier que la collection existe et appartient à l'utilisateur
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId, userId },
      relations: { plante: true },
    });

    if (!collection) {
      throw new NotFoundException(
        'Collection non trouvée ou ne vous appartient pas.',
      );
    }

    // 2. Si aucune image fournie, utiliser la dernière photo de l'historique
    let bufferToUse = imageBuffer;
    if (!bufferToUse) {
      if (
        !collection.historiquePhotos ||
        collection.historiquePhotos.length === 0
      ) {
        throw new BadRequestException(
          'Aucune image disponible pour le diagnostic. Veuillez fournir une photo de la plante.',
        );
      }
      const lastPhoto =
        collection.historiquePhotos[collection.historiquePhotos.length - 1];
      const absolutePath = this.getAbsolutePhotoPath(lastPhoto);
      if (fs.existsSync(absolutePath)) {
        bufferToUse = fs.readFileSync(absolutePath);
      } else {
        throw new BadRequestException(
          "Le fichier de la dernière photo de l'historique n'a pas été trouvé sur le serveur.",
        );
      }
    }

    // 3. Appel à l'API Plant.id Health (ou mock)
    let diagnosisResult: DiagnosisResponseDto;

    if (this.useMock) {
      diagnosisResult = this.mockDiagnosis(collection);
    } else {
      diagnosisResult = await this.callPlantIdHealth(bufferToUse);
    }

    // 4. Si une image a été fournie lors de l'appel, la sauvegarder et l'ajouter à l'historique
    if (imageBuffer) {
      const uploadDir = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'uploads',
        'collections',
        collectionId,
      );
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${uuidv4()}.jpg`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, imageBuffer);

      const imageUrl = `/uploads/collections/${collectionId}/${filename}`;
      collection.historiquePhotos = [
        ...(collection.historiquePhotos || []),
        imageUrl,
      ];
    }

    // 5. Mettre à jour l'état de santé de la collection
    let nouveauStatus = HealthStatus.GOOD;
    if (diagnosisResult.estSain) {
      nouveauStatus = HealthStatus.GOOD;
    } else {
      const probaMaladie = 1 - diagnosisResult.probabiliteSante;
      if (probaMaladie >= 0.7) {
        nouveauStatus = HealthStatus.DANGER;
      } else {
        nouveauStatus = HealthStatus.WARNING;
      }
    }

    // 6. Sauvegarder le diagnostic (maladie, confiance, traitement, date) pour que le
    // bouton "Voir le diagnostic" côté front puisse le rouvrir sans relancer d'analyse —
    // écrase le précédent (toujours le plus récent, cohérent avec etatSante ci-dessus,
    // recalculé dans le même appel). `null` sur les champs maladie quand la plante est
    // saine : jamais de texte inventé pour un diagnostic qui n'a rien détecté.
    const topSuggestion = diagnosisResult.suggestions[0];
    collection.dernierDiagnostic = {
      maladieNom: diagnosisResult.estSain ? null : (topSuggestion?.nom ?? null),
      scoreGlobal: diagnosisResult.scoreGlobal,
      traitement: diagnosisResult.estSain
        ? null
        : (topSuggestion?.traitement ?? null),
      description: diagnosisResult.estSain
        ? null
        : (topSuggestion?.description ?? null),
      estSain: diagnosisResult.estSain,
      dateDiagnostic: new Date().toISOString(),
    };

    collection.etatSante = nouveauStatus;
    await this.collectionRepo.save(collection);

    return diagnosisResult;
  }

  /**
   * Plant.id v3 Health Assessment, comme l'identification (voir identification.service.ts) :
   * `health`/`details`/`language` sont des QUERY PARAMS, pas des champs du corps JSON — le
   * corps ne prend que `images`/`similar_images`. Vérifié en conditions réelles (23/07/2026) :
   * l'ancienne forme (tout dans le body) renvoyait systématiquement une erreur 400 Plant.id
   * ("Unknown modifier"), masquée en un 500 générique côté back, donc jamais diagnostiquée
   * avant (aucun test ne couvrait le vrai appel HTTP, seulement le mode mock). `details=`
   * demandé (`local_name,description,treatment,classification,common_names,cause`) est
   * nécessaire pour obtenir un texte de traitement — sans lui, `suggestions[].details` ne
   * contient que `language`/`entity_id`, jamais de texte exploitable.
   */
  private async callPlantIdHealth(
    imageBuffer: Buffer,
  ): Promise<DiagnosisResponseDto> {
    const imageBase64 = imageBuffer.toString('base64');
    const baseUrl =
      this.configService.get<string>('PLANT_ID_API_URL_health') ||
      'https://api.plant.id/v3/health_assessment';
    const url = `${baseUrl}?health=all&details=local_name,description,treatment,classification,common_names,cause&language=fr`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [imageBase64],
          similar_images: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `❌ Erreur Plant.id Health (HTTP ${response.status}): ${errorBody}`,
        );
        throw new BadRequestException(
          "Erreur lors de l'appel à l'API Plant.id Health",
        );
      }

      const data = await response.json();
      const healthResult = data.result?.is_healthy || {};
      const estSain = healthResult.binary ?? true;
      const probabiliteSante = healthResult.probability ?? 0.9;

      const suggestions = data.result?.disease?.suggestions || [];

      return {
        estSain,
        probabiliteSante,
        suggestions: suggestions.map((s: any) => ({
          id: s.id || 'unknown',
          nom: s.name || 'Inconnu',
          probabilite: s.probability || 0,
          estNuisible: s.is_harmful ?? true,
          traitement: s.details?.treatment
            ? joinTreatment(s.details.treatment)
            : undefined,
          description: s.details?.description || s.details?.local_name || null,
        })),
        scoreGlobal: estSain
          ? Math.round(probabiliteSante * 100)
          : Math.round((1 - probabiliteSante) * 100),
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`❌ Erreur Plant.id Health: ${error.message}`);
      throw new InternalServerErrorException(
        'Le diagnostic de santé a échoué. Veuillez réessayer plus tard.',
      );
    }
  }

  // ----- Mode mock -----
  private mockDiagnosis(collection: Collection): DiagnosisResponseDto {
    const estSain = Math.random() > 0.3; // 70% de chances d'être sain
    const suggestions = estSain
      ? []
      : [
          {
            id: 'mock-disease-1',
            nom: 'Carence en eau (simulée)',
            probabilite: 0.85,
            estNuisible: true,
            traitement: {
              biologique: 'Paillage et apport de compost',
              chimique: 'Engrais riche en potassium',
              prevention: 'Arrosage régulier en été',
            },
            description: 'Les feuilles montrent des signes de flétrissement.',
          },
        ];

    const probabiliteSante = estSain ? 0.9 : 0.3;

    return {
      estSain,
      probabiliteSante,
      suggestions,
      scoreGlobal: estSain
        ? Math.round(probabiliteSante * 100)
        : Math.round((1 - probabiliteSante) * 100),
    };
  }
}
