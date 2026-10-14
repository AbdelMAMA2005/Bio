import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CircleIconButton } from '@/components/CircleIconButton';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { useConversations } from '@/api/hooks/useMessages';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import type { Conversation } from '@planai/shared';

/** Liste des conversations privées — voir GET /messages/conversations (API_CONTRACT.md). */
export function MessagesListScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const conversations = useConversations();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';

  const renderPreview = (conversation: Conversation) => {
    const last = conversation.dernierMessage;
    if (!last) return '';
    const prefix = last.estDeMoi ? `${t('common.you')}: ` : '';
    if (last.storyPreview) return `${prefix}${t('messages.storyReplyLabel')}`;
    return `${prefix}${last.contenu}`;
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('messages.title')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {conversations.isPending ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : conversations.isError ? (
          <ErrorState onRetry={() => conversations.refetch()} />
        ) : (
          <FlatList
            data={conversations.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="mail" size={40} color={colors.muted} />
                <Text style={[styles.emptyLabel, { color: colors.muted }]}>{t('messages.emptyState')}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, { borderColor: colors.hairline }]}
                onPress={() => router.push(`/messages/${item.autreUtilisateur.id}`)}>
                <Avatar uri={item.autreUtilisateur.urlAvatar} name={item.autreUtilisateur.nomUtilisateur} size={48} />
                <View style={styles.rowBody}>
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                    {item.autreUtilisateur.nomUtilisateur}
                  </Text>
                  <Text
                    style={[styles.rowPreview, { color: item.nonLusCount > 0 ? colors.text : colors.muted }]}
                    numberOfLines={1}>
                    {renderPreview(item)}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  {item.dernierMessage ? (
                    <Text style={[styles.rowDate, { color: colors.muted }]}>
                      {formatRelativeDate(item.dernierMessage.dateEnvoi, language)}
                    </Text>
                  ) : null}
                  {item.nonLusCount > 0 ? (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.active }]}>
                      <Text style={styles.unreadCount}>{item.nonLusCount}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}
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
    fontFamily: FontFamily.display,
    fontSize: 17,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xxl,
  },
  emptyLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  rowPreview: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowDate: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    color: '#ffffff',
    fontFamily: FontFamily.numericBold,
    fontSize: 10.5,
  },
});
