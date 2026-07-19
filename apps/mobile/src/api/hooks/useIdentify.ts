import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BackendIdentifyResponse } from '@/api/adapters';
import { toPlantWithIcon } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import type { IdentificationResult } from '@/api/types';

type IdentifyInput = {
  photoUri: string;
};

/**
 * Le back ne renvoie pas de score de confiance (pas de champ `confiance` sur
 * IdentifyPlantResponseDto — voir API_CONTRACT.md §3). On affiche une valeur de
 * repli plutôt que d'inventer une vraie mesure.
 */
const FALLBACK_CONFIDENCE = 95;

async function identifyPlant(input: IdentifyInput): Promise<IdentificationResult> {
  const formData = new FormData();
  formData.append('image', {
    uri: input.photoUri,
    name: 'scan.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data } = await apiClient.post<BackendIdentifyResponse>('/identification', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return {
    plant: toPlantWithIcon(data.plantId, data),
    confidence: FALLBACK_CONFIDENCE,
    xpAwarded: data.xpGagne,
  };
}

export function useIdentify() {
  return useMutation({
    mutationFn: identifyPlant,
  });
}

type AddToCollectionInput = {
  plant: IdentificationResult['plant'];
  type: 'owned' | 'discovered';
  geoTagged: boolean;
  latitude?: number;
  longitude?: number;
};

async function addToCollection(input: AddToCollectionInput): Promise<void> {
  await apiClient.post('/collection', {
    plantId: input.plant.id,
    type: input.type,
    ...(input.geoTagged && input.latitude !== undefined && input.longitude !== undefined
      ? { latitude: input.latitude, longitude: input.longitude }
      : {}),
  });
}

export function useAddToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addToCollection,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: variables.type === 'owned' ? queryKeys.garden : queryKeys.herbarium,
      });
    },
  });
}
