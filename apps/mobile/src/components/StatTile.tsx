import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  icon: IconName;
  value: string | number;
  label: string;
  iconColor?: string;
};

export function StatTile({ icon, value, label, iconColor }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <Icon name={icon} size={22} color={iconColor ?? '#4e9a5e'} />
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  value: {
    fontFamily: FontFamily.numericBold,
    fontSize: 17,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
  },
});
