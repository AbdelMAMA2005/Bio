import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nextWateringDate } from '@/api/hooks/useMyGarden';
import { identifyPlant } from '@/api/identifyPlant';
import type { IdentificationResult } from '@/api/types';
import { queryKeys } from '@/api/queryKeys';
import { supabase } from '@/lib/supabase';
export function useIdentify() {
  return useMutation({ mutationFn: identifyPlant });
}

export function useAddToCollection() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ plant, type, geoTagged, latitude, longitude }: { plant: IdentificationResult['plant']; type: 'owned' | 'discovered'; geoTagged: boolean; latitude?: number; longitude?: number }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');
    // Sans première échéance, une plante du Jardin restait « à arroser aujourd'hui » jusqu'au premier arrosage.
    let prochainArrosage: string | null = null;
    if (type === 'owned') {
      const { data: species } = await supabase.from('plants').select('frequence_arrosage_jours').eq('id', plant.id).maybeSingle();
      prochainArrosage = nextWateringDate(species?.frequence_arrosage_jours);
    }
    const { data, error } = await supabase.from('collection').insert({ user_id: user.user.id, plant_id: plant.id, type_collection: type, latitude: geoTagged ? latitude : null, longitude: geoTagged ? longitude : null, prochain_arrosage: prochainArrosage }).select('id').single();
    if (error) throw error;
    return { collectionId: data.id };
  }, onSuccess: (_data, variables) => client.invalidateQueries({ queryKey: variables.type === 'owned' ? queryKeys.garden : queryKeys.herbarium }) });
}
