import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useDeletePost, useFeed, usePublishPost, usePublishStoryMedia, useStories, useToggleLike, useUpdatePost } from '@/api/hooks/useFeed';
import { useUnreadMessagesCount } from '@/api/hooks/useMessages';
import { useUnreadNotificationsCount } from '@/api/hooks/useNotifications';
import { CommentsSheet } from '@/features/feed/CommentsSheet';
import { PostCard } from '@/features/feed/PostCard';
import { PostComposerModal } from '@/features/feed/PostComposerModal';
import { PostEditModal } from '@/features/feed/PostEditModal';
import { sharePost } from '@/features/feed/sharePost';
import { StoryActionSheet } from '@/features/feed/StoryActionSheet';
import { StoryBubble } from '@/features/feed/StoryBubble';
import { formatUsername } from '@/utils/format';
import { StoryViewer } from '@/features/feed/StoryViewer';
import { ScanToast } from '@/features/scan/ScanToast';
import { useAppTheme } from '@/theme';
import { AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import type { FeedPost, StoryGroup } from '@/api/types';
import { useAuth } from '@/features/auth/AuthProvider';

type FeedFilter = 'all' | 'near';

export function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | undefined>();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const feed = useFeed(coords, filter === 'near' ? 'near' : undefined);
  const stories = useStories();
  const toggleLike = useToggleLike();
  const publishStoryMedia = usePublishStoryMedia();
  const publishPost = usePublishPost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const { user } = useAuth();

  // Compteurs non-lus pour les badges dans le header
  const unreadMessages = useUnreadMessagesCount();
  const unreadNotifications = useUnreadNotificationsCount();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);
  const [viewer, setViewer] = useState<{ groups: StoryGroup[]; groupIndex: number } | null>(null);

  // Etat du modal d edition de publication
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  // "Ta story" (bulle dediee, facon WhatsApp) separee du reste : jamais dupliquee dans le
  // defilement horizontal des autres bulles.
  const myStory = stories.data?.find((g) => g.estMoi);
  const otherStories = stories.data?.filter((g) => !g.estMoi) ?? [];

  const showToast = (title: string, subtitle: string) => {
    setToast({ title, subtitle });
    setTimeout(() => setToast(null), 2200);
  };

  const handleFilterChange = async (next: FeedFilter) => {
    setFilter(next);
    if (next !== 'near' || coords) return;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      // Position indisponible (emulateur sans GPS, permission refusee en cours de
      // route...) : le filtre "Pres de moi" restera honnetement vide plutot que
      // d afficher des distances inventees.
    }
  };

  // Le filtre "near" n interroge jamais le back sans position connue (voir useFeed.ts,
  // `enabled: filter !== 'near' || !!coords`) : sans ce garde-fou, la requete resterait
  // indefiniment "en attente" (React Query) et l ecran afficherait un spinner permanent au
  // lieu d un vide honnete (permission refusee, position indisponible...).
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
      // Echec reel (telechargement de l image impossible, aucune app cible...) — un partage
      // simplement annule par l utilisateur ne leve jamais (voir sharePost.ts).
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

  const handleSaveEdit = async (caption: string) => {
    if (!editingPost) return;
    await updatePost.mutateAsync({ postId: editingPost.id, texte: caption });
    setEditingPost(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(t('community.editPostSaved'), t('community.newPost'));
  };

  const handleDeletePost = (item: FeedPost) => {
    Alert.alert(t('community.deletePostTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('community.deletePostCta'), style: 'destructive', onPress: () => deletePost.mutate(item.id) },
    ]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('community.subtitle')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t('community.title')}</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Icone Messages avec badge non-lus */}
            <Pressable style={styles.headerIcon} hitSlop={8} onPress={() => router.push('/messages')}>
              <Icon name="chat_bubble" size={22} color={colors.text} />
              {(unreadMessages.data ?? 0) > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.active }]}>
                  <Text style={styles.badgeText}>
                    {(unreadMessages.data ?? 0) > 9 ? '9+' : String(unreadMessages.data)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            {/* Icone Notifications avec badge non-lus */}
            <Pressable style={styles.headerIcon} hitSlop={8} onPress={() => router.push('/notifications')}>
              <Icon name="notifications" size={22} color={colors.text} />
              {(unreadNotifications.data ?? 0) > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.active }]}>
                  <Text style={styles.badgeText}>
                    {(unreadNotifications.data ?? 0) > 9 ? '9+' : String(unreadNotifications.data)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
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
                        initial={myStory.username.charAt(0).toUpperCase()}
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
                        name={formatUsername(item.username)}
                        initial={item.username.replace(/^@+/, '').charAt(0).toUpperCase()}
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
                <Text style={[styles.placeholder, { color: colors.muted }]}>{t('community.emptyNear')}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onToggleLike={() => toggleLike.mutate(item.id)}
                onOpenComments={() => setCommentsPostId(item.id)}
                onShare={() => handleShare(item)}
                onEdit={item.authorId === user?.id ? () => setEditingPost(item) : undefined}
                onDelete={item.authorId === user?.id ? () => handleDeletePost(item) : undefined}
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

      {/* Modal edition de publication - cross-platform, integre au theme */}
      <PostEditModal
        visible={!!editingPost}
        initialCaption={editingPost?.caption ?? ''}
        saving={updatePost.isPending}
        onClose={() => setEditingPost(null)}
        onSave={handleSaveEdit}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    gap: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: 2,
  },
  headerIcon: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    lineHeight: 12,
  },
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: HitTarget + 6,
    height: HitTarget + 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.25)',
    elevation: 6,
  },
  loader: {
    marginTop: Spacing.xxl,
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
