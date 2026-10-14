import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CircleIconButton } from '@/components/CircleIconButton';
import { Icon } from '@/components/Icon';
import { useMessagesWith, useSendMessage } from '@/api/hooks/useMessages';
import { usePublicProfile } from '@/api/hooks/usePublicProfile';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  peerId: string;
};

/**
 * Historique d'une conversation privée avec `peerId`, y compris les réponses aux statuts
 * (aperçu du média cité au-dessus du message) — voir GET/POST /messages/with/:userId
 * (API_CONTRACT.md). Ouvrir cet écran marque côté back les messages reçus comme lus.
 */
export function ConversationScreen({ peerId }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const peer = usePublicProfile(peerId);
  const messages = useMessagesWith(peerId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState('');
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  // Le back renvoie l'historique du plus ancien au plus récent ; une FlatList `inverted`
  // attend l'inverse (le plus récent en index 0) pour démarrer le scroll en bas, comme
  // WhatsApp/Instagram.
  const reversedMessages = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage.mutate({ peerId, contenu: trimmed }, { onSuccess: () => setText('') });
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Pressable style={styles.headerPeer} onPress={() => router.push(`/profil/${peerId}`)}>
            <Avatar uri={peer.data?.urlAvatar} name={peer.data?.nomUtilisateur ?? '?'} size={34} />
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {peer.data?.nomUtilisateur ?? ''}
            </Text>
          </Pressable>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView behavior="padding" style={styles.fill}>
          {messages.isPending ? (
            <ActivityIndicator color={colors.active} style={styles.loader} />
          ) : (
            <FlatList
              data={reversedMessages}
              keyExtractor={(item) => item.id}
              inverted
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.muted }]}>{t('messages.noMessagesYet')}</Text>
              }
              renderItem={({ item }) => {
                const mine = item.idExpediteur !== peerId;
                return (
                  <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: colors.active }
                          : { backgroundColor: colors.chip, borderColor: colors.hairline, borderWidth: 1 },
                      ]}>
                      {item.storyPreview ? (
                        <View style={styles.storyPreview}>
                          <Image source={{ uri: item.storyPreview.urlMedia }} style={styles.storyPreviewImage} />
                          <Text style={[styles.storyPreviewLabel, mine ? { color: AccentOnColor } : { color: colors.muted }]}>
                            {t('messages.storyReplyLabel')}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[styles.bubbleText, { color: mine ? AccentOnColor : colors.text }]}>{item.contenu}</Text>
                    </View>
                    <Text style={[styles.bubbleDate, { color: colors.muted }]}>
                      {formatRelativeDate(item.dateEnvoi, language)}
                    </Text>
                  </View>
                );
              }}
            />
          )}

          <View style={[styles.inputRow, { borderTopColor: colors.hairline }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('messages.inputPlaceholder')}
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, backgroundColor: colors.chip }]}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sendMessage.isPending}
              style={[styles.sendButton, { backgroundColor: colors.active, opacity: !text.trim() || sendMessage.isPending ? 0.5 : 1 }]}>
              {sendMessage.isPending ? (
                <ActivityIndicator color={AccentOnColor} size="small" />
              ) : (
                <Icon name="send" size={18} color={AccentOnColor} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    gap: Spacing.sm,
  },
  headerPeer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerName: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontSize: 13,
    paddingTop: Spacing.xxl,
  },
  bubbleRow: {
    maxWidth: '78%',
    gap: 2,
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 18,
  },
  bubbleDate: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    marginHorizontal: 4,
  },
  storyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  storyPreviewImage: {
    width: 36,
    height: 48,
    borderRadius: Radius.sm,
  },
  storyPreviewLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  input: {
    flex: 1,
    minHeight: HitTarget,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
  },
  sendButton: {
    width: HitTarget,
    height: HitTarget,
    borderRadius: HitTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
