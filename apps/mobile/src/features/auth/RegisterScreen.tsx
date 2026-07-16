import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '@/components/GradientButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { register, isBusy } = useAuth();
  const router = useRouter();

  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    try {
      await register(pseudo.trim(), email.trim(), password);
      router.replace('/jardin');
    } catch {
      setError(t('auth.invalidFields'));
    }
  };

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.registerTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>{t('auth.registerSubtitle')}</Text>

      <View style={styles.form}>
        <TextField
          icon="person"
          placeholder={t('auth.pseudoPlaceholder')}
          value={pseudo}
          onChangeText={setPseudo}
        />
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
        <TextField
          icon="shield_lock"
          isPassword
          placeholder={t('auth.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <GradientButton label={t('auth.registerCta')} onPress={handleRegister} loading={isBusy} />
      </View>

      <View style={styles.footerRow}>
        <Text style={{ color: colors.muted, fontFamily: FontFamily.regular, fontSize: 13 }}>
          {t('auth.haveAccount')}{' '}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={8}>
            <Text style={[styles.footerLink, { color: colors.active }]}>{t('auth.signIn')}</Text>
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
