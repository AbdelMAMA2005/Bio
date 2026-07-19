import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateUserDto } from '../../dto';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}


  async create(email: string, username: string, password: string): Promise<User> {
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
        where: { nomUtilisateur: dto.nomUtilisateur, dateSuppression: IsNull() },
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

  async softDelete(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé`);
    }
  }

  async restore(id: string): Promise<void> {
    const result = await this.userRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Utilisateur ${id} non trouvé ou pas supprimé`);
    }
  }

  async findByIdWithDeleted(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
  }
}