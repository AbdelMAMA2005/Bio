import { toPlantWithIcon } from '@/api/adapters';
import type { IdentificationResult } from '@/api/types';
import { supabase, uriToImageDataUrl } from '@/lib/supabase';

/** Preserve the function's response: Supabase's wrapper hides its error body. */
async function identificationError(error: Error & { context?: Response }): Promise<Error> {
  const response = error.context;
  let message = error.message;
  if (response && typeof response.clone === 'function') {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === 'string') message = body.error;
      else if (typeof body?.message === 'string') message = body.message;
    } catch {
      // Non-JSON gateway responses still retain their status and original message.
    }
  }
  return Object.assign(new Error(message), { status: response?.status });
}

export async function identifyPlant({ photoUri, imageBase64 }: {
  photoUri: string;
  imageBase64?: string;
}): Promise<IdentificationResult> {
  const image = imageBase64 ?? await uriToImageDataUrl(photoUri);
  const { data, error } = await supabase.functions.invoke('identify-plant', {
    body: { imageBase64: image },
  });
  if (error) throw await identificationError(error);
  if (!data?.plantId) throw new Error(data?.error ?? 'Plant identification failed');
  return {
    plant: toPlantWithIcon(data.plantId, data),
    confidence: data.confiance,
    xpAwarded: data.xpGagne,
  };
}
