import type { ConseilsEntretien, PlantWithIcon } from '@/api/types';

function conseils(c: ConseilsEntretien): string {
  return JSON.stringify(c);
}

export const mockPlants: Record<string, PlantWithIcon> = {
  monstera: {
    id: 'plant-monstera',
    nomScientifique: 'Monstera deliciosa',
    nomCommun: 'Monstera Deliciosa',
    famille: 'Araceae',
    toxicite: 'toxique',
    rarete: 'commun',
    icon: 'local_florist',
    aPropos:
      'Grande plante grimpante aux feuilles perforées, très appréciée en intérieur. Sève irritante pour les animaux et les jeunes enfants.',
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Lumière indirecte',
      soil: 'Terreau riche, drainé',
      arrosage: 'Modéré',
      multiplication: 'Bouturage de tige',
    }),
  },
  lavande: {
    id: 'plant-lavande',
    nomScientifique: 'Lavandula angustifolia',
    nomCommun: 'Lavande vraie',
    famille: 'Lamiaceae',
    toxicite: 'non_toxique',
    rarete: 'commun',
    icon: 'spa',
    aPropos:
      "Arbrisseau aromatique aux fleurs mauves, utilisé en parfumerie. Sensible à l'excès d'humidité, qui favorise la septoriose.",
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Plein soleil',
      soil: 'Sec, calcaire, bien drainé',
      arrosage: 'Faible',
      multiplication: 'Bouturage, semis',
    }),
  },
  calathea: {
    id: 'plant-calathea',
    nomScientifique: 'Calathea orbifolia',
    nomCommun: 'Calathea Orbifolia',
    famille: 'Marantaceae',
    toxicite: 'non_toxique',
    rarete: 'commun',
    icon: 'eco',
    aPropos:
      "Feuillage rayé décoratif qui se replie la nuit. Exige une hygrométrie élevée : le jaunissement signale un air trop sec.",
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Mi-ombre',
      soil: 'Humide, riche en humus',
      arrosage: 'Abondant',
      multiplication: 'Division de touffe',
    }),
  },
  orchideeSauvage: {
    id: 'plant-orchidee-sauvage',
    nomScientifique: 'Orchis mascula',
    nomCommun: 'Orchidée sauvage',
    famille: 'Orchidaceae',
    toxicite: 'non_toxique',
    rarete: 'rare',
    icon: 'spa',
    aPropos:
      "Orchidée terrestre que l'on rencontre dans les sous-bois clairs et les prairies calcaires. Espèce protégée dans plusieurs régions : à observer et photographier, jamais à cueillir.",
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Mi-ombre',
      soil: 'Calcaire, drainé',
      arrosage: 'Faible',
      multiplication: 'Semis (espèce protégée, ne pas prélever)',
    }),
  },
  monsteraSauvage: {
    id: 'plant-monstera-sauvage',
    nomScientifique: 'Monstera deliciosa (forme sauvage)',
    nomCommun: 'Monstera sauvage',
    famille: 'Araceae',
    toxicite: 'toxique',
    rarete: 'epique',
    icon: 'local_florist',
    aPropos:
      "Spécimen adulte grimpant retrouvé en pleine nature, aux feuilles largement fenêtrées. Très rare à cette taille en dehors de son habitat d'origine.",
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Ombre dense',
      soil: 'Humifère, drainé',
      arrosage: 'Abondant',
      multiplication: 'Bouturage de tige',
    }),
  },
  fougereRoyale: {
    id: 'plant-fougere-royale',
    nomScientifique: 'Osmunda regalis',
    nomCommun: 'Fougère royale',
    famille: 'Osmundaceae',
    toxicite: 'non_toxique',
    rarete: 'rare',
    icon: 'grass',
    aPropos:
      "L'une des plus grandes fougères d'Europe, reconnaissable à ses frondes dressées en couronne. Affectionne les sols gorgés d'eau.",
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Mi-ombre à ombre',
      soil: 'Humide, tourbeux',
      arrosage: 'Abondant',
      multiplication: 'Division de rhizome',
    }),
  },
  pissenlit: {
    id: 'plant-pissenlit',
    nomScientifique: 'Taraxacum officinale',
    nomCommun: 'Pissenlit',
    famille: 'Asteraceae',
    toxicite: 'non_toxique',
    rarete: 'commun',
    icon: 'eco',
    aPropos: 'Plante commune et comestible, des racines aux fleurs. Ses graines en aigrette se dispersent au vent.',
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Plein soleil',
      soil: 'Tous types de sols',
      arrosage: 'Faible',
      multiplication: 'Semis spontané',
    }),
  },
  coquelicot: {
    id: 'plant-coquelicot',
    nomScientifique: 'Papaver rhoeas',
    nomCommun: 'Coquelicot',
    famille: 'Papaveraceae',
    toxicite: 'incertaine',
    rarete: 'commun',
    icon: 'filter_vintage',
    aPropos: 'Fleur rouge emblématique des champs de blé. Contient des alcaloïdes légèrement toxiques en cas d’ingestion.',
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Plein soleil',
      soil: 'Calcaire, drainé',
      arrosage: 'Faible',
      multiplication: 'Semis',
    }),
  },
  digitale: {
    id: 'plant-digitale',
    nomScientifique: 'Digitalis purpurea',
    nomCommun: 'Digitale pourpre',
    famille: 'Plantaginaceae',
    toxicite: 'toxique',
    rarete: 'epique',
    icon: 'psychiatry',
    aPropos:
      'Magnifique mais hautement toxique : contient des glycosides cardiotoniques. Ne jamais toucher puis porter les mains au visage.',
    urlImage: '',
    conseilsEntretien: conseils({
      light: 'Mi-ombre',
      soil: 'Acide, drainé',
      arrosage: 'Modéré',
      multiplication: 'Semis (bisannuelle)',
    }),
  },
};
