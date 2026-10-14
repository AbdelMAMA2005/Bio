import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Icon } from '@/components/Icon';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  icon: IconName;
  titleKey: string;
  bodyKey: string;
};

const SLIDES: Slide[] = [
  { icon: 'center_focus_strong', titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body' },
  { icon: 'potted_plant', titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { icon: 'forum', titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
];

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { complete } = useOnboarding();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      complete();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1 });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index !== null && first?.index !== undefined) setIndex(first.index);
  }).current;

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.skipRow}>
          <Pressable onPress={complete} hitSlop={8}>
            <Text style={[styles.skip, { color: colors.muted }]}>{t('onboarding.skip')}</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.titleKey}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.chip }]}>
                <Icon name={item.icon} size={48} color={colors.active} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t(item.titleKey)}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{t(item.bodyKey)}</Text>
            </View>
          )}
        />

        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.titleKey}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.active : colors.chip, width: i === index ? 20 : 6 },
              ]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton label={t(isLast ? 'onboarding.getStarted' : 'onboarding.next')} onPress={goNext} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  skip: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    padding: Spacing.xs,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
});
