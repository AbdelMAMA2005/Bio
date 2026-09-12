import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useCheckHealth, useMarkWatered, useMyGarden, useAddTrackingPhoto } from '@/api/hooks/useMyGarden';
import { useQuests } from '@/api/hooks/useQuests';
import { useCreateReminder } from '@/api/hooks/useReminders';
import type { DiagnosisResult } from '@/api/mock/diagnosis';
import type { GardenClone } from '@/api/types';
import { ErrorState } from '@/components/ErrorState';
import { usePreferences } from '@/features/account/usePreferences';
import { CloneCard } from '@/features/jardin/CloneCard';
import { DiagnosisSheet } from '@/features/jardin/DiagnosisSheet';
import { useDeviceNotificationRegistration } from '@/features/jardin/useDeviceNotificationRegistration';
import { QuestsCard } from '@/features/jardin/QuestsCard';
import { ReminderBanner } from '@/features/jardin/ReminderBanner';
import { scheduleReminderNotification } from '@/features/jardin/scheduleReminderNotification';
import { useWateringNotifications } from '@/features/jardin/useWateringNotifications';
import { ScanToast } from '@/features/scan/ScanToast';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function QuotidienView() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { notifications: notificationsEnabled } = usePreferences();
  const garden = useMyGarden();
  const quests = useQuests();
  const checkHealth = useCheckHealth();
  const addTrackingPhoto = useAddTrackingPhoto();
  const createReminder = useCreateReminder();
  const markWatered = useMarkWatered();

  useWateringNotifications(garden.data, notificationsEnabled);
  useDeviceNotificationRegistration(notificationsEnabled);

  const [diagnosis, setDiagnosis] = useState<
    { collectionId: string; plantName: string; result: DiagnosisResult; diagnosedAt: string } | null
  >(null);
  const [schedulingReminder, setSchedulingReminder] = useState(false);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);

  const showToast = useCallback((title: string, subtitle: string) => {
    setToast({ title, subtitle });
    setTimeout(() => setToast(null), 2200);
  }, []);

  // Callbacks stabilisés (useCallback) : passés tels quels à chaque <CloneCard>, ils
  // permettent à son React.memo de sauter le re-rendu des cartes non concernées quand le
  // parent re-rend (toast, mutation en cours sur une autre carte...) — voir CloneCard.tsx.
  const handlePhotoDeSuivi = useCallback(
    async (collectionId: string) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (result.canceled || !result.assets[0]) return;
      addTrackingPhoto.mutate({ collectionId, uri: result.assets[0].uri });
    },
    [addTrackingPhoto],
  );

  const handleCheckHealth = useCallback(
    async (collectionId: string, idPlante: string, plantName: string) => {
      // Cahier des charges : "L'utilisateur prend une photo d'une feuille malade" — sans
      // cette étape, le back n'a aucune image à analyser pour une plante qui n'a pas encore
      // de photo de suivi (cas le plus courant juste après l'ajout au Jardin), et échoue.
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const photo = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (photo.canceled || !photo.assets[0]) return;

      checkHealth.mutate(
        { collectionId, idPlante, photoUri: photo.assets[0].uri },
        {
          onSuccess: (result) =>
            setDiagnosis({ collectionId, plantName, result, diagnosedAt: new Date().toISOString() }),
          onError: () => showToast(t('jardin.diagnosisErrorTitle'), t('jardin.diagnosisErrorSub')),
        },
      );
    },
    [checkHealth, showToast, t],
  );

  // Rouvre le diagnostic déjà sauvegardé (POST /collection/:id/diagnosis, réécrit à chaque
  // analyse) sans relancer d'appel réseau ni de nouvelle photo — bouton "Voir le
  // diagnostic", visible uniquement sur une plante actuellement malade (voir CloneCard.tsx).
  const handleViewDiagnosis = useCallback((clone: GardenClone) => {
    if (!clone.savedDiagnosis) return;
    setDiagnosis({
      collectionId: clone.item.id ?? clone.item.idPlante,
      plantName: clone.plant.nomCommun,
      result: clone.savedDiagnosis.result,
      diagnosedAt: clone.savedDiagnosis.date,
    });
  }, []);

  const handleMarkWatered = useCallback(
    (collectionId: string) => {
      markWatered.mutate(collectionId, {
        onSuccess: () => showToast(t('jardin.wateredToastTitle'), t('jardin.wateredToastSub')),
      });
    },
    [markWatered, showToast, t],
  );

  const handleScheduleReminder = async () => {
    if (!diagnosis) return;
    setSchedulingReminder(true);
    try {
      await scheduleReminderNotification(diagnosis.plantName, 5, t('diagnosis.treatmentTitle'));
      // Persistance côté back best-effort : la notification locale (ci-dessus) est déjà
      // programmée et fait foi côté utilisateur même si cet appel échoue (back down, etc.).
      createReminder.mutate({
        collectionId: diagnosis.collectionId,
        typeRappel: 'traitement',
        datePlanification: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });
      setDiagnosis(null);
      showToast(t('jardin.reminderScheduledTitle'), t('jardin.reminderScheduledSub', { days: 5 }));
    } finally {
      setSchedulingReminder(false);
    }
  };

  const cloneNeedingWaterToday = (garden.data ?? []).filter((c) => c.nextWatering.key === 'jardin.today');

  const renderClone = useCallback(
    ({ item: clone }: { item: GardenClone }) => {
      const collectionId = clone.item.id ?? clone.item.idPlante;
      return (
        <CloneCard
          clone={clone}
          onPhotoDeSuivi={handlePhotoDeSuivi}
          onCheckHealth={handleCheckHealth}
          onViewDiagnosis={handleViewDiagnosis}
          onMarkWatered={handleMarkWatered}
          checkingHealth={checkHealth.isPending && checkHealth.variables?.collectionId === collectionId}
          markingWatered={markWatered.isPending && markWatered.variables === collectionId}
        />
      );
    },
    [handlePhotoDeSuivi, handleCheckHealth, handleViewDiagnosis, handleMarkWatered, checkHealth, markWatered],
  );

  return (
    <View style={styles.fill}>
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
        <FlatList
          data={garden.data ?? []}
          // item.id (l'entrée de collection, unique) — pas idPlante (l'espèce, partagée par
          // toutes les captures de la même plante) : capturer deux fois la même espèce dans
          // le Jardin produisait des clés React dupliquées.
          keyExtractor={(clone) => clone.item.id ?? clone.item.idPlante}
          renderItem={renderClone}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (garden.hasNextPage && !garden.isFetchingNextPage) garden.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            garden.isFetchingNextPage ? <ActivityIndicator color={colors.active} style={styles.footerLoader} /> : null
          }
          ListHeaderComponent={
            <>
              <ReminderBanner
                count={cloneNeedingWaterToday.length}
                plantNames={cloneNeedingWaterToday.map((c) => c.plant.nomCommun)}
                onPress={
                  cloneNeedingWaterToday.length > 0
                    ? () => router.push(`/plante/${cloneNeedingWaterToday[0].plant.id}`)
                    : undefined
                }
              />
              {quests.data ? <QuestsCard quests={quests.data.quests} coins={quests.data.coins} /> : null}
            </>
          }
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{t('jardin.emptyGarden')}</Text>}
        />
      )}

      <DiagnosisSheet
        visible={diagnosis !== null}
        plantName={diagnosis?.plantName ?? ''}
        result={diagnosis?.result}
        diagnosedAt={diagnosis?.diagnosedAt}
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
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
