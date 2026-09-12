import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as argon2 from 'argon2';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RegisterResponseDto,
  LoginResponseDto,
  RefreshTokenResponseDto,
} from '../../dto';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /** Génère un refresh token opaque, stocke son hash, renvoie la valeur en clair (une seule fois). */
  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId,
        tokenHash: this.hashToken(rawToken),
        dateExpiration: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        dateRevocation: null,
      }),
    );
    return rawToken;
  }

  private async issueTokenPair(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      Promise.resolve(this.jwtService.sign(payload)),
      this.issueRefreshToken(user.id),
    ]);
    return { accessToken, refreshToken };
  }

  /**
   * Échange un refresh token valide contre un nouveau couple access/refresh (rotation :
   * l'ancien est révoqué immédiatement, jamais réutilisable — voir `dateRevocation`). Si le
   * token présenté est déjà révoqué (rejeu d'un token volé après rotation), on révoque
   * TOUTES les sessions actives de l'utilisateur par précaution, plutôt que de se contenter
   * de rejeter cette seule tentative.
   */
  async refresh(rawToken: string): Promise<RefreshTokenResponseDto> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException(
        'Session invalide, veuillez vous reconnecter.',
      );
    }

    if (stored.dateRevocation || stored.dateExpiration < new Date()) {
      // Token déjà utilisé/expiré présenté à nouveau : signe possible de vol — on coupe
      // toutes les sessions de cet utilisateur, pas seulement celle-ci.
      await this.refreshTokenRepo.update(
        { userId: stored.userId, dateRevocation: IsNull() },
        { dateRevocation: new Date() },
      );
      throw new UnauthorizedException(
        'Session expirée, veuillez vous reconnecter.',
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: stored.userId, dateSuppression: IsNull() },
    });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    stored.dateRevocation = new Date();
    await this.refreshTokenRepo.save(stored);

    return this.issueTokenPair(user);
  }

  /** Révoque un refresh token précis (déconnexion explicite, voir POST /auth/logout). */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.refreshTokenRepo.update(
      { tokenHash, dateRevocation: IsNull() },
      { dateRevocation: new Date() },
    );
  }

  /** Purge les tokens expirés depuis longtemps (hygiène de table, pas de logique métier). */
  async pruneExpiredRefreshTokens(): Promise<void> {
    await this.refreshTokenRepo.delete({
      dateExpiration: LessThan(new Date()),
    });
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
      throw new ConflictException("Ce nom d'utilisateur est déjà pris.");
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
    const isPasswordValid = await argon2.verify(
      user.motDePasseHache,
      dto.motDePasse,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(user);
    // Hygiène de table best-effort (pas bloquant pour la connexion si ça échoue) : purge
    // les refresh tokens expirés depuis longtemps plutôt que de les laisser s'accumuler.
    this.pruneExpiredRefreshTokens().catch(() => undefined);

    return {
      accessToken,
      refreshToken,
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
      throw new UnauthorizedException(
        'Connexion Google non configurée côté serveur.',
      );
    }

    let payload: {
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
    };
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience,
      });
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
      const nomUtilisateur = await this.uniqueUsernameFrom(
        payload.given_name || payload.name || payload.email,
      );
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

    const { accessToken, refreshToken } = await this.issueTokenPair(user);

    return {
      accessToken,
      refreshToken,
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
    while (
      await this.userRepo.findOne({ where: { nomUtilisateur: candidate } })
    ) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    return candidate;
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, dateSuppression: IsNull() } });
  }
}
