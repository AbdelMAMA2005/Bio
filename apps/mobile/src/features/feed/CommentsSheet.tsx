import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useAddComment, useComments } from '@/api/hooks/useFeed';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { AccentGradient, AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  postId: string | null;
  onClose: () => void;
};

/**
 * Lecture/ajout de vrais commentaires (GET/POST /feed/posts/:id/comments, déjà présents
 * côté back mais jamais branchés côté front avant le 24/07/2026 — voir rapport.md).
 */
export function CommentsSheet({ postId, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const comments = useComments(postId ?? undefined);
  const addComment = useAddComment();
  const [text, setText] = useState('');

  const close = () => {
    setText('');
    onClose();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!postId || !trimmed) return;
    addComment.mutate({ postId, texte: trimmed }, { onSuccess: () => setText('') });
  };

  return (
    <Modal visible={postId !== null} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <KeyboardAvoidingView behavior="padding" style={styles.avoidingWrap}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            <View style={[styles.handle, { backgroundColor: colors.hairline }]} />
            <Text style={[styles.title, { color: colors.text }]}>{t('community.comments')}</Text>

            {comments.isPending ? (
              <ActivityIndicator color={colors.active} style={styles.loader} />
            ) : (
              <FlatList
                data={comments.data ?? []}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: colors.muted }]}>{t('community.noComments')}</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <LinearGradient colors={AccentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                      <Text style={styles.avatarInitial}>{item.authorInitial}</Text>
                    </LinearGradient>
                    <View style={styles.commentBody}>
                      <View style={styles.commentHeaderRow}>
                        <Pressable onPress={() => router.push({ pathname: '/profil/[id]', params: { id: item.authorId } })}>
                          <Text style={[styles.authorName, { color: colors.text }]}>{`@${item.authorName}`}</Text>
                        </Pressable>
                        <Text style={[styles.commentDate, { color: colors.muted }]}>
                          {formatRelativeDate(item.createdAt, language)}
                        </Text>
                      </View>
                      <Text style={[styles.commentText, { color: colors.text }]}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={[styles.inputRow, { borderTopColor: colors.hairline }]}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('community.commentPlaceholder')}
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.text, backgroundColor: colors.chip }]}
              />
              <Pressable
                onPress={handleSend}
                disabled={!text.trim() || addComment.isPending}
                style={[
                  styles.sendButton,
                  { backgroundColor: colors.active, opacity: !text.trim() || addComment.isPending ? 0.5 : 1 },
                ]}>
                {addComment.isPending ? (
                  <ActivityIndicator color={AccentOnColor} size="small" />
                ) : (
                  <Icon name="send" size={18} color={AccentOnColor} />
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  avoidingWrap: {
    maxHeight: '80%',
  },
  sheet: {
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
    paddingBottom: Spacing.md,
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  commentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: AccentOnColor,
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  authorName: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
  },
  commentDate: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
  },
  commentText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  input: {
    flex: 1,
    minHeight: HitTarget,
    borderRadius: Radius.pill,
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
