import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';

export default function Index() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/jardin' : '/login'} />;
}
