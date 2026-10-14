import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import type { IconName } from '@/theme/icons';
import { FontFamily } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SecondaryButton({ label, onPress, icon, loading, disabled, destructive, style }: Props) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const color = destructive ? '#c8504a' : colors.soft;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.pressable,
        {
          backgroundColor: destructive ? 'rgba(200,80,74,0.08)' : colors.surface,
          borderColor: destructive ? 'rgba(200,80,74,0.35)' : colors.border,
        },
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={color} /> : null}
          <Text style={[styles.label, { color, fontFamily: destructive ? FontFamily.bold : FontFamily.semiBold }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: HitTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 13,
  },
});
