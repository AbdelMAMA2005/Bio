import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminQuest, AdminQuestType } from '@planai/shared';
import { rpc, supabase, toApiError } from '../client';
import { queryKeys } from '../queryKeys';

export function useAdminQuests() {
  return useQuery({
    queryKey: queryKeys.quests,
    queryFn: () => rpc<AdminQuest[]>('admin_quests'),
  });
}

export type CreateQuestInput = {
  id: string;
  libelle: string;
  type: AdminQuestType;
  objectif: number;
  recompenseXp: number;
  recompensePieces: number;
};

function toRow(input: Partial<CreateQuestInput> & { actif?: boolean }) {
  const row: Record<string, unknown> = {};
  if (input.id !== undefined) row.id = input.id;
  if (input.libelle !== undefined) row.libelle = input.libelle;
  if (input.type !== undefined) row.type = input.type;
  if (input.objectif !== undefined) row.objectif = input.objectif;
  if (input.recompenseXp !== undefined) row.recompense_xp = input.recompenseXp;
  if (input.recompensePieces !== undefined) row.recompense_pieces = input.recompensePieces;
  if (input.actif !== undefined) row.actif = input.actif;
  return row;
}

function useInvalidateQuests() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.quests });
    queryClient.invalidateQueries({ queryKey: queryKeys.auditLog });
  };
}

export function useCreateQuest() {
  const onSuccess = useInvalidateQuests();
  return useMutation({
    mutationFn: async (input: CreateQuestInput) => {
      const { error } = await supabase.from('quests').insert({ ...toRow(input), actif: true });
      if (error?.code === '23505') {
        throw toApiError({ code: 'P0001', message: 'Un défi avec cet identifiant existe déjà.', status: 409 });
      }
      if (error) throw toApiError(error);
    },
    onSuccess,
  });
}

export function useUpdateQuest() {
  const onSuccess = useInvalidateQuests();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateQuestInput> & { actif?: boolean } }) => {
      const { data, error } = await supabase.from('quests').update(toRow(input)).eq('id', id).select('id');
      if (error) throw toApiError(error);
      if (!data?.length) throw toApiError({ code: '42501', message: "Action réservée à l'administration." });
    },
    onSuccess,
  });
}
