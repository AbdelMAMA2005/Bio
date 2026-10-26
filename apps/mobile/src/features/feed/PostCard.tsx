import { Image } from 'expo-image';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useDeletePost } from '@/api/hooks/useFeed';
import { useReportContent } from '@/features/feed/useReportContent';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import type { FeedPost } from '@/api/types';
import type { SupportedLanguage } from '@/i18n';
import { formatDistance, formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { RarityColors, RarityColorsLight, ToxicityColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  post: FeedPost;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  /** Absent (ex. modale profil public) : l'en-tête auteur devient non pressable. */
  onPressAuthor?: (authorId: string) => void;
  sharing?: boolean;
  onDeleted?: () => void;
};

export const PostCard = memo(function PostCard({
  post,
  onToggleLike,
  onOpenComments,
  onShare,
  onPressAuthor,
  sharing,
  onDeleted,
}: Props) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const deletePost = useDeletePost();
  const report = useReportContent();
  const confirmDelete = () => Alert.alert(t('community.deletePost'), t('community.deleteConfirm'), [
    { text: t('location.close'), style: 'cancel' },
    { text: t('community.deletePost'), style: 'destructive', onPress: () => {
      deletePost.mutate(post.id, { onSuccess: () => onDeleted?.(), onError: () => Alert.alert(t('community.deleteError')) });
    } },
  ]);
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const rarityPalette = post.plant ? (isDark ? RarityColors : RarityColorsLight)[post.plant.rarete] : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <Pressable
        style={styles.header}
        disabled={!onPressAuthor}
        onPress={() => onPressAuthor?.(post.authorId)}
        hitSlop={4}>
        <Avatar uri={post.authorAvatarUrl} name={post.authorName} size={38} />
        <View style={styles.headerText}>
          <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{formatRelativeDate(post.createdAt, language)}</Text>
        </View>
      </Pressable>

      {post.plant ? (
        <View style={[styles.plantChip, { backgroundColor: colors.chip }]}>
          <Icon name={post.tagType === 'owned' ? 'potted_plant' : 'menu_book'} size={14} color={colors.active} />
          <Text style={[styles.plantChipLabel, { color: colors.text }]}>{post.plant.nomCommun}</Text>
        </View>
      ) : null}

      {post.caption ? <Text style={[styles.caption, { color: colors.text }]}>{post.caption}</Text> : null}

      {post.imageUri ? (
        <Image
          source={{ uri: post.imageUri }}
          style={styles.image}
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={post.id}
        />
      ) : post.plant?.urlImage ? (
        <Image
          source={{ uri: post.plant.urlImage }}
          style={styles.image}
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={post.plant.urlImage}
        />
      ) : post.plant && rarityPalette ? (
        <View style={[styles.image, styles.imageFallback, { backgroundColor: rarityPalette.bg }]}>
          <Icon name={post.plant.icon} size={56} color={rarityPalette.text} />
        </View>
      ) : null}

      {post.distanceMeters !== null ? (
        <View style={[styles.discoveryBanner, { backgroundColor: colors.chip }]}>
          <Icon name="explore" size={15} color={colors.active} />
          <Text style={[styles.discoveryLabel, { color: colors.text }]}>
            {t('community.discoveredAt', { distance: formatDistance(post.distanceMeters, language, t) })}
          </Text>
        </View>
      ) : null}

      {user?.id === post.authorId ? (
        <Pressable onPress={confirmDelete} disabled={deletePost.isPending} accessibilityRole="button" style={styles.actionItem}>
          <Icon name="delete" size={19} color={ToxicityColors.toxic.text} />
          <Text style={[styles.actionLabel, { color: ToxicityColors.toxic.text }]}>{t('community.deletePost')}</Text>
          {deletePost.isPending ? <ActivityIndicator size="small" /> : null}
        </Pressable>
      ) : user ? (
        <Pressable onPress={() => report('post', post.id)} accessibilityRole="button" style={styles.actionItem}>
          <Icon name="flag" size={18} color={colors.muted} />
          <Text style={[styles.actionLabel, { color: colors.muted }]}>{t('community.report')}</Text>
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={styles.actionItem} onPress={onToggleLike} hitSlop={6}>
          <Icon name="favorite" size={19} color={post.liked ? ToxicityColors.toxic.text : colors.muted} />
          <Text style={[styles.actionLabel, { color: post.liked ? ToxicityColors.toxic.text : colors.muted }]}>
            {post.likes}
          </Text>
        </Pressable>
        <Pressable style={styles.actionItem} onPress={onOpenComments} hitSlop={6}>
          <Icon name="chat_bubble" size={18} color={colors.muted} />
          <Text style={[styles.actionLabel, { color: colors.muted }]}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.actionItem} onPress={onShare} disabled={sharing} hitSlop={6}>
          {sharing ? (
            <ActivityIndicator size="small" color={colors.muted} />
          ) : (
            <Icon name="ios_share" size={18} color={colors.muted} />
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  meta: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  plantChip: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  plantChipLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  image: {
    aspectRatio: 16 / 10,
    borderRadius: Radius.lg,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  discoveryLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontFamily: FontFamily.numericBold,
    fontSize: 12.5,
  },
});
