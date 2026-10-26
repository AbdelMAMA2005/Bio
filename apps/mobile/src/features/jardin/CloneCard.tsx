import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { PlantPhoto } from '@/components/PlantPhoto';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ownPhotoUrl, type GardenClone } from '@/api/types';
import { PhotoTimeline } from '@/features/jardin/PhotoTimeline';
import { useAppTheme } from '@/theme';
import { HealthColors, HealthIcons, RarityColors, RarityColorsLight } from '@/theme/colors';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  clone: GardenClone;
  /**
   * Reçoivent l'id de la collection (`clone.item.id ?? clone.item.idPlante`) plutôt qu'une
   * closure déjà liée : garder des callbacks stables (`useCallback` côté QuotidienView.tsx)
   * permet à `React.memo` ci-dessous d'éviter de re-rendre les cartes non concernées par un
   * changement d'état du parent (toast, mutation en cours sur une autre carte...).
   */
  onPhotoDeSuivi: (collectionId: string) => void;
  onCheckHealth: (collectionId: string, idPlante: string, plantName: string) => void;
  onViewDiagnosis: (clone: GardenClone) => void;
  onMarkWatered: (collectionId: string) => void;
  checkingHealth?: boolean;
  markingWatered?: boolean;
};

export const CloneCard = memo(function CloneCard({
  clone,
  onPhotoDeSuivi,
  onCheckHealth,
  onViewDiagnosis,
  onMarkWatered,
  checkingHealth,
  markingWatered,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { plant, item, nextWatering, lightHint } = clone;
  const collectionId = item.id ?? item.idPlante;
  const photoUrl = ownPhotoUrl(item);
  const heroImageUri = photoUrl ?? plant.urlImage ?? undefined;
  const [heroViewerOpen, setHeroViewerOpen] = useState(false);
  const etatSante = item.etatSante ?? 'sain';
  const rarityPalette = (isDark ? RarityColors : RarityColorsLight)[plant.rarete];
  const healthColor = HealthColors[etatSante];
  const isSick = etatSante === 'malade';
  // Le bouton ne réapparaît que sur une plante ACTUELLEMENT malade avec un diagnostic
  // sauvegardé : une vérification ultérieure qui la déclare saine/guérie masque le bouton
  // (rien d'actionnable à revoir), mais le diagnostic reste en base (etatSante et
  // dernierDiagnostic sont toujours mis à jour ensemble par diagnose-health, donc pas
  // de risque d'afficher un diagnostic "malade" périmé pendant que l'état est déjà sain).
  const hasSavedDiagnosis = isSick && !!clone.savedDiagnosis;

  const wateringLabel =
    nextWatering.key === 'jardin.inDays'
      ? t('jardin.waterIn', { when: t('jardin.inDays', { count: nextWatering.count }) })
      : t('jardin.waterIn', { when: t(nextWatering.key) });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.header}>
        <View style={styles.thumbWrap}>
          <Pressable
            style={[styles.thumb, { backgroundColor: rarityPalette.bg }]}
            disabled={!heroImageUri}
            onPress={() => setHeroViewerOpen(true)}>
            <PlantPhoto
              ownPhotoUrl={photoUrl}
              catalogUrl={plant.urlImage}
              icon={plant.icon}
              iconSize={28}
              iconColor={rarityPalette.text}
            />
          </Pressable>
          <View style={[styles.healthDot, { backgroundColor: healthColor, borderColor: colors.surface }]} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{plant.nomCommun}</Text>
          <Text style={[styles.latin, { color: colors.muted }]} numberOfLines={1}>
            {plant.nomScientifique}
          </Text>
          <View style={styles.healthRow}>
            <Icon name={HealthIcons[etatSante]} size={13} color={healthColor} />
            <Text style={[styles.healthLabel, { color: healthColor }]}>{t(`health.${etatSante}`)}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="water_drop" size={13} color={colors.muted} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>{wateringLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="wb_sunny" size={13} color={colors.muted} />
              <Text style={[styles.metaLabel, { color: colors.muted }]}>{lightHint}</Text>
            </View>
          </View>
        </View>
      </View>

      {hasSavedDiagnosis ? (
        <SecondaryButton
          label={t('jardin.viewDiagnosis')}
          icon="visibility"
          destructive
          onPress={() => onViewDiagnosis(clone)}
          style={styles.viewDiagnosisButton}
        />
      ) : null}

      {nextWatering.key === 'jardin.today' ? (
        <SecondaryButton
          label={t('jardin.markWatered')}
          icon="water_drop"
          loading={markingWatered}
          onPress={() => onMarkWatered(collectionId)}
          style={styles.viewDiagnosisButton}
        />
      ) : null}

      <PhotoTimeline photos={item.historiquePhotos ?? []} />

      <View style={styles.actions}>
        <SecondaryButton
          label={t('jardin.photoDeSuivi')}
          icon="add_a_photo"
          onPress={() => onPhotoDeSuivi(collectionId)}
          style={styles.actionButton}
        />
        <SecondaryButton
          label={t('jardin.checkHealth')}
          icon="health_and_safety"
          destructive={isSick}
          loading={checkingHealth}
          onPress={() => onCheckHealth(collectionId, item.idPlante, plant.nomCommun)}
          style={styles.actionButton}
        />
      </View>

      {heroViewerOpen && heroImageUri ? (
        <ImageViewerModal images={[{ uri: heroImageUri }]} onClose={() => setHeroViewerOpen(false)} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  info: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FontFamily.display,
    fontSize: 17,
  },
  latin: {
    fontFamily: FontFamily.latin,
    fontSize: 13,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  viewDiagnosisButton: {
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
