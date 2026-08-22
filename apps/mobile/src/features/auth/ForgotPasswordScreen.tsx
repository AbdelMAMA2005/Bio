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

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { forgotPassword, isBusy } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleForgotPassword = async () => {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError(t('auth.emailRequired') || 'Veuillez entrer votre email');
      return;
    }

    try {
      const result = await forgotPassword(email.trim());
      setMessage(result.message);
      setIsSubmitted(true);
    } catch (err: any) {
      if (err instanceof Error && err.message && err.message !== 'Network Error') {
        setError(err.message);
      } else {
        setError(t('auth.forgotPasswordError') || 'Erreur lors de la demande de réinitialisation');
      }
    }
  };

  if (isSubmitted) {
    return (
      <AuthScreenLayout>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('auth.checkYourEmail') || 'Vérifiez votre email'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {message || 'Si un compte avec cet email existe, vous recevrez un lien de réinitialisation.'}
        </Text>

        <View style={styles.form}>
          <GradientButton
            label={t('auth.backToLogin') || 'Retour à la connexion'}
            onPress={() => router.back()}
          />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('auth.forgotPasswordTitle') || 'Mot de passe oublié'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {t('auth.forgotPasswordSubtitle') ||
          'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.'}
      </Text>

      <View style={styles.form}>
        <TextField
          icon="mail"
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <GradientButton
          label={t('auth.sendResetLink') || 'Envoyer le lien'}
          onPress={handleForgotPassword}
          loading={isBusy}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={{ color: colors.muted, fontFamily: FontFamily.regular, fontSize: 13 }}>
          {t('auth.rememberPassword') || 'Vous vous souvenez de votre mot de passe? '}{' '}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={8}>
            <Text style={[styles.footerLink, { color: colors.active }]}>
              {t('auth.signIn') || 'Se connecter'}
            </Text>
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
