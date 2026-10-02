import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { useHerbarium } from '@/api/hooks/useHerbarium';
import { DiscoveryCard } from '@/features/jardin/DiscoveryCard';
import { useAppTheme } from '@/theme';
import { AccentOnColor } from '@/theme/colors';
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
        <Pressable style={[styles.addButton, { backgroundColor: colors.active }]} onPress={() => router.push('/(tabs)/scan')}>
          <Icon name="add_a_photo" size={18} color={AccentOnColor} />
          <Text style={[styles.addLabel, { color: AccentOnColor }]}>{t('jardin.addPlant')}</Text>
        </Pressable>
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
      onEndReached={() => {
        if (herbarium.hasNextPage && !herbarium.isFetchingNextPage) herbarium.fetchNextPage();
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        herbarium.isFetchingNextPage ? <ActivityIndicator color={colors.active} style={styles.footerLoader} /> : null
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.headerCount, { color: colors.text }]}>
            {`${t('jardin.discoveriesCount', { count: discoveries.length })} ${t('jardin.rareCount', { count: rareCount })}`}
          </Text>
          <Pressable style={[styles.addChip, { backgroundColor: colors.active }]} onPress={() => router.push('/(tabs)/scan')}>
            <Icon name="add" size={16} color={AccentOnColor} />
            <Text style={[styles.addChipLabel, { color: AccentOnColor }]}>{t('jardin.addPlant')}</Text>
          </Pressable>
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
  footerLoader: {
    paddingVertical: Spacing.lg,
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
  addButton: { marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  addLabel: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 12, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  addChipLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5 },
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
