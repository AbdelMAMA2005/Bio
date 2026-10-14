import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/theme';
import { RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import type { Rarete } from '@planai/shared';

type Props = {
  rarete: Rarete;
};

export function RarityBadge({ rarete }: Props) {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const palette = (isDark ? RarityColors : RarityColorsLight)[rarete];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.text }]}>{t(`rarity.${rarete}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
