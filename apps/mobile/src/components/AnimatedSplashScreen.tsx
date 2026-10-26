import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { Accent, AccentOnColor } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

const LOGO_SIZE = 72;
const ease = Easing.out(Easing.cubic);

/** Durée de l'animation d'entrée : BootGate garde l'écran au moins aussi longtemps. */
export const SPLASH_ENTRANCE_MS = 1100;

type Props = {
  /** true once boot is finished and the min display time has elapsed: triggers the fade-out. */
  ready: boolean;
  onFinished: () => void;
};

/**
 * Écran de démarrage : la tuile du logo s'installe, la feuille « pousse » (elle grandit en se
 * redressant), puis le nom monte en fondu. Une seule fois, sans rebond ni boucle ; un simple
 * fondu si l'appareil demande de réduire les animations.
 */
export function AnimatedSplashScreen({ ready, onFinished }: Props) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const tile = useSharedValue(reduceMotion ? 1 : 0);
  const leaf = useSharedValue(reduceMotion ? 1 : 0);
  const title = useSharedValue(reduceMotion ? 1 : 0);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    tile.set(withTiming(1, { duration: 420, easing: ease }));
    leaf.set(withDelay(260, withTiming(1, { duration: 560, easing: ease })));
    title.set(withDelay(620, withTiming(1, { duration: 420, easing: ease })));
  }, [reduceMotion, tile, leaf, title]);

  useEffect(() => {
    if (!ready) return;
    exitOpacity.set(withTiming(0, { duration: 280 }, (finished) => {
      if (finished) scheduleOnRN(onFinished);
    }));
  }, [ready, exitOpacity, onFinished]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: tile.value,
    transform: [{ scale: 0.86 + 0.14 * tile.value }],
  }));
  const leafStyle = useAnimatedStyle(() => ({
    opacity: leaf.value,
    transform: [{ rotate: `${-24 * (1 - leaf.value)}deg` }, { scale: 0.4 + 0.6 * leaf.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ translateY: 8 * (1 - title.value) }],
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.screen }, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.tile, tileStyle]}>
          <Animated.View style={leafStyle}>
            <Icon name="eco" size={LOGO_SIZE * 0.55} color={AccentOnColor} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text style={[styles.title, { color: colors.text }]}>PlanAI</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: 14,
  },
  // Mêmes dimensions que AppLogo, pour enchaîner sans saut avec les écrans d'accueil.
  tile: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.22,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 26,
    letterSpacing: -0.3,
  },
});
