import { useLocalSearchParams } from 'expo-router';

import { PlantDetailScreen } from '@/features/plant/PlantDetailScreen';

export default function Plante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlantDetailScreen plantId={id} />;
}
