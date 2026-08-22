// apps/api/src/seeds/plant.seed.ts
import { DataSource } from 'typeorm';
import { Plant } from '../entities/plant.entity';
import { ToxicityLevel } from '../entities/enums/toxicity-level.enum';

const plantesExemples = [
  {
    nomScientifique: 'Monstera deliciosa',
    nomCommun: 'Monstera',
    famille: 'Araceae',
    toxicite: ToxicityLevel.ORANGE,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Arroser lorsque le terreau est sec en surface (1x/semaine)',
      lumiere: 'Lumière indirecte vive',
      temperature: '18-25°C',
      rempotage: 'Tous les 2 ans au printemps',
    },
    urlImage:
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200',
  },
  {
    nomScientifique: 'Ficus elastica',
    nomCommun: 'Caoutchouc',
    famille: 'Moraceae',
    toxicite: ToxicityLevel.ORANGE,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Laisser sécher le terreau entre 2 arrosages',
      lumiere: 'Lumière vive indirecte',
      temperature: '18-24°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=200',
  },
  {
    nomScientifique: 'Spathiphyllum wallisii',
    nomCommun: 'Fleur de lune',
    famille: 'Araceae',
    toxicite: ToxicityLevel.RED,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Maintenir le terreau humide, vaporiser le feuillage',
      lumiere: 'Mi-ombre à lumière indirecte',
      temperature: '18-25°C',
      rempotage: 'Tous les ans au printemps',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593697821252-0c9137d9fc45?w=200',
  },
  {
    nomScientifique: 'Sansevieria trifasciata',
    nomCommun: 'Langue de belle-mère',
    famille: 'Asparagaceae',
    toxicite: ToxicityLevel.ORANGE,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Arroser très peu (1x/mois en hiver)',
      lumiere: 'Tolère tout type de lumière',
      temperature: '15-24°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Zamioculcas zamiifolia',
    nomCommun: 'ZZ Plant',
    famille: 'Araceae',
    toxicite: ToxicityLevel.ORANGE,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Arroser lorsque le terreau est complètement sec',
      lumiere: 'Lumière faible à vive indirecte',
      temperature: '18-26°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Dracaena marginata',
    nomCommun: 'Dragonnier de Madagascar',
    famille: 'Asparagaceae',
    toxicite: ToxicityLevel.RED,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Laisser sécher le terreau en surface',
      lumiere: 'Lumière indirecte vive',
      temperature: '18-24°C',
      rempotage: 'Tous les 2 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Aloe vera',
    nomCommun: 'Aloès',
    famille: 'Asphodelaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Arroser abondamment puis laisser sécher complètement',
      lumiere: 'Plein soleil à mi-ombre',
      temperature: '18-24°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Calathea orbifolia',
    nomCommun: 'Calathéa',
    famille: 'Marantaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Rare',
    conseilsEntretien: {
      arrosage: 'Maintenir le terreau humide, eau non calcaire',
      lumiere: 'Lumière indirecte, pas de soleil direct',
      temperature: '18-23°C',
      rempotage: 'Tous les ans au printemps',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Cactus astrophytum',
    nomCommun: 'Cactus étoile',
    famille: 'Cactaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Épique',
    conseilsEntretien: {
      arrosage: 'Arroser très peu (1x/mois)',
      lumiere: 'Plein soleil',
      temperature: '15-30°C',
      rempotage: 'Tous les 3-4 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Nepenthes alata',
    nomCommun: 'Plante carnivore',
    famille: 'Nepenthaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Rare',
    conseilsEntretien: {
      arrosage: 'Eau déminéralisée en permanence',
      lumiere: 'Lumière indirecte vive',
      temperature: '18-25°C',
      rempotage: 'Tous les 2 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Pachira aquatica',
    nomCommun: 'Arbre à monnaie',
    famille: 'Malvaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: "Arroser modérément, ne pas laisser d'eau dans la soucoupe",
      lumiere: 'Lumière indirecte vive',
      temperature: '18-24°C',
      rempotage: 'Tous les 2 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Begonia rex',
    nomCommun: 'Bégonia Rex',
    famille: 'Begoniaceae',
    toxicite: ToxicityLevel.ORANGE,
    badgeRarete: 'Rare',
    conseilsEntretien: {
      arrosage: 'Terreau humide mais bien drainé',
      lumiere: 'Lumière indirecte vive',
      temperature: '18-22°C',
      rempotage: 'Tous les ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Epipremnum aureum',
    nomCommun: 'Pothos',
    famille: 'Araceae',
    toxicite: ToxicityLevel.RED,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Laisser sécher le terreau entre 2 arrosages',
      lumiere: 'Tolère tout sauf le soleil direct',
      temperature: '18-25°C',
      rempotage: 'Tous les 2 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Strelitzia reginae',
    nomCommun: 'Oiseau de paradis',
    famille: 'Strelitziaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Épique',
    conseilsEntretien: {
      arrosage: 'Terreau humide en été, sec en hiver',
      lumiere: 'Plein soleil',
      temperature: '18-25°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Chlorophytum comosum',
    nomCommun: 'Plante araignée',
    famille: 'Asparagaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Terreau légèrement humide',
      lumiere: 'Lumière indirecte vive',
      temperature: '15-24°C',
      rempotage: 'Tous les ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Ficus lyrata',
    nomCommun: 'Figuier lyre',
    famille: 'Moraceae',
    toxicite: ToxicityLevel.ORANGE,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Terreau humide mais pas détrempé',
      lumiere: 'Lumière vive indirecte',
      temperature: '18-25°C',
      rempotage: 'Tous les 2 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Dionaea muscipula',
    nomCommun: 'Attrape-mouche',
    famille: 'Droseraceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Rare',
    conseilsEntretien: {
      arrosage: 'Eau déminéralisée en permanence',
      lumiere: 'Plein soleil',
      temperature: '18-27°C',
      rempotage: 'Tous les 2 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Crassula ovata',
    nomCommun: 'Arbre de Jade',
    famille: 'Crassulaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Laisser sécher complètement entre 2 arrosages',
      lumiere: 'Plein soleil à mi-ombre',
      temperature: '18-24°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Anthurium andraeanum',
    nomCommun: 'Anthurium',
    famille: 'Araceae',
    toxicite: ToxicityLevel.RED,
    badgeRarete: 'Commun',
    conseilsEntretien: {
      arrosage: 'Terreau humide, vaporiser le feuillage',
      lumiere: 'Lumière indirecte vive',
      temperature: '20-25°C',
      rempotage: 'Tous les ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
  {
    nomScientifique: 'Hoya carnosa',
    nomCommun: 'Fleur de porcelaine',
    famille: 'Apocynaceae',
    toxicite: ToxicityLevel.GREEN,
    badgeRarete: 'Rare',
    conseilsEntretien: {
      arrosage: 'Laisser sécher le terreau entre 2 arrosages',
      lumiere: 'Lumière indirecte vive',
      temperature: '18-24°C',
      rempotage: 'Tous les 2-3 ans',
    },
    urlImage:
      'https://images.unsplash.com/photo-1593482892290-f54927ae5c9f?w=200',
  },
];

export async function seedPlants(dataSource: DataSource) {
  const plantRepo = dataSource.getRepository(Plant);

  const count = await plantRepo.count();
  if (count > 0) {
    console.log('✅ Les plantes sont déjà seedées.');
    return;
  }

  for (const plantData of plantesExemples) {
    const plant = plantRepo.create(plantData);
    await plantRepo.save(plant);
  }

  console.log(`✅ ${plantesExemples.length} plantes seedées avec succès.`);
}
