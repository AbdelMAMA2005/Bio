import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStoryViewers } from '@/api/hooks/useFeed';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate, formatUsername } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { AccentGradient, AccentOnColor } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  mediaId: string | null;
  onClose: () => void;
};

/**
 * Liste "vu par" d'un média de ma propre story (GET /stories/:mediaId/viewers, réservé à
 * l'auteur — 403 côté back sinon). Comportement WhatsApp : jamais affichée sur la story de
 * quelqu'un d'autre, jamais de compteur/liste inventés.
 */
export function StoryViewersSheet({ mediaId, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const viewers = useStoryViewers(mediaId ?? undefined);

  return (
    <Modal visible={mediaId !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={[styles.handle, { backgroundColor: colors.hairline }]} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t('community.viewedByCount', { count: viewers.data?.length ?? 0 })}
          </Text>

          {viewers.isPending ? (
            <ActivityIndicator color={colors.active} style={styles.loader} />
          ) : (
            <FlatList
              data={viewers.data ?? []}
              keyExtractor={(item) => item.idUtilisateur}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{t('community.noViewsYet')}</Text>}
              renderItem={({ item }) => (
                <View style={styles.viewerRow}>
                  <LinearGradient colors={AccentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{item.username.replace(/^@+/, '').charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <Text style={[styles.viewerName, { color: colors.text }]} numberOfLines={1}>
                    {formatUsername(item.username)}
                  </Text>
                  <Text style={[styles.viewerDate, { color: colors.muted }]}>{formatRelativeDate(item.dateVue, language)}</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6,12,9,0.6)',
  },
  sheet: {
    maxHeight: '70%',
    borderWidth: 1,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  loader: {
    paddingVertical: Spacing.xl,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: AccentOnColor,
    fontFamily: FontFamily.extraBold,
    fontSize: 13,
  },
  viewerName: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
  },
  viewerDate: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
});
