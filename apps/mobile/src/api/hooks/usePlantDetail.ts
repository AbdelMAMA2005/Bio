import { useHerbarium } from '@/api/hooks/useHerbarium';
import { useMyGarden } from '@/api/hooks/useMyGarden';
import { ownPhotoUrl, type PlantDetail } from '@/api/types';

/**
 * Pas d'endpoint GET /collection/:id ou GET /plants/:id côté back (voir API_CONTRACT.md
 * §4) : on retrouve la plante en cherchant dans le Jardin/Herbarium déjà chargés (mêmes
 * requêtes que les écrans Quotidien/Herbarium, donc pas d'appel réseau supplémentaire
 * une fois ces listes en cache).
 */
export function usePlantDetail(id: string) {
  const garden = useMyGarden();
  const herbarium = useHerbarium();

  const discovery = herbarium.data?.find((d) => d.plant.id === id);
  const clone = garden.data?.find((c) => c.plant.id === id);

  const data: PlantDetail | undefined = discovery
    ? {
        plant: discovery.plant,
        placeLabel: discovery.placeLabel,
        dateAjout: discovery.item.dateAjout,
        ownPhotoUrl: ownPhotoUrl(discovery.item),
      }
    : clone
      ? {
          plant: clone.plant,
          placeLabel: '',
          dateAjout: clone.item.dateAjout,
          ownPhotoUrl: ownPhotoUrl(clone.item),
        }
      : undefined;

  return {
    data,
    isPending: garden.isPending || herbarium.isPending,
    isError: garden.isError || herbarium.isError,
    refetch: () => {
      garden.refetch();
      herbarium.refetch();
    },
  };
}
