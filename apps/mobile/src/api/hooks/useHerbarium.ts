import { useInfiniteQuery } from '@tanstack/react-query';
import { toHerbariumDiscovery, type BackendCollectionItem } from '@/api/adapters';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/AuthProvider';
import { signCollectionPhotos, supabase } from '@/lib/supabase';
async function fetchHerbariumPage(page: number): Promise<{ items: BackendCollectionItem[]; total: number }> {
  const from = (page - 1) * 20;
  const { data, error, count } = await supabase.from('collection').select('*, plants(*)', { count: 'exact' }).eq('type_collection', 'discovered').range(from, from + 19);
  if (error) throw error;
  const rows = await signCollectionPhotos(data ?? []);
  return { items: rows.map((row) => ({ ...row, idPlante: row.plant_id, nomScientifique: row.plants.nom_scientifique, nomCommun: row.plants.nom_commun, famille: row.plants.famille, toxicite: row.plants.toxicite, badgeRarete: row.plants.badge_rarete, aPropos: row.plants.a_propos, conseilsEntretien: row.plants.conseils_entretien, urlImage: row.plants.url_image, etatSante: row.etat_sante, dateAjout: row.date_ajout, historiquePhotos: row.historique_photos, prochainArrosage: row.prochain_arrosage })) as BackendCollectionItem[], total: count ?? 0 };
}

export function useHerbarium() {
  const { user } = useAuth();
  const query = useInfiniteQuery({ queryKey: queryKeys.herbarium, queryFn: ({ pageParam }) => fetchHerbariumPage(pageParam), initialPageParam: 1, getNextPageParam: (last, pages) => pages.length * 20 < last.total ? pages.length + 1 : undefined, enabled: !!user });
  return { ...query, data: query.data?.pages.flatMap((page) => page.items.map((item) => toHerbariumDiscovery(item, user!.id, ''))) };
}
