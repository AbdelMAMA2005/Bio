import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminPlant, AdminPlantInput, AdminPlantsPage } from '@planai/shared';
import { apiClient } from '../client';
import { queryKeys } from '../queryKeys';

export type PlantsQuery = { page: number; limit: number; q?: string };

export function usePlants(params: PlantsQuery) {
  return useQuery({
    queryKey: queryKeys.plants(params),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminPlantsPage>('/admin/plants', { params });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreatePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminPlantInput) => {
      const { data } = await apiClient.post<AdminPlant>('/admin/plants', input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'plants'] }),
  });
}

export function useUpdatePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AdminPlantInput> }) => {
      const { data } = await apiClient.patch<AdminPlant>(`/admin/plants/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'plants'] }),
  });
}

export function useDeletePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/plants/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'plants'] }),
  });
}
