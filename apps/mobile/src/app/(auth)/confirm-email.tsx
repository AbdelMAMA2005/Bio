import { Redirect, useLocalSearchParams } from 'expo-router';

import { ConfirmEmailScreen } from '@/features/auth/ConfirmEmailScreen';

export default function ConfirmEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  if (!email) return <Redirect href="/(auth)/register" />;
  return <ConfirmEmailScreen email={email} />;
}
