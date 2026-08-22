import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as argon2 from 'argon2';
import { randomUUID, randomBytes } from 'crypto';
import { User } from '../../entities/user.entity';
import {
  RegisterRequestDto,
  LoginRequestDto,
  RegisterResponseDto,
  LoginResponseDto,
} from '../../dto';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    this.validatePassword(dto.motDePasse);

    // Vérifier si l'email existe déjà (y compris chez les utilisateurs non supprimés)
    const existingEmail = await this.userRepo.findOne({
      where: { email: dto.email, dateSuppression: IsNull() },
    });
    if (existingEmail) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    let finalUsername = dto.username;
    if (!finalUsername) {
      const slug = dto.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rand = Math.floor(Math.random() * 1000);
      finalUsername = `@${slug}${rand}`;
    } else if (!finalUsername.startsWith('@')) {
      finalUsername = `@${finalUsername}`;
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const existingUsername = await this.userRepo.findOne({
      where: { username: finalUsername, dateSuppression: IsNull() },
    });
    if (existingUsername) {
      throw new ConflictException('Ce nom d\'utilisateur est déjà pris.');
    }

    const motDePasseHache = await argon2.hash(dto.motDePasse);

    const user = this.userRepo.create({
      email: dto.email,
      username: finalUsername,
      fullName: dto.fullName,
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
      fullName: saved.fullName,
      username: saved.username,
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

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        experience: user.experience,
        niveau: user.niveau,
        insignes: user.insignes,
        pieces: user.pieces,
      },
      needsUsername: false,
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
      family_name?: string;
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
      // Compte créé via Google : pas de mot de passe utilisable — hash aléatoire, jamais
      // communiqué ni vérifiable (aucun flux de connexion par mot de passe pour ce compte
      // tant qu'il n'en définit pas un explicitement via un futur flux "changer le mot de
      // passe").
      const motDePasseHache = await argon2.hash(randomUUID());
      user = this.userRepo.create({
        email: payload.email,
        username: null,
        fullName: [payload.given_name, payload.family_name].filter(Boolean).join(' ') || payload.name || '',
        motDePasseHache,
        experience: 0,
        niveau: 1,
        insignes: [],
        pieces: 0,
      });
      user = await this.userRepo.save(user);
    } else if (!user.fullName) {
      user.fullName = [payload.given_name, payload.family_name].filter(Boolean).join(' ') || payload.name || '';
    }

    const jwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        experience: user.experience,
        niveau: user.niveau,
        insignes: user.insignes,
        pieces: user.pieces,
      },
      needsUsername: !user.username || user.username.toLowerCase() === user.email.toLowerCase(),
    };
  }

  private async uniqueUsernameFrom(seed: string): Promise<string> {
    const base = seed.trim().replace(/\s+/g, '_').slice(0, 24) || 'utilisateur';
    let candidate = base;
    let suffix = 0;
    while (await this.userRepo.findOne({ where: { username: candidate } })) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    return candidate;
  }

  async checkUsernameAvailability(
    query: string,
  ): Promise<{ available: boolean; suggestions: string[] }> {
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9._]/g, '');
    const user = await this.userRepo.findOne({
      where: { username: cleanQuery, dateSuppression: IsNull() },
    });

    return { available: !user, suggestions: [] };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { email, dateSuppression: IsNull() },
    });

    if (!user) {
      // Pour la sécurité, toujours renvoyer le même message (ne pas confirmer si l'email existe)
      return {
        message:
          'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.',
      };
    }

    // Générer un token haché de 32 bytes (64 caractères en hexadécimal)
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHashed = await argon2.hash(resetToken);

    // Expiration du token : 15 minutes
    const expiresIn = new Date();
    expiresIn.setMinutes(expiresIn.getMinutes() + 15);

    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpires = expiresIn;
    await this.userRepo.save(user);

    // Construire le lien de réinitialisation (supposant une URL publique du frontend)
    const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Envoyer l'email via Resend
    await this.sendResetPasswordEmail(user.email, resetLink);

    return {
      message:
        'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.',
    };
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    this.validatePassword(newPassword);

    const user = await this.userRepo.findOne({
      where: { email, dateSuppression: IsNull() },
    });

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré.',
      );
    }

    // Vérifier l'expiration
    if (new Date() > user.resetPasswordExpires) {
      user.resetPasswordToken = null as any;
      user.resetPasswordExpires = null as any;
      await this.userRepo.save(user);
      throw new BadRequestException('Token de réinitialisation expiré.');
    }

    // Vérifier le token
    const isTokenValid = await argon2.verify(user.resetPasswordToken, token);
    if (!isTokenValid) {
      throw new BadRequestException('Token de réinitialisation invalide.');
    }

    // Mettre à jour le mot de passe
    const motDePasseHache = await argon2.hash(newPassword);
    user.motDePasseHache = motDePasseHache;
    user.resetPasswordToken = null as any;
    user.resetPasswordExpires = null as any;

    await this.userRepo.save(user);

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  private validatePassword(password: string): void {
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères, 1 lettre et 1 chiffre.',
      );
    }
  }

  private async sendResetPasswordEmail(
    email: string,
    resetLink: string,
  ): Promise<void> {
    // Utiliser Resend si configuré, sinon logger le lien (développement)
    const resendApiKey = this.configService.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log(`[DEV] Reset link for ${email}: ${resetLink}`);
      return;
    }

    try {
      // Importer dynamiquement pour éviter les dépendances optionnelles
      const { Resend } = await import('resend');
      const resend = new Resend(resendApiKey);

      const { data, error } = await resend.emails.send({
        from:
          this.configService.get('RESEND_FROM_EMAIL') || 'noreply@bioapp.com',
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <h1>Réinitialisation de mot de passe</h1>
          <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Réinitialiser mon mot de passe
          </a>
          <p>Ce lien expire dans 15 minutes.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
        `,
      });
      if (error) {
        throw new Error(`Resend: ${error.message}`);
      }
      console.log(`Email de réinitialisation envoyé via Resend: ${data?.id ?? 'ok'}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email Resend:", error instanceof Error ? error.message : error);
      throw new ServiceUnavailableException(
        "L'envoi de l'email est temporairement indisponible. Réessayez plus tard.",
      );
    }
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, dateSuppression: IsNull() } });
  }
}
