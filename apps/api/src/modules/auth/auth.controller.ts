import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterRequestDto,
  LoginRequestDto,
  GoogleLoginRequestDto,
} from '../../dto';
import { LocalAuthGuard } from '../../common/guards';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterRequestDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any, @Body() dto: LoginRequestDto) {
    // Le LocalAuthGuard a déjà validé l'utilisateur, il est dans req.user
    return this.authService.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() dto: GoogleLoginRequestDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { email: string; token: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.token,
      body.newPassword,
    );
  }
}
