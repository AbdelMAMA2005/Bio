import { Link, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GradientButton } from '@/components/GradientButton';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthScreenLayout } from '@/features/auth/AuthScreenLayout';
import { useGoogleSignIn } from '@/features/auth/googleAuth';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { register, loginWithGoogle, isBusy, checkUsernameAvailability } = useAuth();
  const { signIn: googleSignIn, isConfigured } = useGoogleSignIn();
  const router = useRouter();

  // Navigation multi-étapes
  const [step, setStep] = useState<1 | 2>(1);

  // État Formulaire - Étape 1 : Identité
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // État Formulaire - Étape 2 : Sécurité
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Gestion des erreurs
  const [error, setError] = useState<string | null>(null);

  // Formatage du username lors de la saisie
  const handleUsernameChange = (text: string) => {
    const formatted = text.replace(/^@+/, '@');
    const finalUsername = formatted.startsWith('@') || formatted === '' ? formatted : `@${formatted}`;

    setUsername(finalUsername);
    setError(null);
    setSuggestions([]);
  };

  // Sélection d'une suggestion
  const handleSelectSuggestion = (suggestedUsername: string) => {
    setUsername(suggestedUsername);
    setSuggestions([]);
    setError(null);
  };

  // Validation au clic sur "Continuer"
  const handleNextStep = async () => {
    setError(null);
    setSuggestions([]);

    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();

    if (!cleanFullName) {
      setError(t('auth.fullNameRequired') || 'Veuillez entrer votre nom complet.');
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setError(t('auth.usernameInvalid') || 'Le nom d\'utilisateur doit contenir au moins 3 caractères.');
      return;
    }

    setIsCheckingUsername(true);

    try {
      const res = await checkUsernameAvailability(cleanUsername);

      if (res.available) {
        setStep(2);
      } else {
        setError('Ce nom d\'utilisateur est déjà pris. Veuillez en choisir un autre.');
        if (res.suggestions && res.suggestions.length > 0) {
          setSuggestions(res.suggestions);
        }
      }
    } catch {
      setError(t('auth.genericError') || 'Impossible de vérifier la disponibilité du nom d\'utilisateur.');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRegister = async () => {
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError(t('auth.invalidEmail') || 'Veuillez entrer une adresse email valide.');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, dont 1 lettre et 1 chiffre.');
      return;
    }

    try {
      await register(fullName.trim(), username.trim(), email.trim(), password);
      router.replace('/jardin');
    } catch (err: any) {
      setError(err?.message || t('auth.genericError') || 'Une erreur est survenue.');
    }
  };

  const handleGoogle = async () => {
    if (!isConfigured) return;
    setError(null);
    try {
      const idToken = await googleSignIn();
      if (!idToken) return;
      const needsUsername = await loginWithGoogle(idToken);
      router.replace(needsUsername ? '/google-username' : '/jardin');
    } catch (err: any) {
      setError(err?.message || t('auth.genericError') || 'Une erreur est survenue.');
    }
  };

  return (
    <AuthScreenLayout
      title={step === 1 ? (t('auth.registerTitle') || 'Créer un compte') : (t('auth.securityTitle') || 'Sécurité & Accès')}
      subtitle={
        step === 1
          ? (t('auth.registerSubtitle') || 'Étape 1 sur 2 : Vos informations')
          : (t('auth.securitySubtitle') || 'Étape 2 sur 2 : Vos identifiants')
      }
    >
      {/* Barre d'avancement des étapes */}
      <View style={styles.stepIndicatorContainer}>
        <View style={[styles.stepBar, { backgroundColor: colors.active }]} />
        <View style={[styles.stepBar, { backgroundColor: step === 2 ? colors.active : colors.border }]} />
      </View>

      {/* Message d'erreur global */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#d24744' + '1A', borderColor: '#d24744' + '40' }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#d24744" />
          <Text style={[styles.errorText, { color: '#d24744' }]}>{error}</Text>
        </View>
      )}

      {step === 1 ? (
        /* ÉTAPE 1 : IDENTITÉ */
        <View style={styles.formContainer}>
          <TextField
            label={t('auth.fullNameLabel') || 'Votre nom complet'}
            icon="person"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              setError(null);
            }}
            placeholder="Ex: Jean Dupont"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <View style={styles.inputGroup}>
            <TextField
              label={t('auth.usernameLabel') || 'Nom d\'utilisateur (@username)'}
              icon="edit"
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="@jean.dupont"
              autoCapitalize="none"
              returnKeyType="done"
              autoCorrect={false}
            />
          </View>

          {/* Suggestions si le username est déjà pris */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsTitle, { color: colors.muted }]}>
                Suggestions disponibles :
              </Text>
              <View style={styles.chipRow}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.7}
                    style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Text style={[styles.chipText, { color: colors.active }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <GradientButton
            label="Continuer"
            onPress={handleNextStep}
            loading={isCheckingUsername}
            style={styles.singleActionButton}
          />
        </View>
      ) : (
        /* ÉTAPE 2 : SÉCURITÉ */
        <View style={styles.formContainer}>
          <TextField
            label={t('auth.emailLabel') || 'Adresse email'}
            icon="mail"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            placeholder="jean.dupont@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />

          <TextField
            label={t('auth.passwordLabel') || 'Mot de passe'}
            icon="lock"
            isPassword
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            placeholder="Min 8 car., 1 lettre, 1 chiffre"
            returnKeyType="done"
          />

          {/* Ligne d'actions (Retour + S'inscrire) */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={[styles.backButton, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[styles.backText, { color: colors.text }]}>Retour</Text>
            </TouchableOpacity>

            <GradientButton
              label="S'inscrire"
              onPress={handleRegister}
              loading={isBusy}
              style={styles.flexActionButton}
            />
          </View>

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Option Social Login */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!isConfigured}
            style={[
              styles.googleButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !isConfigured && styles.googleButtonDisabled,
            ]}
            onPress={handleGoogle}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              {isConfigured ? 'Continuer avec Google' : 'Connexion Google indisponible'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer (Lien de connexion) */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.muted }]}>
          Vous avez déjà un compte ?{' '}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.footerLink, { color: colors.active }]}>
              Se connecter
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  stepIndicatorContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  formContainer: {
    gap: Spacing.md,
  },
  inputGroup: {
    position: 'relative',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    marginTop: -Spacing.xs,
    gap: Spacing.xs,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    flex: 1,
  },
  singleActionButton: {
    marginTop: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  backText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  flexActionButton: {
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  googleButtonDisabled: {
    opacity: 0.5,
  },
  googleButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
  },
  footerLink: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
});