import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Icon } from '@/components/Icon';
import { PlantPhoto } from '@/components/PlantPhoto';
import { RarityBadge } from '@/components/RarityBadge';
import { usePlantDetail } from '@/api/hooks/usePlantDetail';
import { parseConseilsEntretien } from '@/api/types';
import type { CareType } from '@/features/plant/CareDetailScreen';
import type { SupportedLanguage } from '@/i18n';
import { translateCareAdvice } from '@/utils/careTranslation';
import { formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import { toxicityDisplay } from '@/utils/toxicity';

const CARE_VALUE_TRUNCATE_LENGTH = 60;

type Props = {
  plantId: string;
};

export function PlantDetailScreen({ plantId }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const detail = usePlantDetail(plantId);

  if (detail.isPending) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.screen }]}>
        <ActivityIndicator color={colors.active} />
      </View>
    );
  }

  if (detail.isError) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.screen }]}>
        <ErrorState onRetry={() => detail.refetch()} />
      </View>
    );
  }

  if (!detail.data) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.screen }]}>
        <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
      </View>
    );
  }

  const { plant, placeLabel, dateAjout, ownPhotoUrl } = detail.data;
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const rarityPalette = (isDark ? RarityColors : RarityColorsLight)[plant.rarete];
  const toxicity = toxicityDisplay(plant.toxicite);
  const care = translateCareAdvice(parseConseilsEntretien(plant.conseilsEntretien), language);

  const careGrid: { icon: 'wb_sunny' | 'grass' | 'water_drop' | 'eco'; type: CareType; labelKey: string; value: string }[] = [
    { icon: 'wb_sunny', type: 'light', labelKey: 'plant.care.light', value: care.light },
    { icon: 'grass', type: 'soil', labelKey: 'plant.care.soil', value: care.soil },
    { icon: 'water_drop', type: 'watering', labelKey: 'plant.care.watering', value: care.arrosage },
    { icon: 'eco', type: 'propagation', labelKey: 'plant.care.propagation', value: care.multiplication },
  ];

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: rarityPalette.bg }]}>
          <PlantPhoto
            ownPhotoUrl={ownPhotoUrl}
            catalogUrl={plant.urlImage}
            icon={plant.icon}
            iconSize={96}
            iconColor={rarityPalette.text}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.heroBackWrap} edges={['top']}>
            <CircleIconButton icon="arrow_back" variant="glass" onPress={() => router.back()} />
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <RarityBadge rarete={plant.rarete} />
            <View style={[styles.toxicityBadge, { backgroundColor: toxicity.bg }]}>
              <Icon name={toxicity.icon} size={13} color={toxicity.text} />
              <Text style={[styles.toxicityLabel, { color: toxicity.text }]}>{t(toxicity.labelKey)}</Text>
            </View>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{plant.nomCommun}</Text>
          <Text style={[styles.latin, { color: colors.soft }]}>{plant.nomScientifique}</Text>
          <Text style={[styles.family, { color: colors.muted }]}>{t('plant.familyLabel', { family: plant.famille })}</Text>

          <View style={styles.metaRow}>
            {placeLabel ? (
              <View style={[styles.locationChip, { backgroundColor: colors.chip }]}>
                <Icon name="location_on" size={13} color={colors.active} />
                <Text style={[styles.locationLabel, { color: colors.text }]} numberOfLines={1}>
                  {placeLabel} · {formatRelativeDate(dateAjout, language)}
                </Text>
              </View>
            ) : (
              <View style={[styles.locationChip, { backgroundColor: colors.chip }]}>
                <Icon name="schedule" size={13} color={colors.muted} />
                <Text style={[styles.locationLabel, { color: colors.text }]}>{formatRelativeDate(dateAjout, language)}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('plant.careTitle')}</Text>
          <View style={styles.careGrid}>
            {careGrid.map((cell) => {
              const isTruncated = cell.value.length > CARE_VALUE_TRUNCATE_LENGTH;
              const displayValue = isTruncated
                ? `${cell.value.slice(0, CARE_VALUE_TRUNCATE_LENGTH).trimEnd()}…`
                : cell.value;
              return (
                <View key={cell.labelKey} style={[styles.careCell, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                  <Icon name={cell.icon} size={20} color={colors.active} />
                  <Text style={[styles.careLabel, { color: colors.muted }]}>{t(cell.labelKey)}</Text>
                  <Text style={[styles.careValue, { color: colors.text }]} numberOfLines={3}>
                    {displayValue}
                    {isTruncated ? (
                      <Text
                        style={[styles.careMore, { color: colors.active }]}
                        onPress={() =>
                          router.push({ pathname: '/conseil/[type]', params: { type: cell.type, text: cell.value } })
                        }>
                        {' '}
                        {t('plant.care.more')}
                      </Text>
                    ) : null}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('plant.aboutTitle')}</Text>
          <Text style={[styles.about, { color: colors.muted }]}>{plant.aPropos || t('plant.aboutUnavailable')}</Text>

          <PrimaryButton
            label={t('plant.viewInHerbarium')}
            onPress={() => router.push({ pathname: '/(tabs)/jardin', params: { tab: 'herbarium' } })}
            style={styles.cta}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBackWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toxicityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  toxicityLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  name: {
    fontFamily: FontFamily.display,
    fontSize: 26,
    marginTop: 2,
  },
  latin: {
    fontFamily: FontFamily.latin,
    fontSize: 16,
  },
  family: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  locationChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  locationLabel: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    marginTop: Spacing.md,
  },
  careGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  careCell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 3,
  },
  careLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  careValue: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
  },
  careMore: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
  },
  about: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  cta: {
    marginTop: Spacing.lg,
  },
});
