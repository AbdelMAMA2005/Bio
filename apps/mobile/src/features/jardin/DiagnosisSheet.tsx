import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/GradientButton';
import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { DiagnosisResult } from '@/api/mock/diagnosis';
import { useAppTheme } from '@/theme';
import { AmberAccent, ToxicityColors } from '@/theme/colors';
import type { IconName } from '@/theme/icons';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  visible: boolean;
  plantName: string;
  result: DiagnosisResult | undefined;
  reminderDays?: number;
  onClose: () => void;
  onScheduleReminder: () => void;
  schedulingReminder?: boolean;
};

export function DiagnosisSheet({
  visible,
  plantName,
  result,
  reminderDays = 5,
  onClose,
  onScheduleReminder,
  schedulingReminder,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  if (!result) return null;

  const isDisease = result.status === 'disease';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={[styles.handle, { backgroundColor: colors.hairline }]} />

          <View style={[styles.iconWrap, { backgroundColor: isDisease ? AmberAccent.bg : ToxicityColors.safe.bg }]}>
            <Icon
              name={(isDisease ? result.diseaseIcon : 'health_and_safety') as IconName}
              size={30}
              color={isDisease ? AmberAccent.text : ToxicityColors.safe.text}
            />
          </View>

          {isDisease ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t('diagnosis.title', { disease: result.diseaseName })}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {t('diagnosis.meta', { confidence: result.confidence, plant: plantName })}
              </Text>

              <View style={[styles.treatmentBox, { backgroundColor: colors.chip }]}>
                <Text style={[styles.treatmentTitle, { color: colors.text }]}>{t('diagnosis.treatmentTitle')}</Text>
                <Text style={[styles.treatmentBody, { color: colors.muted }]}>{result.treatment}</Text>
              </View>

              <View style={styles.actions}>
                <SecondaryButton label={t('common.close')} onPress={onClose} style={styles.actionButton} />
                <GradientButton
                  label={t('diagnosis.reminderCta', { days: reminderDays })}
                  onPress={onScheduleReminder}
                  loading={schedulingReminder}
                  style={styles.actionButton}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{t(`health.sain`)}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>
                {t('diagnosis.meta', { confidence: result.confidence, plant: plantName })}
              </Text>
              <SecondaryButton label={t('common.close')} onPress={onClose} style={styles.fullWidthButton} />
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6,12,9,0.6)',
  },
  sheet: {
    borderWidth: 1,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    textAlign: 'center',
  },
  meta: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  treatmentBox: {
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    marginBottom: Spacing.md,
  },
  treatmentTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  treatmentBody: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  actionButton: {
    flex: 1,
  },
  fullWidthButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
});
