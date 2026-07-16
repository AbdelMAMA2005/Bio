import { Switch } from 'react-native';

import { useAppTheme } from '@/theme';

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
      trackColor={{ false: colors.chip, true: '#4ade80' }}
      thumbColor={value ? '#a3e635' : isDark ? colors.muted : '#ffffff'}
      ios_backgroundColor={colors.chip}
    />
  );
}
