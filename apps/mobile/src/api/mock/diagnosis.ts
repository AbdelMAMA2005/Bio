export type DiagnosisResult =
  | { status: 'healthy'; confidence: number }
  | { status: 'disease'; diseaseIcon: string; diseaseName: string; confidence: number; treatment: string };

const diagnosisByPlantId: Record<string, DiagnosisResult> = {
  'plant-lavande': {
    status: 'disease',
    diseaseIcon: 'coronavirus',
    diseaseName: 'Septoriose',
    confidence: 91,
    treatment:
      "Retirez les feuilles atteintes. Appliquez un fongicide bio. Évitez d'arroser le feuillage.",
  },
  'plant-calathea': {
    status: 'disease',
    diseaseIcon: 'coronavirus',
    diseaseName: 'Stress hydrique',
    confidence: 74,
    treatment: "Augmentez l'hygrométrie ambiante (brumisation, plateau de billes d'argile humide).",
  },
};

export function diagnosePlant(idPlante: string): DiagnosisResult {
  return diagnosisByPlantId[idPlante] ?? { status: 'healthy', confidence: 96 };
}
