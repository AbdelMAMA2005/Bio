import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GradientButton } from '@/components/GradientButton';
import { apiClient } from '@/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export default function ConfirmEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { refreshUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setMessage(t('account.emailChangeError')); return; }
    apiClient.post('/users/me/confirm-email', { token }).then(async () => {
      await refreshUser();
      setMessage(t('account.emailConfirmed'));
    }).catch(() => setMessage(t('account.emailChangeError')));
  }, [refreshUser, t, token]);

  return <View style={[styles.fill, { backgroundColor: colors.screen }]}>
    <View style={styles.content}>
      {!message ? <ActivityIndicator color={colors.active} /> : <Text style={[styles.message, { color: colors.text }]}>{message}</Text>}
      {message ? <GradientButton label={t('account.backToAccount')} onPress={() => router.replace('/compte')} /> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl },
  message: { fontFamily: FontFamily.semiBold, fontSize: 16, textAlign: 'center' },
});
