import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AppLogo } from '@/components/AppLogo';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';

type Props = {
  /** true once boot is finished and the min display time has elapsed: triggers the fade-out. */
  ready: boolean;
  onFinished: () => void;
};

function Dot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.25, { duration: 420 })), -1, false),
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function AnimatedSplashScreen({ ready, onFinished }: Props) {
  const { colors } = useAppTheme();
  const entrance = useSharedValue(0);
  const pulse = useSharedValue(1);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    entrance.value = withSpring(1, { damping: 11, stiffness: 120 }, (finished) => {
      if (finished) {
        pulse.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    exitOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) runOnJS(onFinished)();
    });
  }, [ready, exitOpacity, onFinished]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: entrance.value * pulse.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 10 }],
  }));
  const containerStyle = useAnimatedStyle(() => ({ opacity: exitOpacity.value }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.screen }, containerStyle]}>
      <Animated.View style={logoStyle}>
        <AppLogo size={88} />
      </Animated.View>
      <Animated.Text style={[styles.title, { color: colors.text }, textStyle]}>PlanAI</Animated.Text>
      <View style={styles.dotsRow}>
        <Dot delay={0} color={colors.muted} />
        <Dot delay={140} color={colors.muted} />
        <Dot delay={280} color={colors.muted} />
      </View>
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
    gap: 14,
    zIndex: 100,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
