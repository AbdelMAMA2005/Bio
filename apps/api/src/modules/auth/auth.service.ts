import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { User } from '../../entities/user.entity';
import { RegisterRequestDto, LoginRequestDto, RegisterResponseDto, LoginResponseDto } from '../../dto';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    // Vérifier si l'email existe déjà (y compris chez les utilisateurs non supprimés)
    const existingEmail = await this.userRepo.findOne({
      where: { email: dto.email, dateSuppression: IsNull() },
    });
    if (existingEmail) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const existingUsername = await this.userRepo.findOne({
      where: { nomUtilisateur: dto.nomUtilisateur, dateSuppression: IsNull() },
    });
    if (existingUsername) {
      throw new ConflictException('Ce nom d\'utilisateur est déjà pris.');
    }

    const motDePasseHache = await argon2.hash(dto.motDePasse);

    const user = this.userRepo.create({
      email: dto.email,
      nomUtilisateur: dto.nomUtilisateur,
      motDePasseHache,
      experience: 0,
      niveau: 1,
      insignes: [],
      pieces: 0,
    });

    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      email: saved.email,
      nomUtilisateur: saved.nomUtilisateur,
      experience: saved.experience,
      niveau: saved.niveau,
      insignes: saved.insignes,
      pieces: saved.pieces,
    };
  }

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, dateSuppression: IsNull() },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await argon2.verify(user.motDePasseHache, dto.motDePasse);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nomUtilisateur: user.nomUtilisateur,
        experience: user.experience,
        niveau: user.niveau,
        insignes: user.insignes,
        pieces: user.pieces,
      },
    };
  }

  async loginWithGoogle(idToken: string): Promise<LoginResponseDto> {
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!audience) {
      // Sans Client ID configuré, on ne peut pas vérifier l'audience du token — refuser
      // plutôt que de faire confiance à un token dont on ne peut pas garantir la provenance.
      throw new UnauthorizedException('Connexion Google non configurée côté serveur.');
    }

    let payload: { email?: string; email_verified?: boolean; name?: string; given_name?: string };
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new UnauthorizedException('Jeton Google invalide ou expiré.');
    }

    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Compte Google sans email vérifié.');
    }

    let user = await this.userRepo.findOne({
      where: { email: payload.email, dateSuppression: IsNull() },
    });

    if (!user) {
      const nomUtilisateur = await this.uniqueUsernameFrom(payload.given_name || payload.name || payload.email);
      // Compte créé via Google : pas de mot de passe utilisable — hash aléatoire, jamais
      // communiqué ni vérifiable (aucun flux de connexion par mot de passe pour ce compte
      // tant qu'il n'en définit pas un explicitement via un futur flux "changer le mot de
      // passe").
      const motDePasseHache = await argon2.hash(randomUUID());
      user = this.userRepo.create({
        email: payload.email,
        nomUtilisateur,
        motDePasseHache,
        experience: 0,
        niveau: 1,
        insignes: [],
        pieces: 0,
      });
      user = await this.userRepo.save(user);
    }

    const jwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nomUtilisateur: user.nomUtilisateur,
        experience: user.experience,
        niveau: user.niveau,
        insignes: user.insignes,
        pieces: user.pieces,
      },
    };
  }

  private async uniqueUsernameFrom(seed: string): Promise<string> {
    const base = seed.trim().replace(/\s+/g, '_').slice(0, 24) || 'utilisateur';
    let candidate = base;
    let suffix = 0;
    while (await this.userRepo.findOne({ where: { nomUtilisateur: candidate } })) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    return candidate;
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, dateSuppression: IsNull() } });
  }
}