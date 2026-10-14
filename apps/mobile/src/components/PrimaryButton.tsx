import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Accent, AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Action principale d'un écran : vert forêt plein, angles nets, sans ombre ni dégradé. */
export function PrimaryButton({ label, onPress, loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, isDisabled && styles.disabled, style]}>
      {loading ? <ActivityIndicator color={AccentOnColor} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: HitTarget + 4,
    borderRadius: Radius.md,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: AccentOnColor,
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
});
