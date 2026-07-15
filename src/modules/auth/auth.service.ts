import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User } from '../../entities/user.entity';
import { RegisterRequestDto, LoginRequestDto, RegisterResponseDto, LoginResponseDto } from '../../dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    // Vérifier si l'email existe déjà
    const existingEmail = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Cet email est déjà utilisé.');
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const existingUsername = await this.userRepo.findOne({
      where: { nomUtilisateur: dto.nomUtilisateur },
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
    });

    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      email: saved.email,
      nomUtilisateur: saved.nomUtilisateur,
      experience: saved.experience,
      niveau: saved.niveau,
      insignes: saved.insignes,
    };
  }

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
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
      },
    };
  }

  async validateUser(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }
}