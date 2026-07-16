import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AccentGradient, AccentOnColor } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Props = {
  initial: string;
  size?: number;
  onPress?: () => void;
};

export function AvatarBadge({ initial, size = 42, onPress }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6}>
      <LinearGradient
        colors={AccentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial.toUpperCase()}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: AccentOnColor,
    fontFamily: FontFamily.extraBold,
  },
});
