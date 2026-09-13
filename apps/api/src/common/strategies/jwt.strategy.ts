import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../modules/auth/auth.service';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../types/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set in configuration');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.authService.validateUser(payload.sub);
    // Suspension effective immédiatement, même sur un access token déjà émis avant la
    // suspension (pas besoin d'attendre son expiration naturelle) — voir modules/admin.
    if (!user || user.estSuspendu) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      nomUtilisateur: user.nomUtilisateur,
      estAdmin: user.estAdmin,
      role: user.role,
      estSuspendu: user.estSuspendu,
    };
  }
}
