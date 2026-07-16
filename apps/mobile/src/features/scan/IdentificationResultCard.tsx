import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CircleIconButton } from '@/components/CircleIconButton';
import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { IdentificationResult } from '@/api/types';
import { useAppTheme } from '@/theme';
import { RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import { toxicityDisplay } from '@/utils/toxicity';

type Props = {
  result: IdentificationResult;
  elapsedSeconds: number;
  onSelectJardin: () => void;
  onSelectHerbarium: () => void;
  onDismiss: () => void;
};

export function IdentificationResultCard({ result, elapsedSeconds, onSelectJardin, onSelectHerbarium, onDismiss }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { plant, confidence, xpAwarded } = result;

  const entrance = useSharedValue(0);
  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);

  useEffect(() => {
    entrance.value = withTiming(1, { duration: 320 });
    xpOpacity.value = withDelay(200, withTiming(1, { duration: 220 }));
    xpTranslateY.value = withDelay(200, withTiming(-18, { duration: 900 }));
    xpOpacity.value = withDelay(1000, withTiming(0, { duration: 400 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 40 }],
  }));
  const xpStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpTranslateY.value }],
  }));

  const rarityColors = (isDark ? RarityColors : RarityColorsLight)[plant.rarete];
  const toxicity = toxicityDisplay(plant.toxicite);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }, cardStyle]}>
        <View style={styles.closeButton}>
          <CircleIconButton icon="close" onPress={onDismiss} size={34} />
        </View>

        <View style={styles.header}>
          <View style={[styles.plantIconWrap, { backgroundColor: rarityColors.bg }]}>
            <Icon name={plant.icon} size={32} color={rarityColors.text} />
            <Animated.Text style={[styles.xpFloating, xpStyle]}>{t('scan.xpGain', { xp: xpAwarded })}</Animated.Text>
          </View>
          <View style={styles.headerText}>
            <View style={[styles.rarityChip, { backgroundColor: rarityColors.bg }]}>
              <Text style={[styles.rarityLabel, { color: rarityColors.text }]}>{t(`rarity.${plant.rarete}`)}</Text>
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{plant.nomCommun}</Text>
            <Text style={[styles.scientific, { color: colors.muted }]}>{plant.nomScientifique}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.family, { color: colors.muted }]}>{t('plant.familyLabel', { family: plant.famille })}</Text>
          <Text style={[styles.identifiedIn, { color: colors.muted }]}>
            {t('scan.identifiedIn', { seconds: elapsedSeconds.toFixed(1) })} · {confidence}%
          </Text>
        </View>

        <View style={[styles.toxicityBadge, { backgroundColor: toxicity.bg }]}>
          <Icon name={toxicity.icon} size={16} color={toxicity.text} />
          <Text style={[styles.toxicityLabel, { color: toxicity.text }]}>{t(toxicity.labelKey)}</Text>
        </View>

        <View style={styles.actions}>
          <SecondaryButton
            label={t('scan.addToJardin')}
            icon="potted_plant"
            onPress={onSelectJardin}
            style={styles.actionButton}
          />
          <SecondaryButton
            label={t('scan.addToHerbarium')}
            icon="menu_book"
            onPress={onSelectHerbarium}
            style={styles.actionButton}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingRight: 40,
  },
  plantIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpFloating: {
    position: 'absolute',
    top: -6,
    color: '#a3e635',
    fontFamily: FontFamily.numericBold,
    fontSize: 13,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  rarityChip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: 2,
  },
  rarityLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
  },
  scientific: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  family: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
  },
  identifiedIn: {
    fontFamily: FontFamily.numeric,
    fontSize: 11.5,
  },
  toxicityBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  toxicityLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
