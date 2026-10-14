import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import { HerbariumView } from '@/features/jardin/HerbariumView';
import { QuotidienView } from '@/features/jardin/QuotidienView';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type JardinTab = 'quotidien' | 'herbarium';

export function JardinScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<JardinTab>(initialTab === 'herbarium' ? 'herbarium' : 'quotidien');

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('jardin.subtitle')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t('jardin.title')}</Text>
          </View>
          <Avatar uri={user?.urlAvatar} name={user?.pseudo ?? '?'} onPress={() => router.push('/compte')} />
        </View>

        <View style={styles.segmentWrap}>
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            options={[
              { value: 'quotidien', label: t('jardin.quotidien'), icon: 'potted_plant' },
              { value: 'herbarium', label: t('jardin.herbarium'), icon: 'menu_book' },
            ]}
          />
        </View>

        {tab === 'quotidien' ? <QuotidienView /> : <HerbariumView />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  segmentWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
