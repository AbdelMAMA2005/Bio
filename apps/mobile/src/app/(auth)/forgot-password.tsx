import { useLocalSearchParams } from 'expo-router';

import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';

export default function ForgotPassword() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return <ForgotPasswordScreen initialEmail={email ?? ''} />;
}
