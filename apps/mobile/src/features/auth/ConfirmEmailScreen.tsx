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

export function ConfirmEmailScreen({ email }: { email: string }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { confirmEmail, resendConfirmationCode, isBusy } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_DELAY_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleConfirm = async () => {
    setError(null);
    setInfo(null);
    if (code.length < CODE_MIN_LENGTH) {
      setError(t('auth.confirmCodeIncomplete'));
      return;
    }
    try {
      await confirmEmail(email, code);
      router.replace('/jardin');
    } catch {
      setError(t('auth.confirmCodeInvalid'));
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    try {
      await resendConfirmationCode(email);
      setInfo(t('auth.confirmCodeResent'));
    } catch {
      setError(t('auth.confirmCodeResendError'));
    } finally {
      setResendIn(RESEND_DELAY_SECONDS);
    }
  };

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.confirmTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>{t('auth.confirmSubtitle', { email })}</Text>

      <View style={styles.form}>
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

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={[styles.info, { color: colors.active }]}>{info}</Text> : null}

        <PrimaryButton label={t('auth.confirmCta')} onPress={handleConfirm} loading={isBusy} />

        <Pressable onPress={handleResend} disabled={resendIn > 0} hitSlop={8} style={styles.resend}>
          <Text style={[styles.resendLabel, { color: resendIn > 0 ? colors.muted : colors.active }]}>
            {resendIn > 0 ? t('auth.confirmResendIn', { seconds: resendIn }) : t('auth.confirmResend')}
          </Text>
        </Pressable>
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
