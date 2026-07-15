import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Collection as CollectionEntity } from '../../entities/collection.entity';
import { Plant } from '../../entities/plant.entity';
import { User } from '../../entities/user.entity';
import type { CreateCollectionRequestDto, CreateCollectionResponseDto, GetCollectionResponseDto } from '../../dto';
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
    }));
  }
}