import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { useHerbarium } from '@/api/hooks/useHerbarium';
import { DiscoveryCard } from '@/features/jardin/DiscoveryCard';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function HerbariumView() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const herbarium = useHerbarium();

  const discoveries = herbarium.data ?? [];
  const rareCount = discoveries.filter((d) => d.plant.rarete !== 'commun').length;

  if (herbarium.isPending) {
    return <ActivityIndicator color={colors.active} style={styles.loader} />;
  }

  if (herbarium.isError) {
    return <ErrorState onRetry={() => herbarium.refetch()} />;
  }

  if (discoveries.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.empty, { color: colors.muted }]}>{t('jardin.emptyHerbarium')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={discoveries}
      key="herbarium-grid"
      numColumns={2}
      // item.item.id (l'entrée de collection, unique) — pas plant.id (l'espèce, partagée
      // par toutes les découvertes de la même plante) : découvrir deux fois la même espèce
      // produisait des clés dupliquées (mêmes symptômes que QuotidienView.tsx).
      keyExtractor={(item) => item.item.id ?? item.plant.id}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.headerCount, { color: colors.text }]}>
            {`${t('jardin.discoveriesCount', { count: discoveries.length })} ${t('jardin.rareCount', { count: rareCount })}`}
          </Text>
          <Pressable style={[styles.sortChip, { backgroundColor: colors.chip }]}>
            <Icon name="sort" size={15} color={colors.muted} />
            <Text style={[styles.sortLabel, { color: colors.muted }]}>{t('jardin.sortRecent')}</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <DiscoveryCard discovery={item} onPress={() => router.push(`/plante/${item.plant.id}`)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: Spacing.xxl,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  sortLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
  },
  row: {
    gap: Spacing.sm,
  },
});
