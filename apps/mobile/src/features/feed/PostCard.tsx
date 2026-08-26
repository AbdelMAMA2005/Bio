import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useRouter } from 'expo-router';

import { Icon } from '@/components/Icon';
import type { FeedPost } from '@/api/types';
import type { SupportedLanguage } from '@/i18n';
import { formatDistance, formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { AccentGradient, AccentOnColor, RarityColors, RarityColorsLight, ToxicityColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  post: FeedPost;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  sharing?: boolean;
};

export function PostCard({ post, onToggleLike, onOpenComments, onShare, onEdit, onDelete, sharing }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const rarityPalette = post.plant ? (isDark ? RarityColors : RarityColorsLight)[post.plant.rarete] : null;
  const router = useRouter();
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(280)
    .onEnd((_event, success) => {
      if (success) scheduleOnRN(onToggleLike);
    });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.header}>
        <LinearGradient colors={AccentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <Text style={styles.avatarInitial}>{post.authorInitial}</Text>
        </LinearGradient>
        <View style={styles.headerText}>
          <Pressable onPress={() => router.push({ pathname: '/profil/[id]', params: { id: post.authorId } })}>
            <Text style={[styles.authorName, { color: colors.text }]}>{`@${post.authorName}`}</Text>
          </Pressable>
          <Text style={[styles.meta, { color: colors.muted }]}>{formatRelativeDate(post.createdAt, language)}</Text>
        </View>
      </View>

      {post.plant ? (
        <View style={[styles.plantChip, { backgroundColor: colors.chip }]}>
          <Icon name={post.tagType === 'owned' ? 'potted_plant' : 'menu_book'} size={14} color={colors.active} />
          <Text style={[styles.plantChipLabel, { color: colors.text }]}>{post.plant.nomCommun}</Text>
        </View>
      ) : null}

      {post.caption ? <Text style={[styles.caption, { color: colors.text }]}>{post.caption}</Text> : null}

      {post.imageUri ? (
        <GestureDetector gesture={doubleTapGesture}>
          <Image source={{ uri: post.imageUri }} style={styles.image} />
        </GestureDetector>
      ) : post.plant?.urlImage ? (
        <GestureDetector gesture={doubleTapGesture}>
          <Image source={{ uri: post.plant.urlImage }} style={styles.image} />
        </GestureDetector>
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
        {onEdit && onDelete ? (
          <Pressable
            style={styles.moreButton}
            onPress={() => Alert.alert(t('community.postMenu'), undefined, [
              { text: t('community.editPost'), onPress: onEdit },
              { text: t('community.deletePostCta'), style: 'destructive', onPress: onDelete },
              { text: t('common.cancel'), style: 'cancel' },
            ])}
            hitSlop={6}>
            <Icon name="more_vert" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: AccentOnColor,
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
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
    borderRadius: Radius.pill,
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
  moreButton: { marginLeft: 'auto' },
});
