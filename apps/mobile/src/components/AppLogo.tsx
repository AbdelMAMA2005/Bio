import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Accent, AccentOnColor } from '@/theme/colors';

type Props = {
  size?: number;
};

export function AppLogo({ size = 64 }: Props) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Icon name="eco" size={size * 0.55} color={AccentOnColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
