import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ 
        usernameField: 'email', 
        passwordField: 'motDePasse'
    });
  }

  async validate(email: string, password: string): Promise<any> {
    // On ne fait que la validation, le login réel est dans AuthService
    const user = await this.authService['userRepo'].findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides.');
    }
    return user;
  }
}