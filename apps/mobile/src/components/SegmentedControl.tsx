import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: IconName;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
};

export function SegmentedControl<T extends string>({ options, value, onChange, fullWidth }: Props<T>) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.chip }, fullWidth && styles.fullWidth]}>
      {options.map((option) => {
        const active = option.value === value;
        const color = active ? colors.active : colors.muted;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              fullWidth && styles.optionFlex,
              { backgroundColor: active ? colors.tabBar : 'transparent' },
              active && styles.optionActiveShadow,
            ]}>
            {option.icon ? <Icon name={option.icon} size={15} color={color} /> : null}
            <Text style={[styles.label, { color }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: Radius.lg,
    padding: 4,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  optionFlex: {
    flex: 1,
    justifyContent: 'center',
  },
  optionActiveShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
  },
});
