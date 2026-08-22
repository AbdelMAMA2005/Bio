import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, Text, type TextInputProps } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = TextInputProps & {
  icon?: IconName;
  isPassword?: boolean;
  label?: string;
};

export function TextField({ icon, isPassword, label, style, ...inputProps }: Props) {
  const { colors } = useAppTheme();
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
      )}
      <View style={[styles.container, { backgroundColor: colors.chip, borderColor: colors.hairline }]}>
        {icon && <Icon name={icon} size={19} color={colors.muted} />}
        <TextInput
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          style={[styles.input, { color: colors.text }, style]}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable hitSlop={8} onPress={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'visibility_off' : 'visibility'} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  container: {
    minHeight: HitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    paddingVertical: Spacing.sm,
  },
});
