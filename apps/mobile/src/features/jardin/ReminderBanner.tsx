import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { ToxicityColors } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  count: number;
  plantNames: string[];
  onPress?: () => void;
};

export function ReminderBanner({ count, plantNames, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  if (count === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={[styles.iconWrap, { backgroundColor: ToxicityColors.safe.bg }]}>
        <Icon name="notifications_active" size={20} color={ToxicityColors.safe.text} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{t('jardin.reminderTitle', { count })}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
          {plantNames.join(' · ')}
        </Text>
      </View>
      <Icon name="chevron_right" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
});
