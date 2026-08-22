import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '@/components/GradientButton';
import { TextField } from '@/components/TextField';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

export function GoogleUsernameScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { user, setUsername, checkUsernameAvailability, isBusy } = useAuth();
  const router = useRouter();
  const [username, setUsernameDraft] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setError(null);
    const value = username.trim();
    if (value.length < 3) {
      setError(t('auth.usernameInvalid') || 'Choisissez un username valide.');
      return;
    }
    setChecking(true);
    try {
      const result = await checkUsernameAvailability(value);
      if (!result.available) {
        setSuggestions(result.suggestions);
        setError('Ce username est déjà pris.');
        return;
      }
      await setUsername(value);
      router.replace('/jardin');
    } catch (caught: any) {
      setError(caught?.message || t('auth.genericError') || 'Une erreur est survenue.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthScreenLayout>
      <Text style={[styles.title, { color: colors.text }]}>Choisissez votre username</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>Bonjour {user?.fullName || user?.email}. Ce choix sera définitif.</Text>
      <View style={styles.form}>
        <TextField icon="person" placeholder="@username" value={username} onChangeText={setUsernameDraft} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {suggestions.map((suggestion) => (
          <Text key={suggestion} style={[styles.suggestion, { color: colors.active }]} onPress={() => setUsernameDraft(suggestion)}>{suggestion}</Text>
        ))}
        <GradientButton label="Valider mon username" onPress={submit} loading={isBusy || checking} />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FontFamily.extraBold, fontSize: 24, textAlign: 'center' },
  subtitle: { fontFamily: FontFamily.regular, fontSize: 13, textAlign: 'center', marginTop: Spacing.xs },
  form: { marginTop: Spacing.xl, gap: Spacing.md },
  error: { color: '#d24744', fontFamily: FontFamily.semiBold, fontSize: 13 },
  suggestion: { fontFamily: FontFamily.semiBold, fontSize: 14, paddingVertical: Spacing.xs },
});