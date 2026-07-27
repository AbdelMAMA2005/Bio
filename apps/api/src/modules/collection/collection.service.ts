import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Collection as CollectionEntity } from '../../entities/collection.entity';
import { Plant } from '../../entities/plant.entity';
import { User } from '../../entities/user.entity';
import type { CreateCollectionRequestDto, CreateCollectionResponseDto, GetCollectionResponseDto, UpdateCollectionDto } from '../../dto';
import { PlantType } from '../../entities/enums/plant-type.enum';
import { HealthStatus } from '../../entities/enums/health-status.enum';
import { calculateXpForRarity } from '../../common/xp';
import { computeRarityFromPriorCaptures } from '../../common/rarity';
import { DEFAULT_WATERING_INTERVAL_DAYS } from '../../common/watering';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(CollectionEntity)
    private collectionRepo: Repository<CollectionEntity>,
    @InjectRepository(Plant)
    private plantRepo: Repository<Plant>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Ajouter une plante à la collection (Jardin ou Herbarium)
  async create(
    userId: string,
    dto: CreateCollectionRequestDto,
  ): Promise<CreateCollectionResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId, dateSuppression: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé ou supprimé');
    }

    const plant = await this.plantRepo.findOne({ where: { id: dto.plantId } });
    if (!plant) {
      throw new NotFoundException('Plante non trouvée');
    }

    // Rareté réelle de l'espèce : dérivée du nombre de captures déjà existantes
    // (tous utilisateurs confondus) AVANT celle-ci — remplace le badgeRarete
    // auparavant toujours figé à "Commun" (BACKEND_ISSUES.md §5). Recalculée à
    // chaque nouvelle capture pour rester à jour avec l'usage réel de l'app.
    const priorCaptures = await this.collectionRepo.count({ where: { plantId: dto.plantId } });
    const rarete = computeRarityFromPriorCaptures(priorCaptures);
    if (plant.badgeRarete !== rarete) {
      plant.badgeRarete = rarete;
      await this.plantRepo.save(plant);
    }

    const collection = new CollectionEntity();
    collection.userId = userId;
    collection.plantId = dto.plantId;
    collection.typeCollection = dto.type as PlantType;
    collection.latitude = dto.latitude || null;
    collection.longitude = dto.longitude || null;
    collection.etatSante = HealthStatus.GOOD;
    collection.historiquePhotos = [];

    const saved = await this.collectionRepo.save(collection);

    // Attribution d'XP à la capture selon la rareté (TODO.md phase 1) — jusqu'ici
    // POST /identification renvoyait bien `xpGagne`, mais rien ne le créditait jamais
    // à l'utilisateur (bug corrigé ici, au moment où la plante rejoint réellement le
    // Jardin/Herbarium plutôt qu'au simple scan).
    await this.userRepo.increment({ id: userId }, 'experience', calculateXpForRarity(rarete));

    return {
      id: saved.id,
      idUtilisateur: saved.userId,
      idPlante: saved.plantId,
      type: saved.typeCollection,
      etatSante: saved.etatSante,
      dateAjout: saved.dateAjout,
      latitude: saved.latitude,
      longitude: saved.longitude,
    };
  }

  // Récupérer les collections d'un utilisateur, filtrées par type
  async findByUserAndType(
    userId: string,
    type?: PlantType,
  ): Promise<GetCollectionResponseDto[]> {
    const query = this.collectionRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.plante', 'p')
      .where('c.userId = :userId', { userId });

    if (type) {
      query.andWhere('c.typeCollection = :type', { type });
    }

    const collections = await query.orderBy('c.dateAjout', 'DESC').getMany();

    return collections.map((c) => this.mapToResponseDto(c));
  }

  // Récupérer un élément spécifique de la collection d'un utilisateur
  async findOneByUser(id: string, userId: string): Promise<GetCollectionResponseDto> {
    const c = await this.collectionRepo.findOne({
      where: { id, userId },
      relations: { plante: true },
    });
    if (!c) {
      throw new NotFoundException('Entrée de collection non trouvée');
    }
    return this.mapToResponseDto(c);
  }

  /**
   * derniereArrosage + intervalle de l'espèce (ou repli DEFAULT_WATERING_INTERVAL_DAYS
   * si Plant.frequenceArrosageJours n'a jamais été calculé, ex. espèce du seed) —
   * toujours recalculé à la lecture, jamais une valeur stockée en base.
   */
  private computeProchainArrosage(c: CollectionEntity): Date {
    const intervalJours = c.plante.frequenceArrosageJours ?? DEFAULT_WATERING_INTERVAL_DAYS;
    return new Date(c.derniereArrosage.getTime() + intervalJours * 24 * 60 * 60 * 1000);
  }

  private mapToResponseDto(c: CollectionEntity): GetCollectionResponseDto {
    return {
      id: c.id,
      idPlante: c.plantId,
      nomScientifique: c.plante.nomScientifique,
      nomCommun: c.plante.nomCommun,
      famille: c.plante.famille,
      badgeRarete: c.plante.badgeRarete,
      toxicite: c.plante.toxicite,
      etatSante: c.etatSante,
      dateAjout: c.dateAjout,
      urlImage: c.plante.urlImage,
      aPropos: c.plante.aPropos,
      conseilsEntretien: c.plante.conseilsEntretien,
      latitude: c.latitude,
      longitude: c.longitude,
      historiquePhotos: c.historiquePhotos || [],
      dernierDiagnostic: c.dernierDiagnostic ?? null,
      type: c.typeCollection,
      prochainArrosage: this.computeProchainArrosage(c),
    };
  }

  // Mettre à jour un élément de la collection
  async update(
    userId: string,
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<GetCollectionResponseDto> {
    const c = await this.collectionRepo.findOne({
      where: { id, userId },
      relations: { plante: true },
    });
    if (!c) {
      throw new NotFoundException('Collection non trouvée ou ne vous appartient pas.');
    }

    if (dto.etatSante !== undefined) {
      c.etatSante = dto.etatSante;
    }
    if (dto.typeCollection !== undefined) {
      c.typeCollection = dto.typeCollection;
    }
    if (dto.latitude !== undefined) {
      c.latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      c.longitude = dto.longitude;
    }

    const saved = await this.collectionRepo.save(c);

    return this.mapToResponseDto(saved);
  }

  /**
   * Marque la plante comme arrosée maintenant (`derniereArrosage = now()`) — recalcule
   * `prochainArrosage` en conséquence à la prochaine lecture. Action explicite de
   * l'utilisateur (bouton "Marquer comme arrosé", Mon Quotidien), distincte de
   * `dateAjout` qui ne bouge jamais après la capture.
   */
  async waterNow(userId: string, id: string): Promise<GetCollectionResponseDto> {
    const c = await this.collectionRepo.findOne({
      where: { id, userId },
      relations: { plante: true },
    });
    if (!c) {
      throw new NotFoundException('Collection non trouvée ou ne vous appartient pas.');
    }

    c.derniereArrosage = new Date();
    const saved = await this.collectionRepo.save(c);

    return this.mapToResponseDto(saved);
  }

  // Supprimer physiquement un élément de la collection
  async delete(userId: string, id: string): Promise<void> {
    const collection = await this.collectionRepo.findOne({
      where: { id, userId },
    });
    if (!collection) {
      throw new NotFoundException('Collection non trouvée ou ne vous appartient pas.');
    }
    await this.collectionRepo.remove(collection);
  }

  // Ajouter une photo de suivi
  async addPhoto(
    userId: string,
    collectionId: string,
    file: Express.Multer.File,
  ): Promise<{ historiquePhotos: string[] }> {
    // 1. Vérifier que la collection existe et appartient à l'utilisateur
    const collection = await this.collectionRepo.findOne({
      where: { id: collectionId, userId },
    });

    if (!collection) {
      throw new NotFoundException('Collection non trouvée ou ne vous appartient pas.');
    }

    // 2. Créer le dossier de l'utilisateur si nécessaire
    // 3 x '..' pour remonter jusqu'à apps/api/ (depuis dist/modules/collection en
    // exécution compilée, ou src/modules/collection en ts-node) : avec seulement 2
    // niveaux (ancien code), le fichier atterrissait dans dist/uploads/... alors que
    // main.ts sert les statiques depuis apps/api/uploads/... — 404 systématique sur
    // toute photo uploadée, jamais détecté car aucun test ne faisait de vrai GET HTTP
    // sur l'URL renvoyée (voir rapport.md).
    const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'collections', collectionId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 3. Générer un nom de fichier unique
    const extension = path.extname(file.originalname) || '.jpg';
    const filename = `${uuidv4()}${extension}`;
    const filePath = path.join(uploadDir, filename);

    // 4. Sauvegarder le fichier
    fs.writeFileSync(filePath, file.buffer);

    // 5. Construire l'URL publique
    const imageUrl = `/uploads/collections/${collectionId}/${filename}`;

    // 6. Ajouter l'URL au tableau historiquePhotos
    const historiquePhotos = [...(collection.historiquePhotos || []), imageUrl];
    collection.historiquePhotos = historiquePhotos;
    await this.collectionRepo.save(collection);

    return { historiquePhotos };
  }

}