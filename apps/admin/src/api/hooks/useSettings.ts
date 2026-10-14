import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminApiKeyStatus, AdminAuditLogEntry, AdminFeatureFlag } from '@planai/shared';
import { supabase, toApiError } from '../client';
import { queryKeys } from '../queryKeys';

type FlagRow = { cle: string; libelle: string | null; description: string | null; active: boolean };

export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags,
    queryFn: async (): Promise<AdminFeatureFlag[]> => {
      const { data, error } = await supabase.from('feature_flags').select('cle, libelle, description, active');
      if (error) throw toApiError(error);
      return ((data ?? []) as FlagRow[])
        .map((f) => ({ cle: f.cle, libelle: f.libelle ?? f.cle, description: f.description ?? '', actif: f.active }))
        .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
    },
  });
}

export function useSetFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cle, actif }: { cle: string; actif: boolean }) => {
      const { data, error } = await supabase.from('feature_flags').update({ active: actif }).eq('cle', cle).select('cle');
      if (error) throw toApiError(error);
      // RLS : une mise à jour refusée ne lève pas d'erreur, elle ne touche simplement aucune ligne.
      if (!data?.length) throw toApiError({ code: '42501', message: "Action réservée à l'administration." });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLog });
    },
  });
}

/** État des clés de service, lu par l'Edge Function admin-status (jamais les valeurs). */
export async function fetchApiKeysStatus(): Promise<AdminApiKeyStatus[]> {
  const { data, error } = await supabase.functions.invoke<{ keys: AdminApiKeyStatus[] }>('admin-status');
  if (error) throw toApiError({ message: 'Statut des services indisponible.' });
  return data?.keys ?? [];
}

export function useApiKeysStatus() {
  return useQuery({ queryKey: queryKeys.apiKeys, queryFn: fetchApiKeysStatus });
}

type AuditRow = { id: string; admin_pseudo: string; action: string; cible: string | null; created_at: string };

export function useAuditLog() {
  return useQuery({
    queryKey: queryKeys.auditLog,
    queryFn: async (): Promise<AdminAuditLogEntry[]> => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, admin_pseudo, action, cible, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw toApiError(error);
      return ((data ?? []) as AuditRow[]).map((r) => ({
        id: r.id,
        adminPseudo: r.admin_pseudo,
        action: r.action,
        cible: r.cible,
        dateCreation: r.created_at,
      }));
    },
  });
}
