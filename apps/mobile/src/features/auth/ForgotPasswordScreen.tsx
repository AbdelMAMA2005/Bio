import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { CODE_MAX_LENGTH, CODE_MIN_LENGTH, RESEND_DELAY_SECONDS, normalizeCode } from '@/features/auth/otp';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Même règle qu'à l'inscription. */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Mot de passe oublié en deux étapes : l'adresse (un code est envoyé par e-mail), puis le
 * code et le nouveau mot de passe. Le message d'envoi est le même que le compte existe ou
 * non, pour ne pas révéler quelles adresses sont inscrites.
 */
export function ForgotPasswordScreen({ initialEmail = '' }: { initialEmail?: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { requestPasswordReset, resetPassword, isBusy } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setSending(true);
    try {
      await requestPasswordReset(trimmed);
      setEmail(trimmed);
      setStep('code');
      setInfo(t('auth.resetCodeSent', { email: trimmed }));
    } catch {
      setError(t('auth.resetSendError'));
    } finally {
      setSending(false);
      setResendIn(RESEND_DELAY_SECONDS);
    }
  };

  const submitNewPassword = async () => {
    setError(null);
    setInfo(null);
    if (code.length < CODE_MIN_LENGTH) return setError(t('auth.confirmCodeIncomplete'));
    if (password.length < PASSWORD_MIN_LENGTH) return setError(t('auth.passwordTooShort'));
    if (password !== confirmPassword) return setError(t('auth.passwordMismatch'));
    try {
      await resetPassword(email, code, password);
      router.replace('/jardin');
    } catch (e) {
      const message = typeof e === 'object' && e !== null && 'message' in e ? String(e.message) : '';
      setError(/different from the old password/i.test(message) ? t('auth.resetSamePassword') : t('auth.resetInvalid'));
    }
  };

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.resetTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {step === 'email' ? t('auth.resetSubtitle') : t('auth.resetCodeSubtitle')}
      </Text>

      <View style={styles.form}>
        {step === 'email' ? (
          <>
            <TextField
              icon="mail"
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t('auth.resetSendCta')} onPress={sendCode} loading={sending} />
          </>
        ) : (
          <>
            {info ? <Text style={[styles.info, { color: colors.active }]}>{info}</Text> : null}
            <TextField
              icon="shield_lock"
              placeholder={t('auth.confirmCodePlaceholder')}
              value={code}
              onChangeText={(value) => setCode(normalizeCode(value))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_MAX_LENGTH + 4}
              style={styles.codeInput}
              accessibilityLabel={t('auth.confirmCodePlaceholder')}
            />
            <TextField
              icon="lock"
              isPassword
              placeholder={t('auth.newPasswordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              textContentType="newPassword"
            />
            <TextField
              icon="shield_lock"
              isPassword
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              textContentType="newPassword"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={t('auth.resetCta')} onPress={submitNewPassword} loading={isBusy} />
            <Pressable onPress={sendCode} disabled={resendIn > 0 || sending} hitSlop={8} style={styles.resend}>
              <Text style={[styles.resendLabel, { color: resendIn > 0 ? colors.muted : colors.active }]}>
                {resendIn > 0 ? t('auth.confirmResendIn', { seconds: resendIn }) : t('auth.confirmResend')}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.footerRow}>
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={8}>
            <Text style={[styles.footerLink, { color: colors.active }]}>{t('auth.backToLogin')}</Text>
          </Pressable>
        </Link>
      </View>
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
  codeInput: {
    fontFamily: FontFamily.numericBold,
    fontSize: 20,
    letterSpacing: 6,
  },
  error: {
    color: '#c8504a',
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
  },
  info: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
  },
  resend: {
    alignSelf: 'center',
    padding: Spacing.xs,
  },
  resendLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
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
