import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

import { IconSets, type IconName } from '@/theme/icons';

type Props = {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 20, color, style }: Props) {
  const spec = IconSets[name];
  if (spec.set === 'MaterialCommunityIcons') {
    return (
      <MaterialCommunityIcons
        name={spec.name as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return (
    <MaterialIcons
      name={spec.name as React.ComponentProps<typeof MaterialIcons>['name']}
      size={size}
      color={color}
      style={style}
    />
  );
}
