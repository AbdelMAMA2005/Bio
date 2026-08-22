import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '@/components/GradientButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { resetPassword, isBusy } = useAuth();
  const router = useRouter();
  const { email = '', token = '' } = useLocalSearchParams<{ email?: string; token?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);

    if (!newPassword.trim()) {
      setError(t('auth.passwordRequired') || 'Veuillez entrer un mot de passe');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, 1 lettre et 1 chiffre.');
      return;
    }

    try {
      const result = await resetPassword(
        decodeURIComponent(email),
        decodeURIComponent(token),
        newPassword
      );
      setMessage(result.message);
      setIsSubmitted(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      if (err instanceof Error && err.message && err.message !== 'Network Error') {
        setError(err.message);
      } else {
        setError(t('auth.resetPasswordError') || 'Erreur lors de la réinitialisation du mot de passe');
      }
    }
  };

  if (!email || !token) {
    return (
      <AuthScreenLayout>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('auth.invalidLink') || 'Lien invalide'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t('auth.invalidLinkMessage') ||
            'Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.'}
        </Text>
      </AuthScreenLayout>
    );
  }

  if (isSubmitted) {
    return (
      <AuthScreenLayout>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('auth.resetSuccess') || 'Succès!'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {message || 'Votre mot de passe a été réinitialisé avec succès. Redirection en cours...'}
        </Text>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('auth.resetPasswordTitle') || 'Réinitialiser votre mot de passe'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {t('auth.resetPasswordSubtitle') || 'Entrez votre nouveau mot de passe'}
      </Text>

      <View style={styles.form}>
        <TextField
          icon="lock"
          isPassword
          placeholder={t('auth.passwordPlaceholder')}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextField
          icon="shield_lock"
          isPassword
          placeholder={t('auth.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <GradientButton
          label={t('auth.resetPassword') || 'Réinitialiser'}
          onPress={handleResetPassword}
          loading={isBusy}
        />
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
});
