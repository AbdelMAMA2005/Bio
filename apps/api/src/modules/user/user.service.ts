import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { PlantType } from '../../entities/enums/plant-type.enum';
import { PublicProfileResponseDto, UpdateUserDto } from '../../dto';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async create(
    email: string,
    username: string,
    password: string,
  ): Promise<User> {
    const motDePasseHache = await argon2.hash(password);
    const utilisateur = this.userRepository.create({
      email,
      nomUtilisateur: username,
      motDePasseHache,
    });
    return this.userRepository.save(utilisateur);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
        dateSuppression: IsNull(),
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, dateSuppression: IsNull() },
    });
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email, dateSuppression: IsNull() },
      });
      if (existing) {
        throw new ConflictException('Email déjà utilisé');
      }
      user.email = dto.email;
    }

    if (dto.nomUtilisateur && dto.nomUtilisateur !== user.nomUtilisateur) {
      const existing = await this.userRepository.findOne({
        where: {
          nomUtilisateur: dto.nomUtilisateur,
          dateSuppression: IsNull(),
        },
      });
      if (existing) {
        throw new ConflictException("Nom d'utilisateur déjà utilisé");
      }
      user.nomUtilisateur = dto.nomUtilisateur;
    }

    if (dto.urlAvatar !== undefined) {
      user.urlAvatar = dto.urlAvatar;
    }

    return this.userRepository.save(user);
  }

  async updateAvatar(id: string, urlAvatar: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    user.urlAvatar = urlAvatar;
    return this.userRepository.save(user);
  }

  async addBadge(id: string, badge: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (!user.insignes) {
      user.insignes = [];
    }
    if (!user.insignes.includes(badge)) {
      user.insignes = [...user.insignes, badge];
    }
    return this.userRepository.save(user);
  }

  /**
   * Purge RGPD : anonymise les données personnelles (email, pseudo, avatar, hash de mot
   * de passe) avant le soft delete — un `dateSuppression` seul aurait laissé l'email et
   * le pseudo en clair, interrogeables via `findByIdWithDeleted`/restore (tous deux morts
   * côté API, aucun contrôleur ne les expose) et bloquant indéfiniment leur réutilisation.
   * La ligne est conservée (pas de hard delete) pour l'intégrité référentielle des
   * publications/commentaires/messages déjà liés à cet id.
   */
  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé`);
    }

    // Suffixe dérivé de l'id (déjà unique) : email et pseudo restent tous deux soumis à
    // une contrainte UNIQUE en base (colonnes non filtrées par `deletedAt`), une valeur
    // statique commune casserait la suppression d'un 2e compte.
    const anonymousSuffix = user.id.slice(0, 8);
    await this.userRepository.update(id, {
      email: `deleted-${anonymousSuffix}@planai.invalid`,
      nomUtilisateur: `Utilisateur supprimé ${anonymousSuffix}`,
      urlAvatar: null,
      motDePasseHache: await argon2.hash(uuidv4()),
    });

    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé`);
    }

    // Purge RGPD complète : un compte supprimé ne doit garder aucune session utilisable
    // (sinon un refresh token émis avant la suppression continuerait à fonctionner).
    await this.refreshTokenRepository.update(
      { userId: id, dateRevocation: IsNull() },
      { dateRevocation: new Date() },
    );
  }

  async restore(id: string): Promise<void> {
    const result = await this.userRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Utilisateur ${id} non trouvé ou pas supprimé`,
      );
    }
  }

  async findByIdWithDeleted(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  /**
   * Profil public d'un utilisateur (tap sur son avatar depuis le feed/commentaires/stories) :
   * mêmes stats que celles affichées sur son propre compte (voir useAccountStats.ts côté
   * front), recalculées ici pour tout utilisateur — pas seulement l'appelant.
   */
  async getPublicProfile(id: string): Promise<PublicProfileResponseDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const [captures, especes, rares] = await Promise.all([
      this.collectionRepository.count({
        where: { userId: id, typeCollection: PlantType.OWNED },
      }),
      this.collectionRepository.count({
        where: { userId: id, typeCollection: PlantType.DISCOVERED },
      }),
      this.collectionRepository
        .createQueryBuilder('c')
        .innerJoin('c.plante', 'pl')
        .where('c.userId = :id', { id })
        .andWhere('c.typeCollection = :type', { type: PlantType.DISCOVERED })
        .andWhere('pl.badgeRarete IN (:...raretes)', {
          raretes: ['Rare', 'Épique'],
        })
        .getCount(),
    ]);

    return {
      id: user.id,
      nomUtilisateur: user.nomUtilisateur,
      urlAvatar: user.urlAvatar || null,
      niveau: user.niveau,
      experience: user.experience,
      insignes: user.insignes || [],
      stats: { captures, especes, rares },
    };
  }
}
