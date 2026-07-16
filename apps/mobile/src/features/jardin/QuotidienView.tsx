import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCheckHealth, useMyGarden, useAddTrackingPhoto } from '@/api/hooks/useMyGarden';
import { useQuests } from '@/api/hooks/useQuests';
import type { DiagnosisResult } from '@/api/mock/diagnosis';
import { ErrorState } from '@/components/ErrorState';
import { CloneCard } from '@/features/jardin/CloneCard';
import { DiagnosisSheet } from '@/features/jardin/DiagnosisSheet';
import { QuestsCard } from '@/features/jardin/QuestsCard';
import { ReminderBanner } from '@/features/jardin/ReminderBanner';
import { scheduleReminderNotification } from '@/features/jardin/scheduleReminderNotification';
import { ScanToast } from '@/features/scan/ScanToast';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function QuotidienView() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const garden = useMyGarden();
  const quests = useQuests();
  const checkHealth = useCheckHealth();
  const addTrackingPhoto = useAddTrackingPhoto();

  const [diagnosis, setDiagnosis] = useState<{ idPlante: string; plantName: string; result: DiagnosisResult } | null>(null);
  const [schedulingReminder, setSchedulingReminder] = useState(false);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);

  const showToast = (title: string, subtitle: string) => {
    setToast({ title, subtitle });
    setTimeout(() => setToast(null), 2200);
  };

  const handlePhotoDeSuivi = async (idPlante: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;
    addTrackingPhoto.mutate({ idPlante, uri: result.assets[0].uri });
  };

  const handleCheckHealth = (idPlante: string, plantName: string) => {
    checkHealth.mutate(idPlante, {
      onSuccess: (result) => setDiagnosis({ idPlante, plantName, result }),
    });
  };

  const handleScheduleReminder = async () => {
    if (!diagnosis) return;
    setSchedulingReminder(true);
    try {
      await scheduleReminderNotification(diagnosis.plantName, 5, t('diagnosis.treatmentTitle'));
      setDiagnosis(null);
      showToast(t('jardin.reminderScheduledTitle'), t('jardin.reminderScheduledSub', { days: 5 }));
    } finally {
      setSchedulingReminder(false);
    }
  };

  const cloneNeedingWaterToday = (garden.data ?? []).filter((c) => c.nextWatering.key === 'jardin.today');

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {garden.isPending || quests.isPending ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : garden.isError || quests.isError ? (
          <ErrorState
            onRetry={() => {
              garden.refetch();
              quests.refetch();
            }}
          />
        ) : (
          <>
            <ReminderBanner
              count={cloneNeedingWaterToday.length}
              plantNames={cloneNeedingWaterToday.map((c) => c.plant.nomCommun)}
            />

            {quests.data ? <QuestsCard quests={quests.data.quests} coins={quests.data.coins} /> : null}

            {(garden.data ?? []).length === 0 ? (
              <Text style={[styles.empty, { color: colors.muted }]}>{t('jardin.emptyGarden')}</Text>
            ) : (
              (garden.data ?? []).map((clone) => (
                <CloneCard
                  key={clone.item.idPlante}
                  clone={clone}
                  onPhotoDeSuivi={() => handlePhotoDeSuivi(clone.item.idPlante)}
                  onCheckHealth={() => handleCheckHealth(clone.item.idPlante, clone.plant.nomCommun)}
                  checkingHealth={checkHealth.isPending && checkHealth.variables === clone.item.idPlante}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <DiagnosisSheet
        visible={diagnosis !== null}
        plantName={diagnosis?.plantName ?? ''}
        result={diagnosis?.result}
        onClose={() => setDiagnosis(null)}
        onScheduleReminder={handleScheduleReminder}
        schedulingReminder={schedulingReminder}
      />

      {toast ? <ScanToast title={toast.title} subtitle={toast.subtitle} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
