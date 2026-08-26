import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Query,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateUserDto,
  AddBadgeDto,
  DeleteAccountDto,
  UserProfileResponseDto,
  SetUsernameDto,
} from '../../dto';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  private mapToProfileDto(user: any): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName || '',
      username: user.username || '',
      experience: user.experience,
      niveau: user.niveau,
      insignes: user.insignes || [],
      pieces: user.pieces,
      urlAvatar: user.urlAvatar || null,
      publicStories: user.publicStories,
      pendingEmail: user.pendingEmail || null,
    };
  }

  @Get('check-username')
  async checkUsername(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.userService.checkUsernameAvailability(query);
  }

  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    return this.userService.getPublicProfile(id);
  }

  @Get('suggestions/:fullName')
  async getSuggestions(@Param('fullName') fullName: string) {
    if (!fullName) {
      throw new BadRequestException('Param parameter "fullName" is required');
    }
    const suggestions = await this.userService.suggestUsernames(fullName);
    return { suggestions };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @CurrentUser() currentUser: any,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() currentUser: any,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.updateProfile(currentUser.id, dto);
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/confirm-email')
  async confirmEmail(@CurrentUser() currentUser: any, @Body('token') token: string) {
    const user = await this.userService.confirmEmail(currentUser.id, token);
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/username')
  async setUsername(
    @CurrentUser() currentUser: any,
    @Body() dto: SetUsernameDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.setUsername(currentUser.id, dto.username);
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @CurrentUser() currentUser: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfileResponseDto> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Voir collection.service.ts#addPhoto pour le détail : 3 x '..' pour atteindre
    // apps/api/uploads/ (là où main.ts sert les statiques), pas 2.
    const uploadDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'avatars',
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const extension = path.extname(file.originalname) || '.jpg';
    const filename = `${uuidv4()}${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);
    const urlAvatar = `/uploads/avatars/${filename}`;

    const user = await this.userService.updateAvatar(currentUser.id, urlAvatar);
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/badges')
  async addBadge(
    @CurrentUser() currentUser: any,
    @Body() dto: AddBadgeDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.addBadge(currentUser.id, dto.badge);
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(
    @CurrentUser() currentUser: any,
    @Body() dto: DeleteAccountDto,
  ) {
    const user = await this.userService.findById(currentUser.id);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const isPasswordValid = await argon2.verify(
      user.motDePasseHache,
      dto.motDePasse,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    await this.userService.softDelete(currentUser.id);
    return { success: true, message: 'Compte supprimé avec succès' };
  }
}
