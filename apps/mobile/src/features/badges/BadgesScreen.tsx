import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { useBadges } from '@/api/hooks/useBadges';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { AmberAccent } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function BadgesScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const badges = useBadges();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="close" onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('badges.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {badges.isPending ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : badges.isError ? (
          <ErrorState onRetry={() => badges.refetch()} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {(badges.data ?? []).map((badge) => {
              const obtained = badge.obtenuLe !== null;
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.hairline, opacity: obtained ? 1 : 0.55 },
                  ]}>
                  <View style={[styles.iconWrap, { backgroundColor: obtained ? AmberAccent.bg : colors.chip }]}>
                    <Icon name="workspace_premium" size={26} color={obtained ? AmberAccent.text : colors.muted} />
                  </View>
                  <View style={styles.textWrap}>
                    <Text style={[styles.name, { color: colors.text }]}>{badge.nom}</Text>
                    <Text style={[styles.description, { color: colors.muted }]}>{badge.description}</Text>
                    <Text style={[styles.status, { color: obtained ? AmberAccent.text : colors.muted }]}>
                      {obtained ? t('badges.obtainedOn', { date: formatRelativeDate(badge.obtenuLe as string, language) }) : t('badges.locked')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
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
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: 17,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  status: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
  },
});
