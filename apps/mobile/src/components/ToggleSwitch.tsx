import { Switch } from 'react-native';

import { useAppTheme } from '@/theme';
import { Accent } from '@/theme/colors';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function ToggleSwitch({ value, onValueChange }: Props) {
  const { colors, isDark } = useAppTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.chip, true: Accent }}
      thumbColor={value ? '#ffffff' : isDark ? colors.muted : '#ffffff'}
      ios_backgroundColor={colors.chip}
    />
  );
}
