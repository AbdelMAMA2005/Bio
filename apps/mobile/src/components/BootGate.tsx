import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedSplashScreen } from '@/components/AnimatedSplashScreen';

const MIN_SPLASH_DURATION_MS = 1500;

type Props = {
  appReady: boolean;
  children: ReactNode;
};

export function BootGate({ appReady, children }: Props) {
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [bootStartedAt] = useState(() => Date.now());
  const nativeSplashHiddenRef = useRef(false);

  useEffect(() => {
    if (appReady && !nativeSplashHiddenRef.current) {
      nativeSplashHiddenRef.current = true;
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  useEffect(() => {
    const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - (Date.now() - bootStartedAt));
    const timer = setTimeout(() => setMinDurationElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [bootStartedAt]);

  return (
    <View style={styles.fill}>
      {children}
      {overlayVisible ? (
        <AnimatedSplashScreen
          ready={appReady && minDurationElapsed}
          onFinished={() => setOverlayVisible(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
