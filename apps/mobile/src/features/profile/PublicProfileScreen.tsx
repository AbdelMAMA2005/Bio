import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CircleIconButton } from '@/components/CircleIconButton';
import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StatTile } from '@/components/StatTile';
import { usePublicProfile, useUserPosts } from '@/api/hooks/usePublicProfile';
import { levelProgress, levelTitleKey, xpTargetForLevel } from '@/features/account/levels';
import { PostViewerModal } from '@/features/profile/PostViewerModal';
import { useAppTheme } from '@/theme';
import { RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import type { FeedPost } from '@/api/types';

const GRID_GAP = 2;
const GRID_COLUMNS = 3;

type Props = {
  userId: string;
};

/**
 * Profil public d'un autre utilisateur (tap sur son avatar depuis le feed, les commentaires
 * ou une story) : en-tête (avatar, pseudo, niveau/XP, statistiques), bouton Message, puis la
 * grille de ses publications façon Instagram — voir GET /users/:id/public-profile et
 * GET /users/:id/posts (API_CONTRACT.md).
 */
export function PublicProfileScreen({ userId }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const profile = usePublicProfile(userId);
  const posts = useUserPosts(userId);
  const [openedPost, setOpenedPost] = useState<FeedPost | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const tileSize = (screenWidth - Spacing.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {profile.data?.nomUtilisateur ?? ''}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {profile.isPending ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : profile.isError || !profile.data ? (
          <ErrorState onRetry={() => profile.refetch()} />
        ) : (
          <FlatList
            data={posts.data ?? []}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.gridRow}
            ListHeaderComponent={
              <>
                <View style={styles.profileCard}>
                  <Avatar uri={profile.data.urlAvatar} name={profile.data.nomUtilisateur} size={88} />
                  <Text style={[styles.pseudo, { color: colors.text }]}>{profile.data.nomUtilisateur}</Text>

                  <View style={[styles.levelCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                    <View style={styles.levelRow}>
                      <Text style={[styles.levelLabel, { color: colors.text }]}>
                        {t('account.levelLabel', {
                          level: profile.data.niveau,
                          title: t(levelTitleKey(profile.data.niveau)),
                        })}
                      </Text>
                      <Text style={[styles.xpProgress, { color: colors.muted }]}>
                        {t('account.xpProgress', {
                          current: profile.data.experience,
                          target: xpTargetForLevel(profile.data.niveau),
                        })}
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.chip }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${levelProgress(profile.data.niveau, profile.data.experience) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <StatTile icon="photo_camera" value={profile.data.stats.captures} label={t('account.statsCaptures')} />
                    <StatTile icon="eco" value={profile.data.stats.especes} label={t('account.statsSpecies')} />
                    <StatTile icon="star" value={profile.data.stats.rares} label={t('account.statsRares')} iconColor="#c084fc" />
                  </View>

                  <SecondaryButton
                    label={t('profile.sendMessage')}
                    icon="mail"
                    onPress={() => router.push(`/messages/${userId}`)}
                    style={styles.messageButton}
                  />
                </View>

                <View style={styles.gridHeader}>
                  <Icon name="grid_on" size={16} color={colors.muted} />
                  <Text style={[styles.gridHeaderLabel, { color: colors.muted }]}>{t('profile.postsTitle')}</Text>
                </View>
              </>
            }
            ListEmptyComponent={
              !posts.isPending ? (
                <Text style={[styles.emptyLabel, { color: colors.muted }]}>{t('profile.postsEmpty')}</Text>
              ) : null
            }
            renderItem={({ item }) => {
              const thumbnailUri = item.imageUri ?? item.plant?.urlImage ?? undefined;
              const rarityPalette = item.plant ? (isDark ? RarityColors : RarityColorsLight)[item.plant.rarete] : null;
              return (
                <Pressable
                  style={[styles.tile, { width: tileSize, height: tileSize, backgroundColor: colors.chip }]}
                  onPress={() => setOpenedPost(item)}>
                  {thumbnailUri ? (
                    <Image source={{ uri: thumbnailUri }} style={styles.tileImage} contentFit="cover" />
                  ) : rarityPalette && item.plant ? (
                    <View style={[styles.tileFallback, { backgroundColor: rarityPalette.bg }]}>
                      <Icon name={item.plant.icon} size={28} color={rarityPalette.text} />
                    </View>
                  ) : (
                    <View style={styles.tileFallback}>
                      <Icon name="eco" size={28} color={colors.muted} />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>

      <PostViewerModal post={openedPost} onClose={() => setOpenedPost(null)} />
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
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  gridRow: {
    paddingHorizontal: Spacing.lg,
    gap: GRID_GAP,
  },
  profileCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  pseudo: {
    fontFamily: FontFamily.extraBold,
    fontSize: 19,
  },
  levelCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  xpProgress: {
    fontFamily: FontFamily.numeric,
    fontSize: 11.5,
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
    alignSelf: 'stretch',
    marginTop: Spacing.xs,
  },
  messageButton: {
    marginTop: Spacing.sm,
    minWidth: 160,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(143,179,160,0.25)',
  },
  gridHeaderLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emptyLabel: {
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontSize: 13,
    paddingVertical: Spacing.xxl,
  },
  tile: {
    marginBottom: GRID_GAP,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
