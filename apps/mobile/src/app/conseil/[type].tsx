import { useLocalSearchParams } from 'expo-router';

import { CareDetailScreen } from '@/features/plant/CareDetailScreen';

export default function ConseilDetail() {
  const { type, text } = useLocalSearchParams<{ type: string; text: string }>();
  return <CareDetailScreen type={type} text={text} />;
}
