import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { BackendCollectionItem, BackendDiagnosisResponse } from '@/api/adapters';
import { diagnosisFromBackend, toGardenClone } from '@/api/adapters';
import { apiClient } from '@/api/client';
import { API_BASE_URL, USE_MOCK_API } from '@/api/config';
import { diagnosePlant, type DiagnosisResult } from '@/api/mock/diagnosis';
import { setCloneHealth } from '@/api/mock/store';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/AuthProvider';

const GARDEN_PAGE_SIZE = 20;

type BackendCollectionPage = { items: BackendCollectionItem[]; total: number };

async function fetchGardenPage(page: number): Promise<BackendCollectionPage> {
  const { data } = await apiClient.get<BackendCollectionPage>('/collection', {
    params: { type: 'owned', page, limit: GARDEN_PAGE_SIZE },
  });
  return data;
}

/**
 * Pagination réelle (`page`/`limit`, voir API_CONTRACT.md §4) via `useInfiniteQuery` : Mon
 * Jardin ne charge plus toute la collection d'un coup. `fetchNextPage()` est déclenché par
 * `onEndReached` dans QuotidienView.tsx — `.data` reste un tableau à plat (comme avant) pour
 * ne pas casser les autres consommateurs (usePlantDetail, useAccountStats, ScanScreen...),
 * qui n'ont pas besoin de connaître la pagination.
 */
export function useMyGarden() {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: queryKeys.garden,
    queryFn: ({ pageParam }) => fetchGardenPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? allPages.length + 1 : undefined;
    },
    enabled: !!user,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((p) => p.items.map((item) => toGardenClone(item, user!.id, API_BASE_URL))),
  };
}

/**
 * Le module `diagnosis` existe désormais côté back (POST /collection/:id/diagnosis,
 * voir API_CONTRACT.md §4) : on l'appelle réellement, avec un repli mock activable
 * via EXPO_PUBLIC_USE_MOCK_API si le back est indisponible en dev.
 *
 * `photoUri` (photo de la feuille prise par l'utilisateur, cahier des charges §"Détection
 * de maladies") est envoyée en multipart, exactement comme `addTrackingPhoto` ci-dessous —
 * sans elle, le back retombe sur la dernière photo de `historiquePhotos`, qui n'existe pas
 * pour une plante tout juste ajoutée (400 "Aucune image disponible pour le diagnostic").
 */
async function checkHealth({
  collectionId,
  idPlante,
  photoUri,
}: {
  collectionId: string;
  idPlante: string;
  photoUri: string;
}): Promise<DiagnosisResult> {
  if (USE_MOCK_API) {
    const result = diagnosePlant(idPlante);
    setCloneHealth(idPlante, result.status === 'disease' ? 'malade' : 'sain');
    return result;
  }

  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    name: 'diagnostic.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data } = await apiClient.post<BackendDiagnosisResponse>(`/collection/${collectionId}/diagnosis`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return diagnosisFromBackend(data);
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
      // La photo de capture initiale (scan) peut atterrir sur un item Jardin OU
      // Herbarium selon le choix fait après l'identification : on invalide les deux
      // plutôt que de savoir a priori lequel des deux caches contient cet item.
      queryClient.invalidateQueries({ queryKey: queryKeys.garden });
      queryClient.invalidateQueries({ queryKey: queryKeys.herbarium });
    },
  });
}

/**
 * POST /collection/:id/water (CollectionService#waterNow) : met à jour
 * `derniereArrosage` côté back, qui recalcule `prochainArrosage` en conséquence — voir
 * API_CONTRACT.md §4. Invalide le Jardin pour que le bandeau "N arrosages prévus
 * aujourd'hui" et le badge d'arrosage de la carte reflètent immédiatement la nouvelle
 * échéance (et pour que useWateringNotifications reprogramme la notification locale).
 */
async function markWatered(collectionId: string): Promise<void> {
  await apiClient.post(`/collection/${collectionId}/water`);
}

export function useMarkWatered() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markWatered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garden });
    },
  });
}
