import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { diagnosePlant, type DiagnosisResult } from '@/api/mock/diagnosis';
import { addCloneTrackingPhoto, gardenClones, setCloneHealth, wait } from '@/api/mock/store';
import type { GardenClone } from '@/api/types';

async function fetchGarden(): Promise<GardenClone[]> {
  return wait([...gardenClones], 400);
}

export function useMyGarden() {
  return useQuery({ queryKey: queryKeys.garden, queryFn: fetchGarden });
}

async function checkHealth(idPlante: string): Promise<DiagnosisResult> {
  const result = await wait(diagnosePlant(idPlante), 900);
  setCloneHealth(idPlante, result.status === 'disease' ? 'malade' : 'sain');
  return result;
}

export function useCheckHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkHealth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garden });
    },
  });
}

async function addTrackingPhoto(input: { idPlante: string; uri: string }): Promise<void> {
  addCloneTrackingPhoto(input.idPlante, input.uri);
  await wait(undefined, 400);
}

export function useAddTrackingPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addTrackingPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garden });
    },
  });
}
