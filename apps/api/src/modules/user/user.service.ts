import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { Post } from '../../entities/posts.entity';
import { UpdateUserDto } from '../../dto';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async create(
    email: string,
    username: string,
    fullName: string,
    password: string,
  ): Promise<User> {
    const motDePasseHache = await argon2.hash(password);
    const utilisateur = this.userRepository.create({
      email,
      username,
      fullName,
      motDePasseHache,
    });
    return this.userRepository.save(utilisateur);
  }

  async checkUsernameAvailability(
    query: string,
  ): Promise<{ available: boolean; suggestions: string[] }> {
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9._@]/g, '');
    const formattedQuery = cleanQuery.startsWith('@') ? cleanQuery : `@${cleanQuery}`;
    const user = await this.userRepository.findOne({
      where: { username: formattedQuery },
    });
    
    if (!user) {
      return { available: true, suggestions: [] };
    }

    // If taken, suggest some alternatives based on the base name
    const baseName = formattedQuery.substring(1);
    const suggestions = await this.suggestUsernames(baseName);
    return { available: false, suggestions };
  }

  async suggestUsernames(fullName: string): Promise<string[]> {
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestions: string[] = [];
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts && suggestions.length < 3; i++) {
      const rand = Math.floor(Math.random() * 1000);
      const attempt = `@${slug}${rand}`;
      const exists = await this.userRepository.findOne({ where: { username: attempt } });
      if (!exists) {
        suggestions.push(attempt);
      }
    }
    return suggestions;
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
      const token = randomBytes(32).toString('hex');
      user.pendingEmail = dto.email;
      user.pendingEmailToken = await argon2.hash(token);
      user.pendingEmailExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.userRepository.save(user);
      await this.sendEmailConfirmation(dto.email, token);
    }

    if (dto.fullName && dto.fullName !== user.fullName) {
      user.fullName = dto.fullName;
    }

    if (dto.urlAvatar !== undefined) {
      user.urlAvatar = dto.urlAvatar;
    }

    if (dto.publicStories !== undefined) {
      user.publicStories = dto.publicStories;
    }

    return this.userRepository.save(user);
  }

  async confirmEmail(userId: string, token: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user || !user.pendingEmail || !user.pendingEmailToken || !user.pendingEmailExpires) {
      throw new ConflictException('Aucune modification d email en attente');
    }
    if (user.pendingEmailExpires < new Date() || !(await argon2.verify(user.pendingEmailToken, token))) {
      throw new ConflictException('Lien de confirmation invalide ou expiré');
    }
    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.pendingEmailToken = null;
    user.pendingEmailExpires = null;
    return this.userRepository.save(user);
  }

  private async sendEmailConfirmation(email: string, token: string): Promise<void> {
    const link = `${this.configService.get('FRONTEND_URL')}/confirm-email?token=${encodeURIComponent(token)}`;
    const apiKey = this.configService.get('RESEND_API_KEY');
    if (!apiKey) { console.log(`[DEV] Email confirmation link for ${email}: ${link}`); return; }
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: this.configService.get('RESEND_FROM_EMAIL') || 'noreply@bioapp.com',
      to: email,
      subject: 'Confirmez votre nouvelle adresse email',
      html: `<p>Confirmez votre nouvelle adresse email en cliquant ici :</p><a href="${link}">Confirmer mon email</a><p>Ce lien expire dans 24 heures.</p>`,
    });
  }

  async setUsername(id: string, rawUsername: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (user.username && user.username.toLowerCase() !== user.email.toLowerCase()) {
      throw new ConflictException('Le username ne peut plus être modifié.');
    }

    const username = rawUsername.trim().toLowerCase().replace(/^@?/, '@');
    if (!/^@[a-z0-9._]{2,29}$/.test(username)) {
      throw new ConflictException('Username invalide.');
    }
    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) throw new ConflictException('Ce nom d\'utilisateur est déjà pris.');

    user.username = username;
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

  async getPublicProfile(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, dateSuppression: IsNull() },
      relations: {
        collectionsUtilisateur: { plante: true },
        publicationsUtilisateur: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    return {
      id: user.id,
      fullName: user.fullName || '',
      username: user.username || '',
      urlAvatar: user.urlAvatar || null,
      garden: user.collectionsUtilisateur.map((collection: Collection) => ({
        id: collection.id,
        nomCommun: collection.plante.nomCommun,
        nomScientifique: collection.plante.nomScientifique,
        urlImage: collection.plante.urlImage,
        badgeRarete: collection.plante.badgeRarete,
        type: collection.typeCollection,
      })),
      posts: user.publicationsUtilisateur.map((post: Post) => ({
        id: post.id,
        contenuTexte: post.contenuTexte,
        imageUrl: post.urlImage,
        dateCreation: post.dateCreation,
      })),
    };
  }
}
