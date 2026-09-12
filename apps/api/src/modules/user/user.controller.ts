import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { FeedService } from '../feed/feed.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { User } from '../../entities/user.entity';
import {
  UpdateUserDto,
  AddBadgeDto,
  DeleteAccountDto,
  FeedQueryDto,
  UserProfileResponseDto,
} from '../../dto';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly feedService: FeedService,
  ) {}

  private mapToProfileDto(user: User): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      nomUtilisateur: user.nomUtilisateur,
      experience: user.experience,
      niveau: user.niveau,
      insignes: user.insignes || [],
      pieces: user.pieces,
      urlAvatar: user.urlAvatar || null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @CurrentUser() currentUser: AuthenticatedUser,
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
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.updateProfile(currentUser.id, dto);
    return this.mapToProfileDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 Mo, même limite que les autres uploads
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
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
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AddBadgeDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.userService.addBadge(currentUser.id, dto.badge);
    return this.mapToProfileDto(user);
  }

  // ----- Profil public d'un utilisateur (tap sur son avatar) -----
  @UseGuards(JwtAuthGuard)
  @Get(':id/public-profile')
  async getPublicProfile(@Param('id') id: string) {
    return this.userService.getPublicProfile(id);
  }

  // ----- Grille des publications d'un utilisateur (profil public) -----
  @UseGuards(JwtAuthGuard)
  @Get(':id/posts')
  async getUserPosts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: FeedQueryDto,
  ) {
    return this.feedService.getPostsByUser(id, currentUser.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(
    @CurrentUser() currentUser: AuthenticatedUser,
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
