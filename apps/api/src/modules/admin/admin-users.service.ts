import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { UserService } from '../user/user.service';
import type { AdminUser, AdminUsersPage } from '@planai/shared';
import type { AdminUsersQueryDto } from '../../dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const INACTIVE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours sans connexion

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    private readonly userService: UserService,
  ) {}

  private statutOf(user: User): 'actif' | 'inactif' | 'suspendu' {
    if (user.estSuspendu) return 'suspendu';
    const seuil = new Date(Date.now() - INACTIVE_AFTER_MS);
    if (!user.derniereConnexion || user.derniereConnexion < seuil)
      return 'inactif';
    return 'actif';
  }

  async list(query: AdminUsersQueryDto): Promise<AdminUsersPage> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.dateSuppression IS NULL');

    if (query.q) {
      qb.andWhere(
        '(LOWER(u.nomUtilisateur) LIKE :q OR LOWER(u.email) LIKE :q)',
        {
          q: `%${query.q.toLowerCase()}%`,
        },
      );
    }
    if (query.filtre === 'admins') {
      qb.andWhere("u.role IN ('admin', 'moderateur')");
    } else if (query.filtre === 'suspendus') {
      qb.andWhere('u.estSuspendu = true');
    } else if (query.filtre === 'inactifs') {
      const seuil = new Date(Date.now() - INACTIVE_AFTER_MS);
      qb.andWhere('u.estSuspendu = false').andWhere(
        '(u.derniereConnexion IS NULL OR u.derniereConnexion < :seuil)',
        { seuil },
      );
    }

    qb.orderBy('u.nomUtilisateur', 'ASC');
    const total = await qb.getCount();
    const users = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const capturesByUser = await this.capturesCounts(users.map((u) => u.id));

    return {
      items: users.map((u) =>
        this.toAdminUser(u, capturesByUser.get(u.id) ?? 0),
      ),
      total,
    };
  }

  private async capturesCounts(
    userIds: string[],
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.collectionRepo
      .createQueryBuilder('c')
      .select('c.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('c.userId IN (:...userIds)', { userIds })
      .groupBy('c.userId')
      .getRawMany<{ userId: string; count: string }>();
    return new Map(rows.map((r) => [r.userId, parseInt(r.count, 10)]));
  }

  private toAdminUser(u: User, capturesCount: number): AdminUser {
    return {
      id: u.id,
      nomUtilisateur: u.nomUtilisateur,
      email: u.email,
      urlAvatar: u.urlAvatar,
      role: u.role,
      niveau: u.niveau,
      experience: u.experience,
      capturesCount,
      statut: this.statutOf(u),
    };
  }

  private async findActiveOrThrow(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, dateSuppression: IsNull() },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé.');
    return user;
  }

  async updateRole(
    id: string,
    role: 'membre' | 'moderateur' | 'admin',
  ): Promise<AdminUser> {
    const user = await this.findActiveOrThrow(id);
    user.role = role;
    user.estAdmin = role === 'admin'; // synchro avec l'AdminGuard existant (plants.controller)
    await this.userRepo.save(user);
    const captures = (await this.capturesCounts([id])).get(id) ?? 0;
    return this.toAdminUser(user, captures);
  }

  async updateStatus(
    id: string,
    suspendu: boolean,
    actingAdmin: AuthenticatedUser,
  ): Promise<AdminUser> {
    if (id === actingAdmin.id && suspendu) {
      throw new BadRequestException(
        'Impossible de suspendre son propre compte.',
      );
    }
    const user = await this.findActiveOrThrow(id);
    user.estSuspendu = suspendu;
    await this.userRepo.save(user);
    const captures = (await this.capturesCounts([id])).get(id) ?? 0;
    return this.toAdminUser(user, captures);
  }

  /**
   * Suppression RGPD — réutilise UserService#softDelete (anonymisation email/pseudo/avatar
   * + révocation des refresh tokens), le même chemin que la suppression par l'utilisateur
   * lui-même, juste déclenchable ici par un admin sans mot de passe.
   */
  async delete(id: string, actingAdmin: AuthenticatedUser): Promise<void> {
    if (id === actingAdmin.id) {
      throw new BadRequestException(
        'Impossible de supprimer son propre compte depuis la console.',
      );
    }
    const user = await this.findActiveOrThrow(id);
    if (user.role === 'admin') {
      throw new ForbiddenException(
        'Impossible de supprimer un autre administrateur depuis la console.',
      );
    }
    await this.userService.softDelete(id);
  }
}
