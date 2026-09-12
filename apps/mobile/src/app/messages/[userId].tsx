import { useLocalSearchParams } from 'expo-router';

import { ConversationScreen } from '@/features/messages/ConversationScreen';

export default function Conversation() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <ConversationScreen peerId={userId} />;
}
