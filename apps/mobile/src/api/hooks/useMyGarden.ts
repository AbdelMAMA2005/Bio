import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BackendCollectionItem } from '@/api/adapters';
import { diagnosisFromBackend, toGardenClone } from '@/api/adapters';
import { queryKeys } from '@/api/queryKeys';
import type { DiagnosisResult } from '@/api/mock/diagnosis';
import { useAuth } from '@/features/auth/AuthProvider';
import { getStoragePublicUrl, supabase, uriToBlob, uriToImageDataUrl } from '@/lib/supabase';
async function fetchGardenPage(page: number): Promise<{ items: BackendCollectionItem[]; total: number }> {
  const from = (page - 1) * 20;
  const { data, error, count } = await supabase.from('collection').select('*, plants(*)', { count: 'exact' }).eq('type_collection', 'owned').range(from, from + 19);
  if (error) {
    console.error('[garden] Supabase query failed', error);
    throw error;
  }
  return { items: (data ?? []).map((row) => ({ ...row, idPlante: row.plant_id, nomScientifique: row.plants.nom_scientifique, nomCommun: row.plants.nom_commun, famille: row.plants.famille, toxicite: row.plants.toxicite, badgeRarete: row.plants.badge_rarete, aPropos: row.plants.a_propos, conseilsEntretien: row.plants.conseils_entretien, urlImage: row.plants.url_image, etatSante: row.etat_sante, dateAjout: row.date_ajout, historiquePhotos: row.historique_photos, prochainArrosage: row.prochain_arrosage })) as BackendCollectionItem[], total: count ?? 0 };
}

export function useMyGarden() {
  const { user } = useAuth();
  const query = useInfiniteQuery({ queryKey: queryKeys.garden, queryFn: ({ pageParam }) => fetchGardenPage(pageParam), initialPageParam: 1, getNextPageParam: (last, pages) => pages.length * 20 < last.total ? pages.length + 1 : undefined, enabled: !!user });
  return { ...query, data: query.data?.pages.flatMap((page) => page.items.map((item) => toGardenClone(item, user!.id, ''))) };
}

export function useCheckHealth() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ collectionId, photoUri }: { collectionId: string; idPlante: string; photoUri: string }): Promise<DiagnosisResult> => {
    const imageBase64 = await uriToImageDataUrl(photoUri);
    const { data, error } = await supabase.functions.invoke('diagnose-health', { body: { imageBase64, collectionId } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return diagnosisFromBackend(data);
  }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.garden }) });
}

export function useAddTrackingPhoto() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ collectionId, uri }: { collectionId: string; uri: string }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    const path = `${data.user.id}/${collectionId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('collections').upload(path, await uriToBlob(uri), { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data: row, error } = await supabase.from('collection').select('historique_photos').eq('id', collectionId).single();
    if (error) throw error;
    const photos = Array.isArray(row.historique_photos) ? row.historique_photos : [];
    const { error: updateError } = await supabase.from('collection').update({ historique_photos: [...photos, { url: getStoragePublicUrl('collections', path), date: new Date().toISOString() }] }).eq('id', collectionId);
    if (updateError) throw updateError;
  }, onSuccess: () => { client.invalidateQueries({ queryKey: queryKeys.garden }); client.invalidateQueries({ queryKey: queryKeys.herbarium }); } });
}

export function useMarkWatered() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (collectionId: string) => {
    const { error } = await supabase.from('collection').update({ prochain_arrosage: new Date(Date.now() + 7 * 86400000).toISOString() }).eq('id', collectionId);
    if (error) throw error;
  }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.garden }) });
}
