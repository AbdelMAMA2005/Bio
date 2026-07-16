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
    conseilsEntretien: conseils({
      light: 'Lumière indirecte',
      soil: 'Terreau riche, drainé',
      temperature: '18 – 27 °C',
      habitat: "Forêt tropicale d'Amérique centrale",
      about:
        'Grande plante grimpante aux feuilles perforées, très appréciée en intérieur. Sève irritante pour les animaux et les jeunes enfants.',
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
    conseilsEntretien: conseils({
      light: 'Plein soleil',
      soil: 'Sec, calcaire, bien drainé',
      temperature: '15 – 30 °C',
      habitat: 'Garrigues et coteaux méditerranéens',
      about:
        "Arbrisseau aromatique aux fleurs mauves, utilisé en parfumerie. Sensible à l'excès d'humidité, qui favorise la septoriose.",
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
    conseilsEntretien: conseils({
      light: 'Mi-ombre',
      soil: 'Humide, riche en humus',
      temperature: '18 – 24 °C',
      habitat: 'Sous-bois humides du Brésil',
      about:
        "Feuillage rayé décoratif qui se replie la nuit. Exige une hygrométrie élevée : le jaunissement signale un air trop sec.",
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
    conseilsEntretien: conseils({
      light: 'Mi-ombre',
      soil: 'Calcaire, drainé',
      temperature: 'Floraison : mai – juillet',
      habitat: 'Sous-bois clairs',
      about:
        "Orchidée terrestre que l'on rencontre dans les sous-bois clairs et les prairies calcaires. Espèce protégée dans plusieurs régions : à observer et photographier, jamais à cueillir.",
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
    conseilsEntretien: conseils({
      light: 'Ombre dense',
      soil: 'Humifère, drainé',
      temperature: '20 – 30 °C',
      habitat: 'Canopée des forêts tropicales',
      about:
        "Spécimen adulte grimpant retrouvé en pleine nature, aux feuilles largement fenêtrées. Très rare à cette taille en dehors de son habitat d'origine.",
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
    conseilsEntretien: conseils({
      light: 'Mi-ombre à ombre',
      soil: 'Humide, tourbeux',
      temperature: '10 – 22 °C',
      habitat: 'Zones humides et berges',
      about:
        "L'une des plus grandes fougères d'Europe, reconnaissable à ses frondes dressées en couronne. Affectionne les sols gorgés d'eau.",
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
    conseilsEntretien: conseils({
      light: 'Plein soleil',
      soil: 'Tous types de sols',
      temperature: '5 – 28 °C',
      habitat: 'Prairies, bords de chemins',
      about:
        'Plante commune et comestible, des racines aux fleurs. Ses graines en aigrette se dispersent au vent.',
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
    conseilsEntretien: conseils({
      light: 'Plein soleil',
      soil: 'Calcaire, drainé',
      temperature: 'Floraison : mai – août',
      habitat: 'Champs cultivés, friches',
      about:
        'Fleur rouge emblématique des champs de blé. Contient des alcaloïdes légèrement toxiques en cas d’ingestion.',
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
    conseilsEntretien: conseils({
      light: 'Mi-ombre',
      soil: 'Acide, drainé',
      temperature: 'Floraison : juin – août',
      habitat: 'Lisières de forêts, clairières',
      about:
        'Magnifique mais hautement toxique : contient des glycosides cardiotoniques. Ne jamais toucher puis porter les mains au visage.',
    }),
  },
};
