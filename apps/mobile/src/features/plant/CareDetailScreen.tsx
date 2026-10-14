import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import type { IconName } from '@/theme/icons';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export type CareType = 'light' | 'soil' | 'watering' | 'propagation';

const CARE_ICON: Record<CareType, IconName> = {
  light: 'wb_sunny',
  soil: 'grass',
  watering: 'water_drop',
  propagation: 'eco',
};

function isCareType(value: string | undefined): value is CareType {
  return value === 'light' || value === 'soil' || value === 'watering' || value === 'propagation';
}

type Props = {
  type: string | undefined;
  text: string | undefined;
};

/** Page dédiée à un seul conseil d'entretien, ouverte depuis le lien "plus" de la fiche plante quand le texte est tronqué. */
export function CareDetailScreen({ type, text }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const careType: CareType = isCareType(type) ? type : 'light';

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleRow}>
            <Icon name={CARE_ICON[careType]} size={22} color={colors.active} />
            <Text style={[styles.title, { color: colors.text }]}>{t(`plant.care.${careType}`)}</Text>
          </View>
          <Text style={[styles.text, { color: colors.text }]}>{text || ''}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 20,
  },
  text: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
});
