import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { HitTarget } from '@/theme/spacing';

type Props = {
  icon: IconName;
  onPress?: () => void;
  variant?: 'glass' | 'surface';
  size?: number;
  color?: string;
};

export function CircleIconButton({ icon, onPress, variant = 'surface', size = HitTarget, color }: Props) {
  const { colors, isDark } = useAppTheme();
  const iconColor = color ?? (variant === 'glass' ? '#f0f7f2' : colors.text);

  if (variant === 'glass') {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          <View style={styles.glassBorder}>
            <Icon name={icon} size={size * 0.5} color={iconColor} />
          </View>
        </BlurView>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}>
      <Icon name={icon} size={size * 0.5} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glassBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
