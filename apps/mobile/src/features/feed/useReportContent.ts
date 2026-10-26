import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';

export type ReportTarget = 'post' | 'comment' | 'story';

/**
 * Signalement d'un contenu à la modération (page Modération de la console admin).
 * L'auteur et l'extrait sont relus côté serveur par la RPC report_content : le client
 * n'envoie que la cible et le motif. Un second signalement du même contenu est ignoré.
 */
export function useReportContent() {
  const { t } = useTranslation();
  const mutation = useMutation({
    mutationFn: async ({ type, id, motif }: { type: ReportTarget; id: string; motif: string }) => {
      const { error } = await supabase.rpc('report_content', { p_target_type: type, p_target_id: id, p_motif: motif });
      if (error) throw error;
    },
  });

  // Android affiche au plus trois boutons dans une Alert : deux motifs et Annuler.
  // `onDismiss` est appelé dès que la boîte se ferme (ex. reprendre la lecture d'une story).
  return (type: ReportTarget, id: string, onDismiss?: () => void) =>
    Alert.alert(t('community.reportTitle'), t('community.reportBody'), [
      { text: t('common.cancel'), style: 'cancel', onPress: onDismiss },
      ...(['reportInappropriate', 'reportSpam'] as const).map((key) => ({
        text: t(`community.${key}`),
        onPress: () => {
          onDismiss?.();
          mutation.mutate(
            { type, id, motif: t(`community.${key}`) },
            {
              onSuccess: () => Alert.alert(t('community.reportSent')),
              onError: () => Alert.alert(t('community.reportError')),
            },
          );
        },
      })),
    ], { cancelable: true, onDismiss });
}
