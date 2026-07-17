import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../entities/user.entity';
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