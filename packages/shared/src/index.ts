export type Rarete = 'commun' | 'rare' | 'epique';

export type TypeCollection = 'owned' | 'discovered';

export type EtatSante = 'sain' | 'alerte' | 'malade';

export type Toxicite = 'toxique' | 'non_toxique' | 'incertaine';

export interface User {
  id: string;
  pseudo: string;
  email: string;
  niveau: number;
  xp: number;
}

export interface Plante {
  id: string;
  nomScientifique: string;
  nomCommun: string;
  famille: string;
  toxicite: Toxicite;
  rarete: Rarete;
  conseilsEntretien: string;
}

export interface CollectionPhoto {
  url: string;
  date: string;
}

export interface CollectionItem {
  idUtilisateur: string;
  idPlante: string;
  dateAjout: string;
  type: TypeCollection;
  latitude?: number;
  longitude?: number;
  etatSante?: EtatSante;
  historiquePhotos?: CollectionPhoto[];
}
