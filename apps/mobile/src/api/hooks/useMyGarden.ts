import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { BackendCollectionItem } from '@/api/adapters';
import { diagnosisFromBackend, toGardenClone } from '@/api/adapters';
import { queryKeys } from '@/api/queryKeys';
import type { DiagnosisResult } from '@/api/mock/diagnosis';
import { useAuth } from '@/features/auth/AuthProvider';
import { signCollectionPhotos, supabase, uriToBlob, uriToImageDataUrl } from '@/lib/supabase';
const DEFAULT_WATERING_DAYS = 7;

/** Prochaine échéance d'arrosage selon la fréquence de l'espèce (7 jours si elle est inconnue). */
export function nextWateringDate(frequencyDays: number | null | undefined, from = Date.now()): string {
  const days = frequencyDays && frequencyDays > 0 ? frequencyDays : DEFAULT_WATERING_DAYS;
  return new Date(from + days * 86400000).toISOString();
}

async function fetchGardenPage(page: number): Promise<{ items: BackendCollectionItem[]; total: number }> {
  const from = (page - 1) * 20;
  const { data, error, count } = await supabase.from('collection').select('*, plants(*)', { count: 'exact' }).eq('type_collection', 'owned').order('date_ajout', { ascending: false }).order('id', { ascending: false }).range(from, from + 19);
  if (error) {
    console.error('[garden] Supabase query failed', error);
    throw error;
  }
  const rows = await signCollectionPhotos(data ?? []);
  return { items: rows.map((row) => ({ ...row, idPlante: row.plant_id, nomScientifique: row.plants.nom_scientifique, nomCommun: row.plants.nom_commun, famille: row.plants.famille, toxicite: row.plants.toxicite, badgeRarete: row.plants.badge_rarete, aPropos: row.plants.a_propos, conseilsEntretien: row.plants.conseils_entretien, urlImage: row.plants.url_image, etatSante: row.etat_sante, dateAjout: row.date_ajout, historiquePhotos: row.historique_photos, prochainArrosage: row.prochain_arrosage })) as BackendCollectionItem[], total: count ?? 0 };
}

export function useMyGarden() {
  const { user } = useAuth();
  const query = useInfiniteQuery({ queryKey: queryKeys.garden, queryFn: ({ pageParam }) => fetchGardenPage(pageParam), initialPageParam: 1, getNextPageParam: (last, pages) => pages.length * 20 < last.total ? pages.length + 1 : undefined, enabled: !!user });
  const userId = user?.id ?? '';
  // Mémoïsé : useWateringNotifications reprogrammait toutes les notifications à chaque rendu.
  const data = useMemo(() => query.data?.pages.flatMap((page) => page.items.map((item) => toGardenClone(item, userId, ''))), [query.data, userId]);
  return { ...query, data };
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
    const { error: updateError } = await supabase.from('collection').update({ historique_photos: [...photos, { path, date: new Date().toISOString() }] }).eq('id', collectionId);
    if (updateError) throw updateError;
  }, onSuccess: () => { client.invalidateQueries({ queryKey: queryKeys.garden }); client.invalidateQueries({ queryKey: queryKeys.herbarium }); } });
}

export function useMarkWatered() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (collectionId: string) => {
    const { data: row, error: readError } = await supabase.from('collection').select('plants(frequence_arrosage_jours)').eq('id', collectionId).single();
    if (readError) throw readError;
    const plant = (Array.isArray(row.plants) ? row.plants[0] : row.plants) as { frequence_arrosage_jours: number | null } | null;
    const { error } = await supabase.from('collection').update({ prochain_arrosage: nextWateringDate(plant?.frequence_arrosage_jours) }).eq('id', collectionId);
    if (error) throw error;
  }, onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.garden }) });
}
