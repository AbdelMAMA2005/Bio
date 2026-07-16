import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useFeed, usePublishPost, usePublishStory, useToggleLike } from '@/api/hooks/useFeed';
import { PostCard } from '@/features/feed/PostCard';
import { PostComposerModal } from '@/features/feed/PostComposerModal';
import { StoryActionSheet } from '@/features/feed/StoryActionSheet';
import { StoryBubble } from '@/features/feed/StoryBubble';
import { ScanToast } from '@/features/scan/ScanToast';
import { useAppTheme } from '@/theme';
import { AccentGradient, AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type FeedFilter = 'all' | 'near';
const NEAR_RADIUS_METERS = 5000;

export function CommunityScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const feed = useFeed();
  const toggleLike = useToggleLike();
  const publishStory = usePublishStory();
  const publishPost = usePublishPost();

  const [filter, setFilter] = useState<FeedFilter>('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);

  const showToast = (title: string, subtitle: string) => {
    setToast({ title, subtitle });
    setTimeout(() => setToast(null), 2200);
  };

  const posts = useMemo(() => {
    const all = feed.data?.posts ?? [];
    if (filter === 'all') return all;
    return all.filter((post) => post.distanceMeters !== null && post.distanceMeters <= NEAR_RADIUS_METERS);
  }, [feed.data, filter]);

  const publishFromPicker = async (result: ImagePicker.ImagePickerResult) => {
    setPickerOpen(false);
    if (result.canceled || !result.assets[0]) return;
    await publishStory.mutateAsync(result.assets[0].uri);
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
          <View>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t('community.subtitle')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t('community.title')}</Text>
          </View>
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={4}>
            <LinearGradient colors={AccentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
              <Icon name="add" size={22} color={AccentOnColor} />
            </LinearGradient>
          </Pressable>
        </View>

        {feed.isPending ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : feed.isError ? (
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
                  data={feed.data?.stories ?? []}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.storiesRow}
                  ListHeaderComponent={
                    <StoryBubble variant="add" label={t('community.yourStory')} onPress={() => setPickerOpen(true)} />
                  }
                  renderItem={({ item }) => (
                    <StoryBubble variant="story" name={item.name} initial={item.initial} imageUri={item.imageUri} />
                  )}
                />

                <View style={styles.segmentWrap}>
                  <SegmentedControl
                    fullWidth
                    value={filter}
                    onChange={setFilter}
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
            renderItem={({ item }) => <PostCard post={item} onToggleLike={() => toggleLike.mutate(item.id)} />}
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
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  addButton: {
    width: HitTarget,
    height: HitTarget,
    borderRadius: HitTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
