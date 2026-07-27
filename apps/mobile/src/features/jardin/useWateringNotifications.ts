import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { GardenClone } from '@/api/types';

// Même contournement que googleAuth.native.ts / scheduleReminderNotification.ts (voir
// AGENTS.md, "Expo HAS CHANGED") : le module natif expo-notifications plante à
// l'évaluation dans Expo Go SDK 53+ (remote push retiré) — jamais importé tant qu'on y
// tourne, détecté via executionEnvironment plutôt qu'un try/catch après coup.
const runningInExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const WATERING_NOTIFICATION_PREFIX = 'watering-';

function identifierFor(clone: GardenClone): string {
  return `${WATERING_NOTIFICATION_PREFIX}${clone.item.id ?? clone.item.idPlante}`;
}

/**
 * Programme une vraie notification push locale (expo-notifications) à l'échéance
 * `prochainArrosage` de chaque clone du Jardin, en respectant la préférence
 * "notifications" de l'utilisateur (AccountScreen, voir usePreferences). Un identifiant
 * fixe par clone (`watering-<collectionId>`) fait que reprogrammer remplace silencieusement
 * l'ancienne notification (pas de doublon à chaque refetch du Jardin après un
 * marquage "arrosé"). Les échéances déjà dues (aujourd'hui/en retard) ne sont jamais
 * programmées dans le passé — le bandeau "N arrosages prévus aujourd'hui" les couvre déjà,
 * et une notification à date passée se déclencherait immédiatement à chaque
 * reprogrammation.
 */
export function useWateringNotifications(clones: GardenClone[] | undefined, enabled: boolean): void {
  const { t } = useTranslation();

  useEffect(() => {
    if (runningInExpoGo) return;
    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        if (!enabled || !clones) {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          await Promise.all(
            scheduled
              .filter((n) => n.identifier.startsWith(WATERING_NOTIFICATION_PREFIX))
              .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
          );
          return;
        }

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        // Retire les notifications d'un clone qui n'est plus dans le Jardin (supprimé) —
        // sans ça, une notification programmée avant suppression resterait active.
        const validIdentifiers = new Set(clones.map(identifierFor));
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Promise.all(
          scheduled
            .filter((n) => n.identifier.startsWith(WATERING_NOTIFICATION_PREFIX) && !validIdentifiers.has(n.identifier))
            .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
        );

        for (const clone of clones) {
          if (cancelled) return;
          const dueDate = clone.item.prochainArrosage ? new Date(clone.item.prochainArrosage) : null;
          if (!dueDate || dueDate.getTime() <= Date.now()) continue;

          await Notifications.scheduleNotificationAsync({
            identifier: identifierFor(clone),
            content: {
              title: clone.plant.nomCommun,
              body: t('jardin.wateringNotificationBody'),
              data: { type: 'watering', plantId: clone.plant.id },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
          });
        }
      } catch {
        // Best-effort : la programmation locale ne doit jamais faire planter Mon Quotidien
        // (permission refusée, module natif absent sur ce build...).
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clones, enabled, t]);
}

/**
 * Écoute le tap sur une notification d'arrosage (app au premier plan, en arrière-plan ou
 * fermée — `addNotificationResponseReceivedListener` couvre les trois, contrairement à un
 * simple état React) et navigue vers la fiche de la plante concernée
 * (`/plante/[id]`, même route que HerbariumView — voir usePlantDetail). Monté une seule
 * fois au niveau racine (_layout.tsx) pour capter un tap quelle que soit l'écran affiché.
 */
export function useWateringNotificationTapNavigation(): void {
  const router = useRouter();

  useEffect(() => {
    if (runningInExpoGo) return;
    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { type?: string; plantId?: string } | undefined;
        if (data?.type === 'watering' && data.plantId) {
          router.push(`/plante/${data.plantId}`);
        }
      });
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);
}
