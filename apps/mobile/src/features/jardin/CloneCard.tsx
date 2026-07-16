import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { GardenClone } from '@/api/types';
import { PhotoTimeline } from '@/features/jardin/PhotoTimeline';
import { useAppTheme } from '@/theme';
import { HealthColors, HealthIcons, RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  clone: GardenClone;
  onPhotoDeSuivi: () => void;
  onCheckHealth: () => void;
  checkingHealth?: boolean;
};

export function CloneCard({ clone, onPhotoDeSuivi, onCheckHealth, checkingHealth }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { plant, item, nextWatering, lightHint } = clone;
  const etatSante = item.etatSante ?? 'sain';
  const rarityPalette = (isDark ? RarityColors : RarityColorsLight)[plant.rarete];
  const healthColor = HealthColors[etatSante];
  const isSick = etatSante === 'malade';

  const wateringLabel =
    nextWatering.key === 'jardin.inDays'
      ? t('jardin.waterIn', { when: t('jardin.inDays', { count: nextWatering.count }) })
      : t('jardin.waterIn', { when: t(nextWatering.key) });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.header}>
        <View style={styles.thumbWrap}>
          <View style={[styles.thumb, { backgroundColor: rarityPalette.bg }]}>
            <Icon name={plant.icon} size={28} color={rarityPalette.text} />
          </View>
          <View style={[styles.healthDot, { backgroundColor: healthColor, borderColor: colors.surface }]} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{plant.nomCommun}</Text>
          <View style={styles.healthRow}>
            <Icon name={HealthIcons[etatSante]} size={13} color={healthColor} />
            <Text style={[styles.healthLabel, { color: healthColor }]}>{t(`health.${etatSante}`)}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="water_drop" size={13} color={colors.muted} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>{wateringLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="wb_sunny" size={13} color={colors.muted} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>{lightHint}</Text>
            </View>
          </View>
        </View>
      </View>

      <PhotoTimeline photos={item.historiquePhotos ?? []} />

      <View style={styles.actions}>
        <SecondaryButton
          label={t('jardin.photoDeSuivi')}
          icon="add_a_photo"
          onPress={onPhotoDeSuivi}
          style={styles.actionButton}
        />
        <SecondaryButton
          label={t('jardin.checkHealth')}
          icon="health_and_safety"
          destructive={isSick}
          loading={checkingHealth}
          onPress={onCheckHealth}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  info: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
