import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterRequestDto,
  LoginRequestDto,
  GoogleLoginRequestDto,
  RefreshTokenRequestDto,
} from '../../dto';
import { LocalAuthGuard } from '../../common/guards';

// Limite dédiée sur les 3 routes d'auth (bruteforce login/register/google) : bien plus
// stricte que la limite globale (100 req/min/IP, voir app.module.ts).
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterRequestDto) {
    return this.authService.register(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginRequestDto) {
    // Le LocalAuthGuard a déjà validé le mot de passe (req.user, non réutilisé ici) —
    // authService.login() revérifie via dto par simplicité, coût négligeable.
    return this.authService.login(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() dto: GoogleLoginRequestDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenRequestDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenRequestDto): Promise<void> {
    await this.authService.revokeRefreshToken(dto.refreshToken);
  }
}
