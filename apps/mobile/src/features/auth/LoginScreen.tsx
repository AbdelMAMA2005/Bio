import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { LegalLinks } from '@/components/LegalLinks';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useGoogleSignIn } from '@/features/auth/googleAuth';
import { isEmailNotConfirmed } from '@/features/auth/authApi';
import { authErrorMessage } from '@/features/auth/authError';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

export function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { login, loginWithGoogle, resendConfirmationCode, isBusy } = useAuth();
  const { signIn: googleSignIn, isConfigured } = useGoogleSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('auth.emptyEmail'));
      return;
    }
    if (!password) {
      setError(t('auth.emptyPassword'));
      return;
    }
    try {
      await login(trimmedEmail, password);
      router.replace('/jardin');
    } catch (e) {
      // Inscription jamais confirmée : on renvoie un code et on ouvre l'écran de saisie.
      if (isEmailNotConfirmed(e)) {
        await resendConfirmationCode(trimmedEmail).catch(() => undefined);
        router.push({ pathname: '/confirm-email', params: { email: trimmedEmail } });
        return;
      }
      console.error('[handleLogin] échec de la connexion', e);
      const message = authErrorMessage(e, t('auth.genericError'));
      const isInvalidCredentials = message.toLowerCase().includes('invalid login credentials');
      setError(isInvalidCredentials ? `${message}. ${t('auth.loginAccountHint')}` : message);
    }
  };

  const handleGoogle = async () => {
    if (!isConfigured) return; // bouton désactivé dans ce cas, voir plus bas.
    setError(null);
    try {
      const idToken = await googleSignIn();
      if (!idToken) return; // annulé par l'utilisateur

      await loginWithGoogle(idToken);
      router.replace('/jardin');
    } catch (e) {
      console.error('[handleGoogle] échec de la connexion Google', e);
      setError(authErrorMessage(e, t('auth.genericError')));
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
          autoCapitalize="none"
          autoCorrect={false}
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

        <Pressable
          hitSlop={8}
          style={styles.forgotWrap}
          onPress={() => router.push({ pathname: '/forgot-password', params: email.trim() ? { email: email.trim() } : {} })}>
          <Text style={[styles.forgot, { color: colors.active }]}>{t('auth.forgotPassword')}</Text>
        </Pressable>

        <PrimaryButton label={t('auth.loginCta')} onPress={handleLogin} loading={isBusy} />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
          <Text style={[styles.dividerLabel, { color: colors.muted }]}>{t('auth.or')}</Text>
          <View style={[styles.divider, { backgroundColor: colors.hairline }]} />
        </View>

        <SecondaryButton
          label={isConfigured ? t('auth.continueWithGoogle') : t('auth.googleUnavailable')}
          icon="google"
          onPress={handleGoogle}
          loading={isBusy}
          disabled={!isConfigured}
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
      <LegalLinks />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: FontFamily.display,
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
    color: '#c8504a',
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
