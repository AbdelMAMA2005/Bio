import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '@/components/GradientButton';
import { LegalLinks } from '@/components/LegalLinks';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/authError';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

/** Pseudo : lettres (y compris accentuées), chiffres et underscores, 3–20 caractères */
const PSEUDO_REGEX = /^[a-zA-ZÀ-ÿ0-9_]{3,20}$/;
/** Email : vérification basique de format */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  /**
   * Valide les champs dans l'ordre : pseudo → email → mot de passe → confirmation.
   * Retourne le premier message d'erreur trouvé, ou null si tout est valide.
   */
  const validate = (): string | null => {
    const trimmedPseudo = pseudo.trim();
    const trimmedEmail = email.trim();

    if (!trimmedPseudo) return t('auth.emptyPseudo');
    if (trimmedPseudo.length < 3) return t('auth.pseudoTooShort');
    if (trimmedPseudo.length > 20) return t('auth.pseudoTooLong');
    if (!PSEUDO_REGEX.test(trimmedPseudo)) return t('auth.pseudoInvalidChars');

    if (!trimmedEmail) return t('auth.emptyEmail');
    if (!EMAIL_REGEX.test(trimmedEmail)) return t('auth.invalidEmail');

    if (!password) return t('auth.emptyPassword');
    if (password.length < 8) return t('auth.passwordTooShort');

    if (password !== confirmPassword) return t('auth.passwordMismatch');

    return null;
  };

  const handleRegister = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await register(pseudo.trim(), email.trim(), password);
      router.replace('/jardin');
    } catch (e) {
      const message = authErrorMessage(e, t('auth.registerError'));
      if (message.toLowerCase().includes('email confirmation required')) {
        setError(t('auth.confirmEmailAfterRegister'));
      } else {
        setError(message);
      }
    }
  };

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.registerTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>{t('auth.registerSubtitle')}</Text>

      <View style={styles.form}>
        {/* Champ pseudo avec aide de format visible en permanence */}
        <View style={styles.fieldWrapper}>
          <TextField
            icon="person"
            placeholder={t('auth.pseudoPlaceholder')}
            value={pseudo}
            onChangeText={setPseudo}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={[styles.hint, { color: colors.muted }]}>{t('auth.pseudoHint')}</Text>
        </View>

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
      <LegalLinks />
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
  fieldWrapper: {
    gap: 4,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    marginLeft: 4,
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


