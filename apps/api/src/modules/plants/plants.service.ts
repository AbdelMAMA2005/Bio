import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';
import { CreatePlantDto, UpdatePlantDto, PlantListQueryDto, PlantResponseDto } from '../../dto';

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
  ) {}

  private mapToDto(plant: Plant): PlantResponseDto {
    return {
      id: plant.id,
      nomScientifique: plant.nomScientifique,
      nomCommun: plant.nomCommun,
      famille: plant.famille,
      toxicite: plant.toxicite,
      urlImage: plant.urlImage,
      badgeRarete: plant.badgeRarete,
      aPropos: plant.aPropos,
      conseilsEntretien: plant.conseilsEntretien,
    };
  }

  async findAll(query: PlantListQueryDto): Promise<{ items: PlantResponseDto[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.plantRepo.createQueryBuilder('p');

    if (query.nom) {
      qb.andWhere(
        '(LOWER(p.nomScientifique) LIKE :nom OR LOWER(p.nomCommun) LIKE :nom)',
        { nom: `%${query.nom.toLowerCase()}%` }
      );
    }

    if (query.famille) {
      qb.andWhere('LOWER(p.famille) = :famille', { famille: query.famille.toLowerCase() });
    }

    if (query.toxicite) {
      qb.andWhere('p.toxicite = :toxicite', { toxicite: query.toxicite });
    }

    qb.orderBy('p.nomScientifique', 'ASC');
    qb.skip(skip);
    qb.take(limit);

    const [plants, total] = await qb.getManyAndCount();
    return {
      items: plants.map(p => this.mapToDto(p)),
      total,
    };
  }

  async findOne(id: string): Promise<PlantResponseDto> {
    const plant = await this.plantRepo.findOne({ where: { id } });
    if (!plant) {
      throw new NotFoundException('Plante non trouvée');
    }
    return this.mapToDto(plant);
  }

  async create(dto: CreatePlantDto): Promise<PlantResponseDto> {
    const plant = this.plantRepo.create({
      nomScientifique: dto.nomScientifique,
      nomCommun: dto.nomCommun || '',
      famille: dto.famille || null,
      toxicite: dto.toxicite,
      urlImage: dto.urlImage || null,
      badgeRarete: dto.badgeRarete || null,
      aPropos: dto.aPropos || null,
      conseilsEntretien: dto.conseilsEntretien || null,
    });
    const saved = await this.plantRepo.save(plant);
    return this.mapToDto(saved);
  }

  async update(id: string, dto: UpdatePlantDto): Promise<PlantResponseDto> {
    const plant = await this.plantRepo.findOne({ where: { id } });
    if (!plant) {
      throw new NotFoundException('Plante non trouvée');
    }

    if (dto.nomScientifique !== undefined) plant.nomScientifique = dto.nomScientifique;
    if (dto.nomCommun !== undefined) plant.nomCommun = dto.nomCommun;
    if (dto.famille !== undefined) plant.famille = dto.famille;
    if (dto.toxicite !== undefined) plant.toxicite = dto.toxicite;
    if (dto.urlImage !== undefined) plant.urlImage = dto.urlImage;
    if (dto.badgeRarete !== undefined) plant.badgeRarete = dto.badgeRarete;
    if (dto.aPropos !== undefined) plant.aPropos = dto.aPropos;
    if (dto.conseilsEntretien !== undefined) plant.conseilsEntretien = dto.conseilsEntretien;

    const saved = await this.plantRepo.save(plant);
    return this.mapToDto(saved);
  }

  async delete(id: string): Promise<void> {
    const plant = await this.plantRepo.findOne({ where: { id } });
    if (!plant) {
      throw new NotFoundException('Plante non trouvée');
    }

    // Vérifier les collections liées
    const count = await this.collectionRepo.count({ where: { plantId: id } });
    if (count > 0) {
      throw new BadRequestException(
        "Impossible de supprimer cette plante car elle est présente dans la collection de certains utilisateurs."
      );
    }

    await this.plantRepo.remove(plant);
  }
}