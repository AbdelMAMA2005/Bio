import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentCoordinates, showLocationError } from '@/utils/location';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useFeed, usePublishPost, usePublishStoryMedia, useStories, useToggleLike } from '@/api/hooks/useFeed';
import { useConversations } from '@/api/hooks/useMessages';
import { CommentsSheet } from '@/features/feed/CommentsSheet';
import { PostCard } from '@/features/feed/PostCard';
import { PostComposerModal } from '@/features/feed/PostComposerModal';
import { sharePost } from '@/features/feed/sharePost';
import { StoryActionSheet } from '@/features/feed/StoryActionSheet';
import { StoryBubble } from '@/features/feed/StoryBubble';
import { StoryViewer } from '@/features/feed/StoryViewer';
import { ScanToast } from '@/features/scan/ScanToast';
import { useAppTheme } from '@/theme';
import { AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import type { FeedPost, StoryGroup } from '@/api/types';

type FeedFilter = 'all' | 'near';

export function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | undefined>();
  const locationRequest = useRef(0);
  const [locating, setLocating] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const feed = useFeed(coords, filter === 'near' ? 'near' : undefined);
  const stories = useStories();
  const conversations = useConversations();
  const toggleLike = useToggleLike();
  const publishStoryMedia = usePublishStoryMedia();
  const publishPost = usePublishPost();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);
  const [viewer, setViewer] = useState<{ groups: StoryGroup[]; groupIndex: number } | null>(null);

  // "Ta story" (bulle dédiée, façon WhatsApp) séparée du reste : jamais dupliquée dans le
  // défilement horizontal des autres bulles.
  const myStory = stories.data?.find((g) => g.estMoi);
  const otherStories = stories.data?.filter((g) => !g.estMoi) ?? [];

  const showToast = (title: string, subtitle: string) => {
    setToast({ title, subtitle });
    setTimeout(() => setToast(null), 2200);
  };

  const handleFilterChange = async (next: FeedFilter) => {
    const request = ++locationRequest.current;
    setFilter(next);
    setLocating(false);
    if (next !== 'near' || coords) return;
    setLocating(true);
    try {
      const position = await getCurrentCoordinates();
      if (request === locationRequest.current) setCoords(position);
    } catch (error) {
      if (request === locationRequest.current) {
        setFilter('all');
        showLocationError(error);
      }
    } finally {
      if (request === locationRequest.current) setLocating(false);
    }
  };

  // Le filtre "near" n'interroge jamais la base sans position connue (voir useFeed.ts,
  // `enabled: filter !== 'near' || !!coords`) : sans ce garde-fou, la requête resterait
  // indéfiniment "en attente" (React Query) et l'écran afficherait un spinner permanent au
  // lieu d'un vide honnête (permission refusée, position indisponible...).
  const unreadConversations = (conversations.data ?? []).reduce((sum, c) => sum + c.nonLusCount, 0);

  const nearWithoutCoords = filter === 'near' && !coords;
  const posts = nearWithoutCoords ? [] : (feed.data ?? []);
  const showLoading = feed.isPending && !nearWithoutCoords;
  const showError = feed.isError && !nearWithoutCoords;

  const publishFromPicker = async (result: ImagePicker.ImagePickerResult) => {
    setPickerOpen(false);
    if (result.canceled || !result.assets[0]) return;
    await publishStoryMedia.mutateAsync(result.assets[0].uri);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(t('community.storyPublished'), t('community.yourStory'));
  };

  const handlePublishPost = async (input: { imageUri: string; texte: string; collectionItemId?: string }) => {
    await publishPost.mutateAsync(input);
    setComposerOpen(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(t('community.postPublished'), t('community.newPost'));
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPickerOpen(false);
      return;
    }
    await publishFromPicker(await ImagePicker.launchCameraAsync({ quality: 0.6 }));
  };

  const handleShare = async (post: FeedPost) => {
    setSharingPostId(post.id);
    try {
      await sharePost(post, t('community.shareDefaultMessage'));
    } catch {
      // Échec réel (téléchargement de l'image impossible, aucune app cible…) — un partage
      // simplement annulé par l'utilisateur ne lève jamais (voir sharePost.ts).
      showToast(t('community.shareErrorTitle'), t('community.shareErrorSub'));
    } finally {
      setSharingPostId(null);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerOpen(false);
      return;
    }
    await publishFromPicker(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 }));
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTexts}>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('community.subtitle')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t('community.title')}</Text>
          </View>
          <Pressable onPress={() => router.push('/messages')} hitSlop={8} style={styles.messagesButton}>
            <Icon name="mail" size={24} color={colors.text} />
            {unreadConversations > 0 ? (
              <View style={[styles.messagesBadge, { backgroundColor: colors.active, borderColor: colors.screen }]}>
                <Text style={styles.messagesBadgeLabel}>{unreadConversations}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {showLoading ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : showError ? (
          <ErrorState onRetry={() => feed.refetch()} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              feed.isFetchingNextPage ? <ActivityIndicator color={colors.active} style={styles.footerLoader} /> : null
            }
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={7}
            initialNumToRender={6}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={otherStories}
                  keyExtractor={(item) => item.idUtilisateur}
                  contentContainerStyle={styles.storiesRow}
                  ListHeaderComponent={
                    myStory ? (
                      <StoryBubble
                        variant="story"
                        name={t('community.yourStory')}
                        initial={myStory.nomUtilisateur.charAt(0).toUpperCase()}
                        thumbnailUri={myStory.medias[myStory.medias.length - 1]?.urlMedia}
                        seen
                        onPress={() => setViewer({ groups: [myStory], groupIndex: 0 })}
                        onPressAdd={() => setPickerOpen(true)}
                      />
                    ) : (
                      <StoryBubble variant="add" label={t('community.yourStory')} onPress={() => setPickerOpen(true)} />
                    )
                  }
                  renderItem={({ item, index }) => (
                    <StoryBubble
                      variant="story"
                      name={item.nomUtilisateur}
                      initial={item.nomUtilisateur.charAt(0).toUpperCase()}
                      thumbnailUri={item.medias[item.medias.length - 1]?.urlMedia}
                      seen={item.entierementVue}
                      onPress={() => setViewer({ groups: otherStories, groupIndex: index })}
                    />
                  )}
                />

                <View style={styles.segmentWrap}>
                  <SegmentedControl
                    fullWidth
                    value={filter}
                    onChange={handleFilterChange}
                    options={[
                      { value: 'all', label: t('community.feedAll') },
                      { value: 'near', label: t('community.feedNear', { distance: t('distance.kilometers', { value: 5 }) }) },
                    ]}
                  />
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Icon name="forum" size={44} color={colors.muted} />
                {locating ? <ActivityIndicator color={colors.active} /> : <Text style={[styles.placeholder, { color: colors.muted }]}>{t('community.emptyNear')}</Text>}
              </View>
            }
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onToggleLike={() => toggleLike.mutate(item.id)}
                onOpenComments={() => setCommentsPostId(item.id)}
                onShare={() => handleShare(item)}
                onPressAuthor={(authorId) => router.push(`/profil/${authorId}`)}
                sharing={sharingPostId === item.id}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <Pressable onPress={() => setComposerOpen(true)} style={[styles.fab, { backgroundColor: colors.active }]} hitSlop={4}>
          <Icon name="add_a_photo" size={22} color={AccentOnColor} />
        </Pressable>
      </SafeAreaView>

      <StoryActionSheet
        visible={pickerOpen}
        onPickCamera={pickFromCamera}
        onPickGallery={pickFromGallery}
        onCancel={() => setPickerOpen(false)}
      />

      <PostComposerModal
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPublish={handlePublishPost}
        publishing={publishPost.isPending}
      />

      <CommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} />

      {viewer ? (
        <StoryViewer groups={viewer.groups} initialGroupIndex={viewer.groupIndex} onClose={() => setViewer(null)} />
      ) : null}

      {toast ? (
        <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="none">
          <ScanToast title={toast.title} subtitle={toast.subtitle} />
        </SafeAreaView>
      ) : null}
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerTexts: {
    flex: 1,
  },
  messagesButton: {
    width: HitTarget,
    height: HitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesBadgeLabel: {
    color: '#ffffff',
    fontFamily: FontFamily.numericBold,
    fontSize: 9.5,
  },
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: HitTarget + 6,
    height: HitTarget + 6,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.25)',
    elevation: 6,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  listHeader: {
    marginBottom: Spacing.sm,
  },
  storiesRow: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  segmentWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  separator: {
    height: Spacing.md,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
  },
  placeholder: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});
