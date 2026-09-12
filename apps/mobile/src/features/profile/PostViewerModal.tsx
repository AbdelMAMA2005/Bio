import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { useToggleLike } from '@/api/hooks/useFeed';
import { CommentsSheet } from '@/features/feed/CommentsSheet';
import { PostCard } from '@/features/feed/PostCard';
import { sharePost } from '@/features/feed/sharePost';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import type { FeedPost } from '@/api/types';

type Props = {
  post: FeedPost | null;
  onClose: () => void;
};

/**
 * Ouvre une publication en plein écran (tap sur une tuile de la grille du profil public) :
 * même carte que dans le fil (like/commentaires/partage), pas une version dégradée.
 */
export function PostViewerModal({ post, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const toggleLike = useToggleLike();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!post) return;
    setSharing(true);
    try {
      await sharePost(post, t('community.shareDefaultMessage'));
    } catch {
      // Partage annulé ou échoué silencieusement — voir sharePost.ts, même comportement
      // que la carte du fil.
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={post !== null} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fill, { backgroundColor: colors.screen }]}>
        <SafeAreaView style={styles.fill}>
          <View style={styles.header}>
            <CircleIconButton icon="close" onPress={onClose} />
          </View>
          {post ? (
            <ScrollView contentContainerStyle={styles.content}>
              <PostCard
                post={post}
                onToggleLike={() => toggleLike.mutate(post.id)}
                onOpenComments={() => setCommentsOpen(true)}
                onShare={handleShare}
                sharing={sharing}
              />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>

      <CommentsSheet postId={commentsOpen ? (post?.id ?? null) : null} onClose={() => setCommentsOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
