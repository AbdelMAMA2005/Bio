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

    const collection = new CollectionEntity();
    collection.userId = userId;
    collection.plantId = dto.plantId;
    collection.typeCollection = dto.type as PlantType;
    collection.latitude = dto.latitude || null;
    collection.longitude = dto.longitude || null;
    collection.etatSante = HealthStatus.GOOD;
    collection.historiquePhotos = [];

    const saved = await this.collectionRepo.save(collection);

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

    return collections.map((c) => ({
      id: c.id,
      idPlante: c.plantId,
      nomScientifique: c.plante.nomScientifique,
      nomCommun: c.plante.nomCommun,
      badgeRarete: c.plante.badgeRarete,
      toxicite: c.plante.toxicite,
      etatSante: c.etatSante,
      dateAjout: c.dateAjout,
      urlImage: c.plante.urlImage,
      latitude: c.latitude,
      longitude: c.longitude,
      historiquePhotos: c.historiquePhotos || [],
      type: c.typeCollection,
    }));
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
    return {
      id: c.id,
      idPlante: c.plantId,
      nomScientifique: c.plante.nomScientifique,
      nomCommun: c.plante.nomCommun,
      badgeRarete: c.plante.badgeRarete,
      toxicite: c.plante.toxicite,
      etatSante: c.etatSante,
      dateAjout: c.dateAjout,
      urlImage: c.plante.urlImage,
      latitude: c.latitude,
      longitude: c.longitude,
      historiquePhotos: c.historiquePhotos || [],
      type: c.typeCollection,
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

    return {
      id: saved.id,
      idPlante: saved.plantId,
      nomScientifique: saved.plante.nomScientifique,
      nomCommun: saved.plante.nomCommun,
      badgeRarete: saved.plante.badgeRarete,
      toxicite: saved.plante.toxicite,
      etatSante: saved.etatSante,
      dateAjout: saved.dateAjout,
      urlImage: saved.plante.urlImage,
      latitude: saved.latitude,
      longitude: saved.longitude,
      historiquePhotos: saved.historiquePhotos || [],
      type: saved.typeCollection,
    };
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
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'collections', collectionId);
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