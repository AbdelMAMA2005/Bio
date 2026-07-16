import { useHerbarium } from '@/api/hooks/useHerbarium';
import { useMyGarden } from '@/api/hooks/useMyGarden';
import { useQuests } from '@/api/hooks/useQuests';

export function useAccountStats() {
  const garden = useMyGarden();
  const herbarium = useHerbarium();
  const quests = useQuests();

  const rareCount =
    herbarium.data?.filter((d) => d.plant.rarete === 'rare' || d.plant.rarete === 'epique').length ?? 0;

  return {
    isLoading: garden.isLoading || herbarium.isLoading || quests.isLoading,
    captures: garden.data?.length ?? 0,
    species: herbarium.data?.length ?? 0,
    rares: rareCount,
    coins: quests.data?.coins ?? 0,
  };
}
