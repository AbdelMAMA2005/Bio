import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Collection } from '../../entities/collection.entity';
import { HealthStatus } from '../../entities/enums/health-status.enum';
import { DiagnosisResponseDto } from '../../dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DiagnosisService {
  private readonly apiKey: string;
  private readonly useMock: boolean;

  constructor(
    @InjectRepository(Collection)
    private collectionRepo: Repository<Collection>,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('PLANT_ID_API_KEY')!;
    this.useMock = !this.apiKey || this.configService.get<string>('FORCE_MOCK') === 'true';
  }

  private getAbsolutePhotoPath(photoUrl: string): string {
    const uploadsBase = path.join(__dirname, '..', '..', 'uploads');
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
      throw new NotFoundException('Collection non trouvée ou ne vous appartient pas.');
    }

    // 2. Si aucune image fournie, utiliser la dernière photo de l'historique
    let bufferToUse = imageBuffer;
    if (!bufferToUse) {
      if (!collection.historiquePhotos || collection.historiquePhotos.length === 0) {
        throw new BadRequestException(
          'Aucune image disponible pour le diagnostic. Veuillez fournir une photo de la plante.',
        );
      }
      const lastPhoto = collection.historiquePhotos[collection.historiquePhotos.length - 1];
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
      const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'collections', collectionId);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `${uuidv4()}.jpg`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, imageBuffer);

      const imageUrl = `/uploads/collections/${collectionId}/${filename}`;
      collection.historiquePhotos = [...(collection.historiquePhotos || []), imageUrl];
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

    collection.etatSante = nouveauStatus;
    await this.collectionRepo.save(collection);

    return diagnosisResult;
  }

  private async callPlantIdHealth(imageBuffer: Buffer): Promise<DiagnosisResponseDto> {
    const imageBase64 = imageBuffer.toString('base64');
    const url = this.configService.get<string>('PLANT_ID_API_URL_health') || 'https://api.plant.id/v3/health_assessment';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [imageBase64],
          health: 'all',
          details: ['description', 'treatment'],
          language: 'fr',
        }),
      });

      if (!response.ok) {
        throw new BadRequestException("Erreur lors de l'appel à l'API Plant.id Health");
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
          traitement: s.details?.treatment ? {
            biologique: s.details.treatment.biological,
            chimique: s.details.treatment.chemical,
            prevention: s.details.treatment.prevention,
          } : undefined,
          description: s.details?.description || s.details?.local_name || null,
        })),
        scoreGlobal: estSain ? Math.round(probabiliteSante * 100) : Math.round((1 - probabiliteSante) * 100),
      };
    } catch (error: any) {
      console.error('❌ Erreur Plant.id Health:', error.message);
      throw new InternalServerErrorException(
        'Le diagnostic de santé a échoué. Veuillez réessayer plus tard.',
      );
    }
  }

  // ----- Mode mock -----
  private mockDiagnosis(collection: Collection): DiagnosisResponseDto {
    const estSain = Math.random() > 0.3; // 70% de chances d'être sain
    const suggestions = estSain ? [] : [
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
      scoreGlobal: estSain ? Math.round(probabiliteSante * 100) : Math.round((1 - probabiliteSante) * 100),
    };
  }
}