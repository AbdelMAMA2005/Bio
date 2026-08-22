import { ApiProperty } from '@nestjs/swagger';

export class IdentificationResponseDto {
  @ApiProperty({
    description: 'Identifiant unique de la plante identifiée',
    example: 'uuid-1234-5678-90ab',
  })
  plantId!: string;

  @ApiProperty({
    description: 'Nom commun de la plante',
    example: 'Monstera Deliciosa',
  })
  name!: string;

  @ApiProperty({
    description: 'Famille botanique de la plante',
    example: 'Araceae',
  })
  family!: string;

  @ApiProperty({
    description: 'Niveau de toxicité de la plante',
    enum: ['green', 'orange', 'red'],
    example: 'orange',
  })
  toxicity!: 'green' | 'orange' | 'red';

  @ApiProperty({
    description: "URL de l'image de la plante",
    example: 'https://images.example.com/monstera.jpg',
  })
  imageUrl!: string;
}
