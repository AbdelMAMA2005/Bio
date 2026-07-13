import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  
  @ApiProperty({
    description: 'Email de l\'utilisateur pour se connecter',
    example: 'abdel@planai.com',
    required: true,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Nom d\'utilisateur unique sur la plateforme',
    example: 'Abdel_Pro',
    required: true,
  })
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    description: 'Mot de passe sécurisé',
    example: 'password123',
    required: true,
    minLength: 4,
  })
  @MinLength(4, { message: 'Le mot de passe doit faire au moins 4 caractères' })
  password!: string;
}