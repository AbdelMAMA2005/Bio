import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate } from '@/utils/format';
import { Palette } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

const MAX_SCALE = 4;
const SWIPE_DOWN_THRESHOLD = 100;
const chrome = Palette.dark;

export type ImageViewerItem = {
  uri: string;
  /** Date ISO, affichée sous la photo active (galerie de photos de suivi). */
  date?: string;
};

type Props = {
  images: ImageViewerItem[];
  initialIndex?: number;
  onClose: () => void;
};

/**
 * Visualiseur plein écran réutilisable pour n'importe quelle image de l'app (thumbnail de
 * plante, photo de suivi…) : fond sombre, pinch-to-zoom + pan, fermeture par swipe bas ou
 * bouton retour (Android : `onRequestClose` du Modal). Avec plusieurs `images`, ajoute un
 * défilement horizontal paginé entre elles (photos de suivi d'un clone), chacune
 * indépendamment zoomable — voir `ZoomableImage` plus bas.
 */
export function ImageViewerModal({ images, initialIndex = 0, onClose }: Props) {
  const { i18n } = useTranslation();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const screenWidth = useMemo(() => Dimensions.get('window').width, []);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const translateY = useSharedValue(0);

  // Le swipe bas ne doit fermer le visualiseur que si l'image n'est pas zoomée (sinon un
  // pan sert à déplacer l'image) et seulement pour un mouvement franchement vertical — les
  // seuils activeOffsetY/failOffsetX laissent les swipes horizontaux passer intacts au
  // FlatList paginé ci-dessous plutôt que de lui voler le geste.
  const closeGesture = Gesture.Pan()
    .enabled(!zoomed)
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > SWIPE_DOWN_THRESHOLD) {
        scheduleOnRN(onClose);
      } else {
        translateY.value = withTiming(0);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - Math.min(translateY.value / 400, 0.5),
  }));

  // FlatList exige une identité stable pour ce callback (un changement lève une erreur).
  const [onViewableItemsChanged] = useState(() => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number') setActiveIndex(first.index);
  });

  const activeDate = images[activeIndex]?.date;
  const isGallery = images.length > 1;

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar hidden />
      {/* Sur Android, <Modal> s'affiche dans une fenêtre native séparée, hors de portée du
          GestureHandlerRootView global posé à la racine de l'app (_layout.tsx) — sans ce
          second GestureHandlerRootView imbriqué ici, le pinch-to-zoom (Gesture.Pinch,
          ZoomableImage plus bas) reste silencieusement inerte sur Android alors qu'il
          fonctionne sur iOS (voir doc react-native-gesture-handler, section Android de
          l'installation). */}
      <GestureHandlerRootView style={styles.fill}>
        <View style={styles.fill}>
          <GestureDetector gesture={closeGesture}>
            <Animated.View style={[styles.fill, backdropStyle]}>
              {isGallery ? (
                <FlatList
                  data={images}
                  horizontal
                  pagingEnabled
                  scrollEnabled={!zoomed}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => `${item.uri}-${index}`}
                  initialScrollIndex={initialIndex}
                  getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                  renderItem={({ item }) => (
                    <View style={{ width: screenWidth }}>
                      <ZoomableImage uri={item.uri} onZoomChange={setZoomed} />
                    </View>
                  )}
                />
              ) : (
                <ZoomableImage uri={images[0]?.uri ?? ''} onZoomChange={setZoomed} />
              )}
            </Animated.View>
          </GestureDetector>

          <SafeAreaView style={styles.overlay} pointerEvents="box-none">
            <View style={styles.header} pointerEvents="box-none">
              {isGallery ? (
                <View style={styles.counterChip}>
                  <Text style={styles.counterText}>
                    {activeIndex + 1} / {images.length}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
                <Icon name="close" size={22} color={chrome.text} />
              </Pressable>
            </View>

            {activeDate ? (
              <View style={styles.dateWrap} pointerEvents="none">
                <Text style={styles.dateText}>{formatRelativeDate(activeDate, language)}</Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({ uri, onZoomChange }: { uri: string; onZoomChange: (zoomed: boolean) => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const setZoomed = (next: boolean) => {
    setIsZoomed(next);
    onZoomChange(next);
  };

  const resetZoom = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const nowZoomed = scale.value > 1.02;
      scheduleOnRN(setZoomed, nowZoomed);
      if (!nowZoomed) scheduleOnRN(resetZoom);
    });

  // Désactivé tant que l'image n'est pas zoomée : laisse le FlatList parent (mode galerie)
  // gérer le swipe horizontal entre photos sans compétition de gestes.
  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.imageWrap, animatedStyle]}>
        <Image source={{ uri }} style={styles.image} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: chrome.screen,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  counterChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  counterText: {
    color: chrome.text,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateWrap: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dateText: {
    color: chrome.text,
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  imageWrap: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
});
