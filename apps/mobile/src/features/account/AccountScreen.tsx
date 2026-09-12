import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CircleIconButton } from '@/components/CircleIconButton';
import { GradientButton } from '@/components/GradientButton';
import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import { SectionCard } from '@/components/SectionCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SettingRow } from '@/components/SettingRow';
import { StatTile } from '@/components/StatTile';
import { TextField } from '@/components/TextField';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { useAuth } from '@/features/auth/AuthProvider';
import { levelProgress, levelTitleKey, xpTargetForLevel } from '@/features/account/levels';
import { useAccountStats } from '@/features/account/useAccountStats';
import { usePreferences } from '@/features/account/usePreferences';
import { setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { useAppTheme } from '@/theme';
import { AccentOnColor } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function AccountScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user, updateProfile, updateAvatar, changePassword, logout, deleteAccount, isBusy } = useAuth();
  const { preference, setPreference } = useAppTheme();
  const stats = useAccountStats();
  const { notifications, setNotifications, geoPrivacy, setGeoPrivacy } = usePreferences();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [pseudoDraft, setPseudoDraft] = useState(user?.pseudo ?? '');
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [deleteFormOpen, setDeleteFormOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!user) return null;

  const target = xpTargetForLevel(user.niveau);
  const progress = levelProgress(user.niveau, user.xp);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setAvatarUploading(true);
    try {
      await updateAvatar(result.assets[0].uri);
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    await updateProfile({ pseudo: pseudoDraft.trim() || user.pseudo });
    setEditingProfile(false);
  };

  const submitPasswordChange = async () => {
    setPasswordMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage(t('account.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setPasswordMessage(t('auth.invalidFields'));
    }
  };

  const confirmDelete = () => {
    setDeleteError(null);
    Alert.alert(t('account.deleteConfirmTitle'), t('account.deleteConfirmBody'), [
      { text: t('account.cancel'), style: 'cancel' },
      {
        text: t('account.deleteConfirmCta'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(deletePassword);
            router.replace('/login');
          } catch {
            setDeleteError(t('auth.invalidFields'));
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="close" onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('account.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Carte profil */}
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <View style={styles.avatarWrap}>
              <Avatar uri={user.urlAvatar} name={user.pseudo} size={72} />
              <Pressable
                onPress={pickAvatar}
                disabled={avatarUploading}
                hitSlop={6}
                style={[styles.avatarEditBadge, { backgroundColor: colors.active, borderColor: colors.surface }]}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color={AccentOnColor} />
                ) : (
                  <Icon name="camera_alt" size={14} color={AccentOnColor} />
                )}
              </Pressable>
            </View>
            {editingProfile ? (
              <View style={styles.editRow}>
                <TextField icon="person" value={pseudoDraft} onChangeText={setPseudoDraft} />
              </View>
            ) : (
              <Text style={[styles.pseudo, { color: colors.text }]}>{user.pseudo}</Text>
            )}
            <Text style={[styles.email, { color: colors.muted }]}>{user.email}</Text>
            {editingProfile ? (
              <SecondaryButton label={t('account.saveCta')} onPress={saveProfile} loading={isBusy} style={styles.editCta} />
            ) : (
              <SecondaryButton
                label={t('account.editCta')}
                icon="edit"
                onPress={() => {
                  setPseudoDraft(user.pseudo);
                  setEditingProfile(true);
                }}
                style={styles.editCta}
              />
            )}
          </View>

          {/* Niveau / XP */}
          <View style={[styles.levelCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <View style={styles.levelRow}>
              <Text style={[styles.levelLabel, { color: colors.text }]}>
                {t('account.levelLabel', { level: user.niveau, title: t(levelTitleKey(user.niveau)) })}
              </Text>
              <Text style={[styles.xpProgress, { color: colors.muted }]}>
                {t('account.xpProgress', { current: user.xp, target })}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.chip }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatTile icon="photo_camera" value={stats.captures} label={t('account.statsCaptures')} />
            <StatTile icon="eco" value={stats.species} label={t('account.statsSpecies')} />
            <StatTile icon="star" value={stats.rares} label={t('account.statsRares')} iconColor="#c084fc" />
            <StatTile icon="paid" value={stats.coins} label={t('account.statsCoins')} iconColor="#e0972a" />
          </View>

          {/* Préférences */}
          <SectionCard title={t('account.preferencesTitle')}>
            <View style={styles.preferenceBlock}>
              <Text style={[styles.preferenceLabel, { color: colors.muted }]}>{t('settings.theme')}</Text>
              <SegmentedControl
                fullWidth
                value={preference}
                onChange={(value) => setPreference(value)}
                options={[
                  { value: 'system', label: t('settings.system') },
                  { value: 'light', label: t('settings.light') },
                  { value: 'dark', label: t('settings.dark') },
                ]}
              />
            </View>
            <View style={[styles.preferenceBlock, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingTop: Spacing.md }]}>
              <Text style={[styles.preferenceLabel, { color: colors.muted }]}>{t('settings.language')}</Text>
              <SegmentedControl
                fullWidth
                value={(i18n.language as SupportedLanguage) ?? 'fr'}
                onChange={(value) => setAppLanguage(value as SupportedLanguage)}
                options={SUPPORTED_LANGUAGES.map((lang) => ({
                  value: lang,
                  label: lang.toUpperCase(),
                }))}
              />
            </View>
            <SettingRow
              icon="notifications"
              label={t('account.notifications')}
              hint={t('account.notificationsHint')}
              trailing={<ToggleSwitch value={notifications} onValueChange={setNotifications} />}
              showBorder
            />
            <SettingRow
              icon="privacy_tip"
              label={t('account.geoPrivacy')}
              hint={t('account.geoPrivacyHint')}
              trailing={<ToggleSwitch value={geoPrivacy} onValueChange={setGeoPrivacy} />}
            />
          </SectionCard>

          {/* Compte */}
          <SectionCard title={t('account.accountSectionTitle')}>
            <SettingRow
              icon="workspace_premium"
              label={t('account.myBadges')}
              hint={t('account.myBadgesHint')}
              trailing={<Icon name="chevron_right" size={20} color={colors.muted} />}
              onPress={() => router.push('/badges')}
              showBorder
            />
            <SettingRow
              icon="lock_reset"
              label={t('account.changePassword')}
              trailing={<Icon name="chevron_right" size={20} color={colors.muted} />}
              onPress={() => setPasswordFormOpen((open) => !open)}
              showBorder={passwordFormOpen}
            />
            {passwordFormOpen ? (
              <View style={[styles.passwordForm, { borderBottomColor: colors.hairline }]}>
                <TextField
                  icon="lock"
                  isPassword
                  placeholder={t('account.currentPassword')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextField
                  icon="key"
                  isPassword
                  placeholder={t('account.newPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                {passwordMessage ? (
                  <Text style={[styles.passwordMessage, { color: colors.active }]}>{passwordMessage}</Text>
                ) : null}
                <GradientButton label={t('account.updatePassword')} onPress={submitPasswordChange} loading={isBusy} />
              </View>
            ) : null}
            <SettingRow
          icon="logout"
          label={t('account.logout')}
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          showBorder
        />
            <SettingRow
              icon="delete_forever"
              label={t('account.deleteAccount')}
              destructive
              onPress={() => setDeleteFormOpen((open) => !open)}
              showBorder={deleteFormOpen}
            />
            {deleteFormOpen ? (
              <View style={[styles.passwordForm, { borderBottomColor: colors.hairline }]}>
                <TextField
                  icon="lock"
                  isPassword
                  placeholder={t('account.currentPassword')}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                />
                {deleteError ? <Text style={[styles.passwordMessage, { color: colors.active }]}>{deleteError}</Text> : null}
                <GradientButton
                  label={t('account.deleteConfirmCta')}
                  onPress={confirmDelete}
                  loading={isBusy}
                  disabled={!deletePassword}
                />
              </View>
            ) : null}
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.xxl,
    paddingVertical: Spacing.xl,
  },
  avatarWrap: {
    width: 72,
    height: 72,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    width: '80%',
    marginTop: Spacing.xs,
  },
  pseudo: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    marginTop: Spacing.xs,
  },
  email: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
  },
  editCta: {
    marginTop: Spacing.sm,
    minWidth: 120,
  },
  levelCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  xpProgress: {
    fontFamily: FontFamily.numeric,
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#a3e635',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  preferenceBlock: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  preferenceLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
  },
  passwordForm: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  passwordMessage: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
});
