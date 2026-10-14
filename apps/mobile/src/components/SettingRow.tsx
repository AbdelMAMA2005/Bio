import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { HitTarget, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  icon: IconName;
  label: string;
  hint?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showBorder?: boolean;
};

export function SettingRow({ icon, label, hint, trailing, onPress, destructive, showBorder }: Props) {
  const { colors } = useAppTheme();
  const color = destructive ? '#c8504a' : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, showBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline }]}>
      <View style={[styles.iconWrap, { backgroundColor: destructive ? 'rgba(200,80,74,0.12)' : colors.chip }]}>
        <Icon name={icon} size={19} color={destructive ? '#c8504a' : '#4e9a5e'} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: HitTarget + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    marginTop: 1,
  },
});
