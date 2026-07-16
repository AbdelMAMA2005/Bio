import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useAppTheme } from '@/theme';
import { ToxicityColors } from '@/theme/colors';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  onRetry: () => void;
};

export function ErrorState({ onRetry }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: ToxicityColors.toxic.bg }]}>
        <Icon name="wifi" size={26} color={ToxicityColors.toxic.text} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{t('common.networkErrorTitle')}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t('common.networkErrorBody')}</Text>
      <SecondaryButton label={t('common.retry')} icon="refresh" onPress={onRetry} style={styles.retryButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
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
    fontFamily: FontFamily.bold,
    fontSize: 15,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryButton: {
    minWidth: 140,
  },
});
