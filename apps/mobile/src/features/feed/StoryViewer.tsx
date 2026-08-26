import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Icon } from '@/components/Icon';
import { useAddStoryComment, useRecordStoryView, useStoryComments, useToggleStoryLike } from '@/api/hooks/useFeed';
import { StoryViewersSheet } from '@/features/feed/StoryViewersSheet';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate, formatUsername } from '@/utils/format';
import { Palette, AccentGradient, AccentOnColor } from '@/theme/colors';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import type { StoryGroup } from '@/api/types';

const IMAGE_DURATION_MS = 5000;
const SWIPE_DOWN_THRESHOLD = 90;
const chrome = Palette.dark;

type Props = {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
};

function firstUnseenIndex(group: StoryGroup): number {
  const idx = group.medias.findIndex((m) => !m.vuParMoi);
  return idx === -1 ? 0 : idx;
}

/**
 * Visualiseur plein écran façon "statuts WhatsApp" : barres de progression segmentées,
 * enchaînement automatique (média puis bulle suivante), tap droite/gauche, appui long =
 * pause, swipe bas = fermer. Reçoit un instantané figé de `groups` à l'ouverture (voir
 * CommunityScreen.tsx) — les rafraîchissements de la requête stories() pendant la lecture
 * (ex: après l'enregistrement d'une vue) ne réordonnent jamais la liste sous les pieds de
 * l'utilisateur en cours de lecture.
 */
export function StoryViewer({ groups, initialGroupIndex, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const recordView = useRecordStoryView();
  const toggleLike = useToggleStoryLike();
  const addComment = useAddStoryComment();
  const [comment, setComment] = useState('');
  const [position, setPosition] = useState(() => ({
    groupIndex: initialGroupIndex,
    mediaIndex: firstUnseenIndex(groups[initialGroupIndex]),
  }));
  const [paused, setPaused] = useState(false);
  const [viewersMediaId, setViewersMediaId] = useState<string | null>(null);
  const [likeOverrides, setLikeOverrides] = useState<Record<string, boolean>>({});
  const screenWidth = useMemo(() => Dimensions.get('window').width, []);

  const group = groups[position.groupIndex];
  const media = group.medias[position.mediaIndex];
  const storyComments = useStoryComments(media.id);
  const liked = likeOverrides[media.id] ?? media.estLikedParUtilisateur;
  const likesCount = media.likesCount + (likeOverrides[media.id] === undefined ? 0 : liked === media.estLikedParUtilisateur ? 0 : liked ? 1 : -1);
  const resetKey = `${position.groupIndex}-${position.mediaIndex}`;

  const handleLike = () => {
    if (group.estMoi) return;
    const previous = liked;
    const optimistic = !previous;
    setLikeOverrides((current) => ({ ...current, [media.id]: optimistic }));
    toggleLike.mutate(media.id, {
      onSuccess: ({ liked: serverLiked }) => setLikeOverrides((current) => ({ ...current, [media.id]: serverLiked })),
      onError: () => setLikeOverrides((current) => ({ ...current, [media.id]: previous })),
    });
  };

  const recordedRef = useRef(new Set<string>());
  useEffect(() => {
    if (group.estMoi || recordedRef.current.has(media.id)) return;
    recordedRef.current.add(media.id);
    recordView.mutate(media.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id, group.estMoi]);

  const goNext = () => {
    setPosition((pos) => {
      const currentGroup = groups[pos.groupIndex];
      if (pos.mediaIndex < currentGroup.medias.length - 1) {
        return { groupIndex: pos.groupIndex, mediaIndex: pos.mediaIndex + 1 };
      }
      if (pos.groupIndex < groups.length - 1) {
        const nextGroupIndex = pos.groupIndex + 1;
        return { groupIndex: nextGroupIndex, mediaIndex: firstUnseenIndex(groups[nextGroupIndex]) };
      }
      return pos;
    });
  };

  const isAtVeryEnd = position.groupIndex === groups.length - 1 && position.mediaIndex === group.medias.length - 1;

  const handleAdvance = () => {
    if (isAtVeryEnd) {
      onClose();
      return;
    }
    goNext();
  };

  const goPrevious = () => {
    setPosition((pos) => {
      if (pos.mediaIndex > 0) {
        return { groupIndex: pos.groupIndex, mediaIndex: pos.mediaIndex - 1 };
      }
      if (pos.groupIndex > 0) {
        const prevGroupIndex = pos.groupIndex - 1;
        return { groupIndex: prevGroupIndex, mediaIndex: groups[prevGroupIndex].medias.length - 1 };
      }
      return pos;
    });
  };

  const progress = useStoryProgress(IMAGE_DURATION_MS, handleAdvance, paused || viewersMediaId !== null, resetKey);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(280)
    .onEnd((_e, success) => {
      if (success && !group.estMoi) scheduleOnRN(handleLike);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const goLeft = e.x < screenWidth * 0.35;
    scheduleOnRN(goLeft ? goPrevious : handleAdvance);
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(180)
    .onStart(() => scheduleOnRN(setPaused, true))
    .onFinalize(() => scheduleOnRN(setPaused, false));

  const panGesture = Gesture.Pan().onEnd((e) => {
    if (e.translationY > SWIPE_DOWN_THRESHOLD) {
      scheduleOnRN(onClose);
    }
  });

  const composedGesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPressGesture, doubleTapGesture, tapGesture),
  );

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar hidden />
      {/* Sur Android, <Modal> s'affiche dans une fenêtre native séparée, hors de portée du
          GestureHandlerRootView global posé à la racine de l'app (_layout.tsx) — sans ce
          second GestureHandlerRootView imbriqué ici, le tap droite/gauche et le swipe bas
          (composedGesture ci-dessous) restent silencieusement inertes sur Android alors
          qu'ils fonctionnent sur iOS (même bug que ImageViewerModal.tsx — voir doc
          react-native-gesture-handler, section Android de l'installation, et rapport.md). */}
      <GestureHandlerRootView style={styles.fill}>
        <View style={styles.fill}>
          {media.mediaType === 'image' ? (
            <Image source={{ uri: media.urlMedia }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : (
            // Lecture vidéo non disponible dans cette passe (aucune librairie expo-video/expo-av
            // installée — voir rapport.md) : on affiche la première frame comme une image plutôt
            // que de planter ou de faire semblant de lire une vidéo.
            <Image source={{ uri: media.urlMedia }} style={StyleSheet.absoluteFill} contentFit="contain" />
          )}

          <GestureDetector gesture={composedGesture}>
            <View style={StyleSheet.absoluteFill} />
          </GestureDetector>

          <SafeAreaView style={styles.overlay} pointerEvents="box-none">
            <View style={styles.progressRow} pointerEvents="none">
              {group.medias.map((m, idx) => (
                <ProgressSegment
                  key={m.id}
                  state={idx < position.mediaIndex ? 'done' : idx > position.mediaIndex ? 'pending' : 'active'}
                  progress={progress}
                />
              ))}
            </View>

            <View style={styles.header} pointerEvents="box-none">
              <Pressable
                disabled={group.estMoi}
                onPress={() => router.push({ pathname: '/profil/[id]', params: { id: group.idUtilisateur } })}
              >
                <LinearGradient colors={AccentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{group.username.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              </Pressable>
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {group.estMoi ? t('community.yourStory') : formatUsername(group.username)}
                </Text>
                <Text style={styles.headerDate}>{formatRelativeDate(media.dateCreation, language)}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
                <Icon name="close" size={22} color={chrome.text} />
              </Pressable>
            </View>

            {group.estMoi ? (
              <Pressable
                onPress={() => setViewersMediaId(media.id)}
                style={styles.viewersHandle}
                hitSlop={8}>
                <Icon name="visibility" size={16} color={chrome.text} />
                <Text style={styles.viewersLabel}>{t('community.viewedByCount', { count: media.vuesCount })}</Text>
              </Pressable>
            ) : null}
            {!group.estMoi ? (
              <View style={styles.interactions}>
                <Pressable onPress={handleLike} style={styles.likeButton} hitSlop={8}>
                  <Icon name={liked ? 'favorite' : 'favorite_border'} size={24} color={liked ? '#ff6b81' : chrome.text} />
                  <Text style={styles.interactionText}>{likesCount}</Text>
                </Pressable>
                <View style={styles.commentsPanel}>
                  {storyComments.isPending ? <ActivityIndicator color={chrome.text} size="small" /> : storyComments.data?.length ? (
                    <FlatList
                      data={storyComments.data}
                      keyExtractor={(item) => item.id}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <Pressable onPress={() => router.push({ pathname: '/profil/[id]', params: { id: item.userId } })} style={styles.commentRow}>
                          <Text style={styles.commentAuthor}>{`@${item.username.replace(/^@/, '')}`}</Text>
                          <Text style={styles.commentBody} numberOfLines={2}>{item.content}</Text>
                        </Pressable>
                      )}
                    />
                  ) : <Text style={styles.noComments}>{t('community.noComments')}</Text>}
                </View>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('community.storyCommentPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  onSubmitEditing={() => { if (comment.trim()) { addComment.mutate({ mediaId: media.id, content: comment.trim() }); setComment(''); } }}
                  style={styles.commentInput}
                  returnKeyType="send"
                />
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>

      <StoryViewersSheet mediaId={viewersMediaId} onClose={() => setViewersMediaId(null)} />
    </Modal>
  );
}

type SegmentState = 'done' | 'active' | 'pending';

/**
 * Un segment de la barre de progression. `useAnimatedStyle` doit être appelé au niveau
 * racine d'un composant (règle des Hooks) — d'où ce composant dédié plutôt qu'un appel
 * conditionnel dans la boucle `.map()` du parent.
 */
function ProgressSegment({ state, progress }: { state: SegmentState; progress: ReturnType<typeof useSharedValue<number>> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: state === 'active' ? `${progress.value * 100}%` : state === 'done' ? '100%' : '0%',
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, animatedStyle]} />
    </View>
  );
}

/**
 * Fait avancer `progress` de 0 à 1 sur `durationMs`, en pause/reprise réelle (pas un simple
 * redémarrage à 0) : `elapsedRef` retient le temps déjà écoulé pour reprendre l'animation là
 * où elle s'est arrêtée, comme sur WhatsApp (appui long = vraie pause, pas un saut de story).
 */
function useStoryProgress(durationMs: number, onComplete: () => void, paused: boolean, resetKey: string) {
  const progress = useSharedValue(0);
  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    progress.value = 0;
    elapsedRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
      elapsedRef.current += Date.now() - startedAtRef.current;
      return;
    }
    startedAtRef.current = Date.now();
    const remaining = Math.max(durationMs - elapsedRef.current, 0);
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(onComplete);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, resetKey]);

  return progress;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: chrome.screen,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: AccentOnColor,
    fontFamily: FontFamily.extraBold,
    fontSize: 13,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: chrome.text,
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  headerDate: {
    color: chrome.muted,
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  closeButton: {
    width: HitTarget - 8,
    height: HitTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewersHandle: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  viewersLabel: {
    color: chrome.text,
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
  },
  interactions: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commentsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 54,
    maxHeight: 180,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  commentRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  commentAuthor: {
    color: chrome.text,
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  commentBody: {
    flex: 1,
    color: chrome.text,
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  noComments: {
    color: chrome.muted,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  interactionText: {
    color: chrome.text,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    color: chrome.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
