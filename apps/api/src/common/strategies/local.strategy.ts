import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../../modules/auth/auth.service';
import * as argon2 from 'argon2';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
        usernameField: 'email',
        passwordField: 'motDePasse'
    });
  }
  async validate(email: string, password: string): Promise<any> {
  const user = await this.authService['userRepo'].findOne({ where: { email } });
  if (!user) {
    throw new UnauthorizedException('Identifiants invalides.');
  }
  const isPasswordValid = await argon2.verify(user.motDePasseHache, password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Identifiants invalides.');
  }
  return user;
}
}