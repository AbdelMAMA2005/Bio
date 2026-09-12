/**
 * Forme (partielle — uniquement les champs réellement lus) de la réponse Plant.id v3
 * `POST /identification` (voir `identification.service.ts#callPlantIdApi`, `details=`
 * dans l'URL de requête). Tout est optionnel : Plant.id omet un champ plutôt que de
 * renvoyer une valeur inventée quand il n'a pas la donnée.
 */
export interface PlantIdResponse {
  result?: {
    is_plant?: { probability?: number };
    classification?: { suggestions?: PlantIdSuggestion[] };
  };
}

/** Forme (partielle) de la réponse Plant.id Health (`diagnosis.service.ts#callPlantIdHealth`). */
export interface PlantIdHealthResponse {
  result?: {
    is_healthy?: { binary?: boolean; probability?: number };
    disease?: { suggestions?: PlantIdDiseaseSuggestion[] };
  };
}

export interface PlantIdDiseaseSuggestion {
  id?: string;
  name?: string;
  probability?: number;
  is_harmful?: boolean;
  details?: {
    treatment?: {
      biological?: string[];
      chemical?: string[];
      prevention?: string[];
    };
    description?: string;
    local_name?: string;
  };
}

export interface PlantIdSuggestion {
  name?: string;
  probability?: number;
  details?: {
    common_names?: string[] | null;
    taxonomy?: { family?: string | null } | null;
    toxicity?: string | null;
    edible_parts?: string[] | null;
    description?: { value?: string | null } | null;
    best_light_condition?: string | null;
    best_soil_type?: string | null;
    watering?: { min?: number; max?: number } | null;
    propagation_methods?: string[] | null;
    image?: { value?: string | null } | null;
  };
}
