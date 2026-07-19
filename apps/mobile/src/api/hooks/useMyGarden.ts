import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BackendCollectionItem } from '@/api/adapters';
import { toGardenClone } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { diagnosePlant, type DiagnosisResult } from '@/api/mock/diagnosis';
import { setCloneHealth } from '@/api/mock/store';
import { queryKeys } from '@/api/queryKeys';
import type { GardenClone } from '@/api/types';
import { useAuth } from '@/features/auth/AuthProvider';

async function fetchGarden(userId: string): Promise<GardenClone[]> {
  const { data } = await apiClient.get<BackendCollectionItem[]>('/collection', { params: { type: 'owned' } });
  return data.map((item) => toGardenClone(item, userId));
}

export function useMyGarden() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.garden,
    queryFn: () => fetchGarden(user!.id),
    enabled: !!user,
  });
}

/**
 * Pas d'endpoint POST /collection/:id/diagnosis côté back (module `diagnosis` non
 * branché sur AppModule) — reste mocké. Voir BACKEND_ISSUES.md §6.
 */
async function checkHealth(idPlante: string): Promise<DiagnosisResult> {
  const result = diagnosePlant(idPlante);
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

async function addTrackingPhoto(input: { collectionId: string; uri: string }): Promise<void> {
  const formData = new FormData();
  formData.append('image', {
    uri: input.uri,
    name: 'suivi.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  await apiClient.post(`/collection/${input.collectionId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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
