import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { addCollectionItem, pickNextIdentification, wait } from '@/api/mock/store';
import type { IdentificationResult } from '@/api/types';

type IdentifyInput = {
  photoUri: string;
};

async function identifyPlant(_input: IdentifyInput): Promise<IdentificationResult> {
  return wait(pickNextIdentification(), 1200);
}

export function useIdentify() {
  return useMutation({
    mutationFn: identifyPlant,
  });
}

type AddToCollectionInput = {
  plant: IdentificationResult['plant'];
  type: 'owned' | 'discovered';
  geoTagged: boolean;
};

async function addToCollection(input: AddToCollectionInput): Promise<void> {
  addCollectionItem(input.plant, input.type, input.geoTagged);
  await wait(undefined, 300);
}

export function useAddToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addToCollection,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: variables.type === 'owned' ? queryKeys.garden : queryKeys.herbarium,
      });
    },
  });
}
