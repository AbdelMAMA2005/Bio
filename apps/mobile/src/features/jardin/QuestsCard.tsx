import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { Quest } from '@/api/types';
import { useAppTheme } from '@/theme';
import { AmberAccent } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  quests: Quest[];
  coins: number;
};

export function QuestsCard({ quests, coins }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="flag" size={18} color={colors.active} />
          <Text style={[styles.title, { color: colors.text }]}>{t('jardin.questsTitle')}</Text>
        </View>
        <View style={[styles.coinsChip, { backgroundColor: AmberAccent.bg }]}>
          <Icon name="paid" size={15} color={AmberAccent.text} />
          <Text style={[styles.coinsLabel, { color: AmberAccent.text }]}>{t('jardin.coinsBalance', { count: coins })}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {quests.map((quest) => (
          <View key={quest.id} style={styles.row}>
            <Icon
              name={quest.done ? 'check_circle' : 'radio_button_unchecked'}
              size={19}
              color={quest.done ? colors.active : colors.muted}
            />
            <Text
              style={[
                styles.label,
                { color: quest.done ? colors.muted : colors.text },
                quest.done && styles.labelDone,
              ]}>
              {t(quest.label)}
            </Text>
            {quest.rewardXp ? (
              <Text style={[styles.reward, { color: colors.active }]}>{t('scan.xpGain', { xp: quest.rewardXp })}</Text>
            ) : null}
            {quest.rewardCoins ? (
              <Text style={[styles.reward, { color: AmberAccent.text }]}>
                {t('jardin.coinsGain', { count: quest.rewardCoins })}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  coinsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  coinsLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
  },
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
  },
  labelDone: {
    textDecorationLine: 'line-through',
  },
  reward: {
    fontFamily: FontFamily.numericBold,
    fontSize: 11.5,
  },
});
