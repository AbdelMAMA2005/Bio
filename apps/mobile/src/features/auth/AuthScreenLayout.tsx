import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/AppLogo';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function AuthScreenLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { colors } = useAppTheme();

  return (
    <LinearGradient colors={colors.backdropGradient} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.fill}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.logoWrap}>
              <AppLogo size={72} />
            </View>
            {title ? (
              <View style={styles.headerWrap}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: colors.muted }]}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerWrap: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
});