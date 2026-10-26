export type Badge = {
  id: string;
  nom: string;
  description: string;
  obtenuLe: string | null;
};

/** Catalogue des badges : l'obtention et sa date viennent de la RPC get_my_badges. */
export const BADGE_CATALOG: Omit<Badge, 'obtenuLe'>[] = [
  {
    id: 'botaniste-debutant',
    nom: 'Botaniste débutant',
    description: 'Identifier ta première plante.',
  },
  {
    id: 'premiere-capture',
    nom: '1ère capture',
    description: 'Ajouter une plante à ton Jardin pour la première fois.',
  },
  {
    id: 'explorateur',
    nom: 'Explorateur',
    description: 'Découvrir 10 espèces différentes dans ton Herbarium.',
  },
  {
    id: 'chasseur-epiques',
    nom: "Chasseur d'épiques",
    description: 'Capturer 5 plantes de rareté épique.',
  },
  {
    id: 'pouce-vert',
    nom: 'Pouce vert',
    description: 'Maintenir 3 clones en bonne santé pendant 30 jours.',
  },
  {
    id: 'social',
    nom: 'Botaniste social',
    description: 'Publier 10 photos dans la Communauté.',
  },
];
