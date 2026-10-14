import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppLogo } from '@/components/AppLogo';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';

type Props = {
  /** true once boot is finished and the min display time has elapsed: triggers the fade-out. */
  ready: boolean;
  onFinished: () => void;
};

/** Écran de démarrage sobre : un fondu d'entrée et de sortie, sans rebond ni boucle. */
export function AnimatedSplashScreen({ ready, onFinished }: Props) {
  const { colors } = useAppTheme();
  const entrance = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    entrance.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    exitOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onFinished)();
    });
  }, [ready, exitOpacity, onFinished]);

  const contentStyle = useAnimatedStyle(() => ({ opacity: entrance.value }));
  const containerStyle = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.screen }, containerStyle]}>
      <Animated.View style={[styles.content, contentStyle]}>
        <AppLogo size={72} />
        <Text style={[styles.title, { color: colors.text }]}>PlanAI</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 26,
    letterSpacing: -0.3,
  },
});
