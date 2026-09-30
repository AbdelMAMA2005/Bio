import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toPlantWithIcon } from '@/api/adapters';
import type { IdentificationResult } from '@/api/types';
import { queryKeys } from '@/api/queryKeys';
import { supabase, uriToImageDataUrl } from '@/lib/supabase';
export function useIdentify() {
  return useMutation({ mutationFn: async ({ photoUri }: { photoUri: string }): Promise<IdentificationResult> => {
    const imageBase64 = await uriToImageDataUrl(photoUri);
    const { data, error } = await supabase.functions.invoke('identify-plant', { body: { imageBase64 } });
    if (error) throw error;
    if (!data?.plantId) throw new Error(data?.error ?? 'Plant identification failed');
    return { plant: toPlantWithIcon(data.plantId, data), confidence: data.confiance, xpAwarded: data.xpGagne };
  } });
}

export function useAddToCollection() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async ({ plant, type, geoTagged, latitude, longitude }: { plant: IdentificationResult['plant']; type: 'owned' | 'discovered'; geoTagged: boolean; latitude?: number; longitude?: number }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('collection').insert({ user_id: user.user.id, plant_id: plant.id, type_collection: type, latitude: geoTagged ? latitude : null, longitude: geoTagged ? longitude : null }).select('id').single();
    if (error) throw error;
    return { collectionId: data.id };
  }, onSuccess: (_data, variables) => client.invalidateQueries({ queryKey: variables.type === 'owned' ? queryKeys.garden : queryKeys.herbarium }) });
}
