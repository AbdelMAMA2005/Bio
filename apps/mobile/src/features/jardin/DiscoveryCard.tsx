import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { PlantPhoto } from '@/components/PlantPhoto';
import { RarityBadge } from '@/components/RarityBadge';
import { ownPhotoUrl, type HerbariumDiscovery } from '@/api/types';
import { formatRelativeDate } from '@/utils/format';
import type { SupportedLanguage } from '@/i18n';
import { useAppTheme } from '@/theme';
import { RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  discovery: HerbariumDiscovery;
  onPress: () => void;
};

export const DiscoveryCard = memo(function DiscoveryCard({ discovery, onPress }: Props) {
  const { i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { plant, item, placeLabel } = discovery;
  const photoUrl = ownPhotoUrl(item);
  const rarityPalette = (isDark ? RarityColors : RarityColorsLight)[plant.rarete];

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={[styles.thumb, { backgroundColor: rarityPalette.bg }]}>
        <PlantPhoto
          ownPhotoUrl={photoUrl}
          catalogUrl={plant.urlImage}
          icon={plant.icon}
          iconSize={40}
          iconColor={rarityPalette.text}
        />
        <View style={styles.badgeWrap}>
          <RarityBadge rarete={plant.rarete} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {plant.nomCommun}
        </Text>
        <View style={styles.metaRow}>
          <Icon name="location_on" size={12} color={colors.active} />
          <Text style={[styles.metaLabel, { color: colors.muted }]} numberOfLines={1}>
            {placeLabel}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="schedule" size={12} color={colors.muted} />
          <Text style={[styles.metaLabel, { color: colors.muted }]} numberOfLines={1}>
            {formatRelativeDate(item.dateAjout, (i18n.language as SupportedLanguage) ?? 'fr')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  thumb: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  body: {
    padding: Spacing.sm,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
  },
});
