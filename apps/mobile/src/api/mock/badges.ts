export type Badge = {
  id: string;
  nom: string;
  description: string;
  obtenuLe: string | null;
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export const mockBadges: Badge[] = [
  {
    id: 'botaniste-debutant',
    nom: 'Botaniste débutant',
    description: 'Identifier ta première plante.',
    obtenuLe: daysAgoIso(120),
  },
  {
    id: 'premiere-capture',
    nom: '1ère capture',
    description: 'Ajouter une plante à ton Jardin pour la première fois.',
    obtenuLe: daysAgoIso(118),
  },
  {
    id: 'explorateur',
    nom: 'Explorateur',
    description: 'Découvrir 10 espèces différentes dans ton Herbarium.',
    obtenuLe: daysAgoIso(40),
  },
  {
    id: 'chasseur-epiques',
    nom: "Chasseur d'épiques",
    description: 'Capturer 5 plantes de rareté épique.',
    obtenuLe: null,
  },
  {
    id: 'pouce-vert',
    nom: 'Pouce vert',
    description: 'Maintenir 3 clones en bonne santé pendant 30 jours.',
    obtenuLe: null,
  },
  {
    id: 'social',
    nom: 'Botaniste social',
    description: 'Publier 10 photos dans la Communauté.',
    obtenuLe: null,
  },
];
