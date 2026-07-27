import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  title: string;
  subtitle: string;
  variant?: 'success' | 'error';
};

export function ScanToast({ title, subtitle, variant = 'success' }: Props) {
  const { colors } = useAppTheme();
  const entrance = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, { duration: 260 });
  }, [entrance]);

  const style = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * -14 }],
  }));

  const iconColor = variant === 'error' ? '#d24744' : colors.active;

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none">
      <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.chip }]}>
          <Icon name={variant === 'error' ? 'error' : 'check_circle'} size={20} color={iconColor} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
  },
});
