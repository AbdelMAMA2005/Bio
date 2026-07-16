import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '@/components/GradientButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useGoogleAuthRequest } from '@/features/auth/googleAuth';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

export function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { login, loginWithGoogle, isBusy } = useAuth();
  const { promptAsync, isConfigured } = useGoogleAuthRequest();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/jardin');
    } catch {
      setError(t('auth.invalidCredentials'));
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      // Sans EXPO_PUBLIC_GOOGLE_CLIENT_ID, on simule directement le retour OAuth.
      if (isConfigured) await promptAsync();
      await loginWithGoogle();
      router.replace('/jardin');
    } catch {
      setError(t('auth.genericError'));
    }
  };

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>{t('auth.loginSubtitle')}</Text>

      <View style={styles.form}>
        <TextField
          icon="mail"
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          icon="lock"
          isPassword
          placeholder={t('auth.passwordPlaceholder')}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable hitSlop={8} style={styles.forgotWrap}>
          <Text style={[styles.forgot, { color: colors.active }]}>{t('auth.forgotPassword')}</Text>
        </Pressable>

        <GradientButton label={t('auth.loginCta')} onPress={handleLogin} loading={isBusy} />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
          <Text style={[styles.dividerLabel, { color: colors.muted }]}>{t('auth.or')}</Text>
          <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        </View>

        <SecondaryButton
          label={t('auth.continueWithGoogle')}
          icon="google"
          onPress={handleGoogle}
          loading={isBusy}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={{ color: colors.muted, fontFamily: FontFamily.regular, fontSize: 13 }}>
          {t('auth.noAccount')}{' '}
        </Text>
        <Link href="/(auth)/register" asChild>
          <Pressable hitSlop={8}>
            <Text style={[styles.footerLink, { color: colors.active }]}>{t('auth.createAccount')}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
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
  form: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  error: {
    color: '#d24744',
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  forgot: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerLink: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
});
