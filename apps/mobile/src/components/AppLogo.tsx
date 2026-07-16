import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { AccentGradient, AccentOnColor } from '@/theme/colors';

type Props = {
  size?: number;
};

export function AppLogo({ size = 64 }: Props) {
  return (
    <LinearGradient
      colors={AccentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size * 0.32 },
      ]}>
      <Icon name="eco" size={size * 0.55} color={AccentOnColor} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
