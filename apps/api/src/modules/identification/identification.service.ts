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
import { Collection } from '../../entities/collection.entity';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { IdentifyPlantResponseDto } from '../../dto/shared.dto';
import { calculateXpForRarity } from '../../common/xp';
import { computeRarityFromPriorCaptures } from '../../common/rarity';
import { classifyToxicity } from '../../common/toxicity-classifier';
import { describeWatering, wateringIntervalDays } from '../../common/watering';

/**
 * En dessous de ce seuil, Plant.id lui-même indique qu'il n'est pas confiant que
 * l'image contienne une plante du tout (photo floue, objet non végétal...).
 */
const MIN_IS_PLANT_PROBABILITY = 0.3;

/**
 * En dessous de ce seuil, la meilleure suggestion de Plant.id est trop incertaine
 * pour être présentée comme un résultat fiable — mieux vaut demander à
 * l'utilisateur de reprendre la photo que d'afficher une identification
 * probablement fausse (cahier des charges : "gérer les cas non reconnu / faible
 * confiance").
 */
const MIN_SUGGESTION_PROBABILITY = 0.05;

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
            toxicity:
              'Non toxique pour les humains et les animaux domestiques.',
            description: {
              value:
                "Le rosier de France est un arbuste épineux à fleurs roses très parfumées, cultivé depuis l'Antiquité pour ses usages ornementaux et médicinaux.",
            },
            watering: { min: 2, max: 2 },
            best_light_condition: 'Plein soleil à mi-ombre',
            best_soil_type: 'Sol bien drainé, riche en matière organique',
            propagation_methods: ['Bouturage', 'Greffage'],
            image: {
              value: 'https://bs.plantnet.org/image/o/mock-rosa-gallica.jpg',
            },
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
    @InjectRepository(IdentificationLog)
    private readonly identificationLogRepo: Repository<IdentificationLog>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
  ) {
    this.plantIdApiUrl = this.configService.get<string>('PLANT_ID_API_URL')!;
    this.apiKey = this.configService.get<string>('PLANT_ID_API_KEY')!;
    this.useMock =
      this.configService.get<string>('MOCK_PLANTID', 'false') === 'true';

    if (!this.useMock && !this.apiKey) {
      throw new Error(
        'PLANT_ID_API_KEY is not defined in environment variables',
      );
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
   * Query params: ?details=common_names,taxonomy,toxicity&language=fr
   * Headers: Api-Key, Content-Type: application/json
   * Body: { "images": ["data:image/jpeg;base64,..."], "similar_images": true }
   */
  async identifyPlantFromBuffer(
    userId: string,
    buffer: Buffer,
  ): Promise<IdentifyPlantResponseDto> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Image invalide ou vide.');
    }

    const plantIdResponse = this.useMock
      ? await this.getMockResponse()
      : await this.callPlantIdApi(buffer);

    const result = await this.processPlantIdResponse(plantIdResponse);

    // Journalise l'identification pour le défi quotidien "Scanner 3 plantes
    // différentes" (module quests) — sans ce log, impossible de savoir combien
    // d'espèces distinctes un utilisateur a scannées aujourd'hui.
    await this.identificationLogRepo.save(
      this.identificationLogRepo.create({ userId, plantId: result.plantId }),
    );

    return result;
  }

  // ─────────────────────────────────────────────────────────
  //  Plant.id v3 API call — JSON body with base64 images
  // ─────────────────────────────────────────────────────────

  private async callPlantIdApi(buffer: Buffer): Promise<any> {
    // Plant.id v3 accepts base64 with or without data URI prefix
    const base64Image = buffer.toString('base64');

    // Build the full URL with query params for details & language.
    // `taxonomy` est indispensable pour la famille botanique (cahier des charges
    // §3.2 : "Affichage du nom, de la famille botanique, et de la toxicité") —
    // absent ici jusqu'au 23/07/2026, ce qui laissait `famille` toujours `null`
    // en conditions réelles (masqué par le mock, qui fournissait toujours une
    // famille fixe "Rosaceae" ; découvert en testant une vraie clé Plant.id).
    // `edible_parts` (donnée structurée : quelles parties sont comestibles) est
    // le signal principal du classifieur de toxicité (voir common/toxicity-classifier.ts)
    // — bien plus fiable que d'analyser seul le texte libre `toxicity`.
    // `description`, `watering`, `best_light_condition`, `best_soil_type`,
    // `propagation_methods` et `image` alimentent la fiche détail (À propos +
    // conseils d'entretien + vraie photo, 23/07/2026) — Plant.id n'a PAS de champ
    // structuré "température" ni "habitat" (vérifié empiriquement et via la doc
    // kindwise.com/handbook), d'où le choix d'arrosage/multiplication comme
    // signaux réels de remplacement (voir common/watering.ts et rapport.md).
    const url = `${this.plantIdApiUrl}?details=common_names,taxonomy,toxicity,edible_parts,description,watering,best_light_condition,best_soil_type,propagation_methods,image&language=fr`;

    const payload = {
      images: [`data:image/jpeg;base64,${base64Image}`],
      similar_images: true,
    };

    this.logger.log(`📡 Appel Plant.id v3 : POST ${url}`);
    this.logger.debug(
      `   Taille image : ${(buffer.length / 1024).toFixed(1)} Ko`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': this.apiKey,
          },
        }),
      );

      this.logger.log(
        `✅ Plant.id a répondu — is_plant: ${data?.result?.is_plant?.probability}`,
      );
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

  private async processPlantIdResponse(
    plantIdResponse: any,
  ): Promise<IdentifyPlantResponseDto> {
    // La probabilité que l'image contienne une plante (indépendante de l'espèce) :
    // trop basse, la photo n'est probablement pas une plante du tout (objet,
    // animal, photo floue...).
    const isPlantProbability: number =
      plantIdResponse?.result?.is_plant?.probability ?? 1;
    if (isPlantProbability < MIN_IS_PLANT_PROBABILITY) {
      throw new NotFoundException(
        'Aucune plante détectée sur cette image. Réessayez avec une photo plus nette de la plante.',
      );
    }

    // v3 structure: result.classification.suggestions[]
    const suggestions =
      plantIdResponse?.result?.classification?.suggestions || [];

    if (suggestions.length === 0) {
      throw new NotFoundException('Aucune plante reconnue sur cette image.');
    }

    const best = suggestions[0];
    const confidence: number = best.probability ?? 0;
    if (confidence < MIN_SUGGESTION_PROBABILITY) {
      throw new NotFoundException(
        "Cette plante n'a pas pu être identifiée avec suffisamment de certitude. Réessayez avec une photo plus nette, sous un meilleur angle ou avec plus de lumière.",
      );
    }

    // v3 field mapping
    const nomScientifique: string = best.name || 'Plante inconnue';
    const nomCommun: string =
      best.details?.common_names?.[0] || nomScientifique;
    const famille: string | null = best.details?.taxonomy?.family || null;

    // ── Toxicity mapping ── voir common/toxicity-classifier.ts : ancré sur
    // `edible_parts` (donnée structurée Plant.id), pas seulement une recherche de
    // mots-clés dans le texte libre `toxicity` (l'ancienne version classait la
    // tomate et la mangue "Toxique" juste parce que le mot "toxic" apparaît dans
    // leur description, alors que leur fruit est comestible — voir rapport.md).
    const toxicityRaw: string | null = best.details?.toxicity || null;
    const edibleParts: string[] | null = best.details?.edible_parts || null;
    const toxicite = classifyToxicity(toxicityRaw, edibleParts);

    // ── "À propos" & conseils d'entretien ── uniquement des signaux réels et
    // structurés fournis par Plant.id (pas de texte inventé quand une donnée
    // manque : la case correspondante reste simplement absente de l'objet, le
    // front affiche alors "—" plutôt qu'une fausse valeur — voir rapport.md).
    const aPropos: string | null = best.details?.description?.value || null;
    const lumiere: string | undefined =
      best.details?.best_light_condition || undefined;
    const sol: string | undefined = best.details?.best_soil_type || undefined;
    const arrosage: string | undefined = describeWatering(
      best.details?.watering,
    );
    const frequenceArrosageJours: number | undefined = wateringIntervalDays(
      best.details?.watering,
    );
    const multiplication: string | undefined =
      Array.isArray(best.details?.propagation_methods) &&
      best.details.propagation_methods.length > 0
        ? best.details.propagation_methods.join(', ')
        : undefined;
    const hasCareData = lumiere || sol || arrosage || multiplication;
    const conseilsEntretien = hasCareData
      ? { lumiere, sol, arrosage, multiplication }
      : null;
    const urlImage: string | null = best.details?.image?.value || null;

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
        badgeRarete: 'Commun', // valeur initiale par défaut, avant toute capture réelle.
        aPropos,
        conseilsEntretien,
        urlImage,
        frequenceArrosageJours: frequenceArrosageJours ?? null,
      });
      await this.plantRepo.save(existingPlant);
    } else if (
      !existingPlant.aPropos ||
      !existingPlant.conseilsEntretien ||
      !existingPlant.urlImage ||
      !existingPlant.frequenceArrosageJours
    ) {
      // Une espèce déjà en base (créée avant l'ajout de la fiche détail, ou lors
      // d'un premier scan où Plant.id manquait ces champs) ne se voit jamais mise
      // à jour spontanément : on complète ici les seules cases encore vides,
      // sans écraser une donnée déjà présente — voir rapport.md.
      existingPlant.aPropos = existingPlant.aPropos ?? aPropos;
      existingPlant.conseilsEntretien =
        existingPlant.conseilsEntretien ?? conseilsEntretien;
      existingPlant.urlImage = existingPlant.urlImage ?? urlImage;
      existingPlant.frequenceArrosageJours =
        existingPlant.frequenceArrosageJours ?? frequenceArrosageJours ?? null;
      await this.plantRepo.save(existingPlant);
    }

    // ── Rareté & XP prévisionnels ──
    // Même calcul que CollectionService.create() (voir common/rarity.ts), en lecture
    // seule ici (rien n'est persisté tant que l'utilisateur n'a pas réellement choisi
    // Jardin/Herbarium) : garantit que le badge et l'XP affichés juste après le scan
    // correspondent à ce qui sera vraiment crédité à la capture, plutôt que de
    // montrer un chiffre qui changerait ensuite (cahier des charges : l'animation
    // "+45 XP" doit annoncer un gain réel, pas une estimation trompeuse).
    const priorCaptures = await this.collectionRepo.count({
      where: { plantId: existingPlant.id },
    });
    const raretePrevisionnelle = computeRarityFromPriorCaptures(priorCaptures);
    const xpGagne = calculateXpForRarity(raretePrevisionnelle);

    return {
      plantId: existingPlant.id,
      nomScientifique: existingPlant.nomScientifique,
      nomCommun: existingPlant.nomCommun,
      famille: existingPlant.famille,
      toxicite: existingPlant.toxicite,
      badgeRarete: raretePrevisionnelle,
      aPropos: existingPlant.aPropos,
      conseilsEntretien: existingPlant.conseilsEntretien,
      urlImage: existingPlant.urlImage,
      xpGagne,
      confiance: Math.round(confidence * 100),
    };
  }
}
