import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminPlantInput, AdminPlantsPage } from '@planai/shared';
import { rpc, supabase, toApiError } from '../client';
import { queryKeys } from '../queryKeys';

export type PlantsQuery = { page: number; limit: number; q?: string };

/** Champs de la fiche (camelCase côté console) vers les colonnes de la table plants. */
function toRow(input: Partial<AdminPlantInput>) {
  const row: Record<string, unknown> = {};
  if (input.nomScientifique !== undefined) row.nom_scientifique = input.nomScientifique;
  if (input.nomCommun !== undefined) row.nom_commun = input.nomCommun;
  if (input.famille !== undefined) row.famille = input.famille;
  if (input.toxicite !== undefined) row.toxicite = input.toxicite;
  if (input.badgeRarete !== undefined) row.badge_rarete = input.badgeRarete;
  if (input.urlImage !== undefined) row.url_image = input.urlImage;
  if (input.aPropos !== undefined) row.a_propos = input.aPropos;
  if (input.conseilsEntretien !== undefined) row.conseils_entretien = input.conseilsEntretien;
  return row;
}

export function usePlants(params: PlantsQuery) {
  return useQuery({
    queryKey: queryKeys.plants(params),
    queryFn: () => rpc<AdminPlantsPage>('admin_plants', { p_page: params.page, p_limit: params.limit, p_q: params.q || null }),
    placeholderData: (prev) => prev,
  });
}

function useInvalidatePlants() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'plants'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.auditLog });
  };
}

export function useCreatePlant() {
  const onSuccess = useInvalidatePlants();
  return useMutation({
    mutationFn: async (input: AdminPlantInput) => {
      const { error } = await supabase.from('plants').insert(toRow(input));
      if (error) throw toApiError(error);
    },
    onSuccess,
  });
}

export function useUpdatePlant() {
  const onSuccess = useInvalidatePlants();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AdminPlantInput> }) => {
      const { data, error } = await supabase.from('plants').update(toRow(input)).eq('id', id).select('id');
      if (error) throw toApiError(error);
      // RLS : un modérateur ne modifie aucune ligne, sans erreur.
      if (!data?.length) throw toApiError({ code: '42501', message: "Action réservée à l'administration." });
    },
    onSuccess,
  });
}

export function useDeletePlant() {
  const onSuccess = useInvalidatePlants();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('plants').delete().eq('id', id).select('id');
      if (error?.code === '23503') {
        throw toApiError({ code: 'P0001', message: 'Cette espèce est dans des collections : suppression impossible.', status: 409 });
      }
      if (error) throw toApiError(error);
      if (!data?.length) throw toApiError({ code: '42501', message: "Action réservée à l'administration." });
    },
    onSuccess,
  });
}
