import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Plant } from '../../entities/plant.entity';
import { IdentifyPlantResponseDto } from '../../dto/shared.dto';
import { ToxicityLevel } from '../../entities/enums/toxicity-level.enum';

/**
 * Mock response matching the Plant.id v3 API structure.
 * Used when MOCK_PLANTID=true to allow development without consuming API credits.
 */
const MOCK_PLANT_ID_RESPONSE = {
  access_token: 'mock-token',
  model_version: 'plant_id:4.0.0',
  input: { images: ['mock-base64'] },
  result: {
    is_plant: { probability: 0.98, binary: true },
    classification: {
      suggestions: [
        {
          id: 'mock-suggestion-1',
          name: 'Rosa gallica',
          probability: 0.92,
          details: {
            common_names: ['Rose de France', 'Rose de Provins'],
            taxonomy: {
              family: 'Rosaceae',
              genus: 'Rosa',
              order: 'Rosales',
              class: 'Magnoliopsida',
              phylum: 'Tracheophyta',
              kingdom: 'Plantae',
            },
            toxicity: 'Non toxique pour les humains et les animaux domestiques.',
          },
        },
        {
          id: 'mock-suggestion-2',
          name: 'Rosa canina',
          probability: 0.06,
          details: {
            common_names: ['Églantier', 'Rosier des chiens'],
            taxonomy: { family: 'Rosaceae' },
            toxicity: null,
          },
        },
      ],
    },
  },
};

@Injectable()
export class IdentificationService {
  private readonly logger = new Logger(IdentificationService.name);
  private readonly plantIdApiUrl: string;
  private readonly apiKey: string;
  private readonly useMock: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
  ) {
    this.plantIdApiUrl = this.configService.get<string>('PLANT_ID_API_URL')!;
    this.apiKey = this.configService.get<string>('PLANT_ID_API_KEY')!;
    this.useMock = this.configService.get<string>('MOCK_PLANTID', 'false') === 'true';

    if (!this.useMock && !this.apiKey) {
      throw new Error('PLANT_ID_API_KEY is not defined in environment variables');
    }

    if (this.useMock) {
      this.logger.warn('🧪 Mode MOCK activé — Plant.id ne sera PAS appelé');
    }
  }

  /**
   * Identifies a plant from an image buffer.
   *
   * Plant.id v3 API expects a **JSON body** with base64-encoded images,
   * NOT multipart/form-data (which was used in v2).
   *
   * Endpoint: POST https://api.plant.id/v3/identification
   * Query params: ?details=common_names,toxicity&language=fr
   * Headers: Api-Key, Content-Type: application/json
   * Body: { "images": ["data:image/jpeg;base64,..."], "similar_images": true }
   */
  async identifyPlantFromBuffer(buffer: Buffer): Promise<IdentifyPlantResponseDto> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Image invalide ou vide.');
    }

    const plantIdResponse = this.useMock
      ? await this.getMockResponse()
      : await this.callPlantIdApi(buffer);

    return this.processPlantIdResponse(plantIdResponse);
  }

  // ─────────────────────────────────────────────────────────
  //  Plant.id v3 API call — JSON body with base64 images
  // ─────────────────────────────────────────────────────────

  private async callPlantIdApi(buffer: Buffer): Promise<any> {
    // Plant.id v3 accepts base64 with or without data URI prefix
    const base64Image = buffer.toString('base64');

    // Build the full URL with query params for details & language
    const url = `${this.plantIdApiUrl}?details=common_names,toxicity&language=fr`;

    const payload = {
      images: [`data:image/jpeg;base64,${base64Image}`],
      similar_images: true,
    };

    this.logger.log(`📡 Appel Plant.id v3 : POST ${url}`);
    this.logger.debug(`   Taille image : ${(buffer.length / 1024).toFixed(1)} Ko`);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': this.apiKey,
          },
        }),
      );

      this.logger.log(`✅ Plant.id a répondu — is_plant: ${data?.result?.is_plant?.probability}`);
      return data;
    } catch (error: any) {
      // Extract detailed error information from the Axios response
      const status = error?.response?.status;
      const errorBody = error?.response?.data;
      const message = error?.message || 'Erreur inconnue';

      this.logger.error(
        `❌ Erreur Plant.id (HTTP ${status ?? '?'}): ${message}`,
        errorBody ? JSON.stringify(errorBody) : undefined,
      );

      if (status === 401) {
        throw new InternalServerErrorException(
          'Clé API Plant.id invalide ou expirée.',
        );
      }
      if (status === 429) {
        throw new InternalServerErrorException(
          'Quota Plant.id dépassé. Réessayez plus tard.',
        );
      }
      if (status === 400) {
        throw new BadRequestException(
          `Plant.id a rejeté la requête : ${errorBody?.error?.message || 'format invalide'}`,
        );
      }

      throw new InternalServerErrorException(
        "L'identification a échoué. Veuillez réessayer plus tard.",
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Mock response for development
  // ─────────────────────────────────────────────────────────

  private async getMockResponse(): Promise<any> {
    this.logger.log('🧪 Utilisation de la réponse mock Plant.id');
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 300));
    return structuredClone(MOCK_PLANT_ID_RESPONSE);
  }
// ─────────────────────────────────────────────────────────
  //  Parse Plant.id v3 response → IdentifyPlantResponseDto
  // ─────────────────────────────────────────────────────────

  private async processPlantIdResponse(plantIdResponse: any): Promise<IdentifyPlantResponseDto> {
    // v3 structure: result.classification.suggestions[]
    const suggestions =
      plantIdResponse?.result?.classification?.suggestions || [];

    if (suggestions.length === 0) {
      throw new NotFoundException('Aucune plante reconnue sur cette image.');
    }

    const best = suggestions[0];

    // v3 field mapping
    const nomScientifique: string = best.name || 'Plante inconnue';
    const nomCommun: string =
      best.details?.common_names?.[0] || nomScientifique;
    const famille: string | null =
      best.details?.taxonomy?.family || null;

    // ── Toxicity mapping (Corrigé) ──
    let toxicite = ToxicityLevel.GREEN;
    const toxicityRaw: string | null = best.details?.toxicity || null;

    if (toxicityRaw) {
      const toxLower = toxicityRaw.toLowerCase();

      // 1. D'abord les négations (non toxique)
      if (toxLower.includes('non toxique') || toxLower.includes('non-toxic') || 
          toxLower.includes('not toxic') || toxLower.includes('sans danger')) {
        toxicite = ToxicityLevel.GREEN;
      }
      // 2. Ensuite les formes positives
      else if (toxLower.includes('toxic') || toxLower.includes('toxique') || 
               toxLower.includes('poisonous') || toxLower.includes('dangereux')) {
        toxicite = ToxicityLevel.RED;
      }
      // 3. Cas intermédiaire (attention, peut irriter)
      else if (toxLower.includes('mild') || toxLower.includes('irritant') || 
               toxLower.includes('caution')) {
        toxicite = ToxicityLevel.ORANGE;
      }
      // 4. Par défaut : vert
      else {
        toxicite = ToxicityLevel.GREEN;
      }
    }

    // ── Rarity badge (can be enriched later) ──
    const badgeRarete = 'Commun';

    // ── Find or create the plant entity ──
    let existingPlant = await this.plantRepo.findOne({
      where: { nomScientifique },
    });

    if (!existingPlant) {
      existingPlant = this.plantRepo.create({
        nomScientifique,
        nomCommun,
        famille,
        toxicite,
        badgeRarete,
        conseilsEntretien: null,
        urlImage: null,
      });
      await this.plantRepo.save(existingPlant);
    }

    // ── XP calculation ──
    const xpGagne = this.calculateXP(existingPlant.badgeRarete);

    return {
      plantId: existingPlant.id,
      nomScientifique: existingPlant.nomScientifique,
      nomCommun: existingPlant.nomCommun,
      famille: existingPlant.famille,
      toxicite: existingPlant.toxicite,
      badgeRarete: existingPlant.badgeRarete,
      conseilsEntretien: existingPlant.conseilsEntretien,
      urlImage: existingPlant.urlImage,
      xpGagne,
    };
  }

  private calculateXP(rarity: string | null): number {
    if (rarity === 'Épique') return 100;
    if (rarity === 'Rare') return 50;
    return 25;
  }
}