import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { GradientButton } from '@/components/GradientButton';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { ToxicityColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function GeoTagModal({ visible, onAccept, onDecline }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDecline} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={[styles.iconWrap, { backgroundColor: ToxicityColors.safe.bg }]}>
            <Icon name="location_on" size={28} color={ToxicityColors.safe.text} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('geoTag.title')}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{t('geoTag.body')}</Text>
          <GradientButton label={t('geoTag.accept')} onPress={onAccept} style={styles.acceptButton} />
          <Pressable onPress={onDecline} hitSlop={8}>
            <Text style={[styles.decline, { color: colors.muted }]}>{t('common.decline')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,12,9,0.6)',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  acceptButton: {
    width: '100%',
  },
  decline: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});
