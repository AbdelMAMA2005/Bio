import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CircleIconButton } from '@/components/CircleIconButton';
import { GradientButton } from '@/components/GradientButton';
import { Icon } from '@/components/Icon';
import { useAddToCollection, useIdentify } from '@/api/hooks/useIdentify';
import { useAddTrackingPhoto } from '@/api/hooks/useMyGarden';
import { useAuth } from '@/features/auth/AuthProvider';
import { GeoTagModal } from '@/features/scan/GeoTagModal';
import { IdentificationResultCard } from '@/features/scan/IdentificationResultCard';
import { ScanToast } from '@/features/scan/ScanToast';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Phase = 'idle' | 'analyzing' | 'result';
type CollectionType = 'owned' | 'discovered';

export function ScanScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { user, addXp } = useAuth();
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [pendingType, setPendingType] = useState<CollectionType | null>(null);
  const [toast, setToast] = useState<{ title: string; subtitle: string; variant?: 'success' | 'error' } | null>(null);

  const identify = useIdentify();
  const addToCollection = useAddToCollection();
  const addTrackingPhoto = useAddTrackingPhoto();

  const resetScan = () => {
    setPhase('idle');
    setCapturedUri(null);
    setElapsedSeconds(0);
    identify.reset();
  };

  const handleCapture = async () => {
    if (phase !== 'idle' || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      const startedAt = Date.now();
      setCapturedUri(photo.uri);
      setPhase('analyzing');
      identify.mutate(
        { photoUri: photo.uri },
        {
          onSuccess: (result) => {
            setElapsedSeconds((Date.now() - startedAt) / 1000);
            setPhase('result');
            if (result.plant.rarete !== 'commun') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
          },
          onError: (error) => {
            resetScan();
            // 404 = plante non reconnue ou confiance trop faible (voir
            // identification.service.ts) : message actionnable plutôt qu'un échec
            // silencieux qui laisserait croire que rien ne s'est passé.
            const notRecognized = error instanceof Error && 'status' in error && error.status === 404;
            setToast({
              title: notRecognized ? t('scan.notRecognized') : t('scan.genericError'),
              subtitle: '',
              variant: 'error',
            });
            setTimeout(() => setToast(null), 3200);
          },
        },
      );
    } catch {
      // Camera not ready yet: ignore, the user can tap again.
    }
  };

  const finalizeAdd = async (geoTagged: boolean) => {
    if (!identify.data || !pendingType) return;
    const type = pendingType;
    // Capturée avant resetScan() (qui remet capturedUri à null) : c'est la vraie photo
    // prise par l'utilisateur, à persister telle quelle plutôt que de laisser la fiche
    // retomber sur l'image générique de l'espèce (plant.urlImage).
    const photoUri = capturedUri;

    let coords: { latitude: number; longitude: number } | undefined;
    if (geoTagged) {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        }
      } catch {
        // Position indisponible (émulateur sans GPS, permission refusée en cours de route, etc.) : on continue sans.
      }
    }

    addToCollection.mutate(
      { plant: identify.data.plant, type, geoTagged, ...coords },
      {
        onSuccess: ({ collectionId }) => {
          // Best-effort : la capture a déjà réussi (toast affiché) même si cet upload
          // échoue (réseau...), la fiche retombe alors sur l'image générique de l'espèce.
          if (photoUri) {
            addTrackingPhoto.mutate({ collectionId, uri: photoUri });
          }
        },
      },
    );
    addXp(identify.data.xpAwarded);
    setPendingType(null);
    setToast({
      title: t(type === 'owned' ? 'toast.addedToJardinTitle' : 'toast.addedToHerbariumTitle'),
      subtitle: t(type === 'owned' ? 'toast.addedToJardinSub' : 'toast.addedToHerbariumSub'),
    });
    setTimeout(() => setToast(null), 2200);
    resetScan();
  };

  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: colors.screen }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.screen }]}>
        <SafeAreaView style={[styles.fill, styles.permissionCenter]}>
          <View style={[styles.permissionIconWrap, { backgroundColor: colors.chip }]}>
            <Icon name="photo_camera" size={40} color={colors.active} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>{t('scan.permissionTitle')}</Text>
          <Text style={[styles.permissionBody, { color: colors.muted }]}>{t('scan.permissionBody')}</Text>
          <GradientButton
            label={t('scan.permissionCta')}
            onPress={() => requestPermission()}
            style={styles.permissionCta}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing="back" flash={flashOn ? 'on' : 'off'} />

      {capturedUri && phase !== 'idle' ? (
        <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      {phase !== 'idle' ? <View style={styles.dimOverlay} /> : null}

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.levelChip} onPress={() => router.push('/compte')}>
            <Avatar uri={user?.urlAvatar} name={user?.pseudo ?? '?'} size={32} />
            <View style={styles.levelTextWrap}>
              <Text style={styles.levelLabel}>{t('common.level', { level: user?.niveau ?? 1 })}</Text>
              <Text style={styles.xpLabel}>{t('common.xp', { count: user?.xp ?? 0 })}</Text>
            </View>
          </Pressable>
          <CircleIconButton
            icon="flash_on"
            variant="glass"
            color={flashOn ? '#a3e635' : '#f0f7f2'}
            onPress={() => setFlashOn((prev) => !prev)}
          />
        </View>

        {phase === 'idle' ? (
          <>
            <View style={styles.viewfinderWrap} pointerEvents="none">
              <View style={styles.viewfinder} />
            </View>
            <View style={styles.bottomBar}>
              <Pressable onPress={handleCapture} style={styles.captureOuter}>
                <View style={styles.captureInner} />
              </Pressable>
            </View>
          </>
        ) : null}

        {phase === 'analyzing' ? (
          <View style={styles.center}>
            <ActivityIndicator color="#a3e635" size="large" />
            <Text style={styles.analyzingText}>{t('scan.analyzing')}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      {phase === 'result' && identify.data && capturedUri ? (
        <IdentificationResultCard
          result={identify.data}
          photoUri={capturedUri}
          elapsedSeconds={elapsedSeconds}
          onSelectJardin={() => setPendingType('owned')}
          onSelectHerbarium={() => setPendingType('discovered')}
          onDismiss={resetScan}
        />
      ) : null}

      <GeoTagModal visible={pendingType !== null} onAccept={() => finalizeAdd(true)} onDecline={() => finalizeAdd(false)} />

      {toast ? (
        <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="none">
          <ScanToast title={toast.title} subtitle={toast.subtitle} variant={toast.variant} />
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6,12,9,0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(10,18,13,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30,
    paddingVertical: 6,
    paddingRight: 14,
    paddingLeft: 6,
  },
  levelTextWrap: {
    gap: 1,
  },
  levelLabel: {
    color: '#f0f7f2',
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  xpLabel: {
    color: '#a3e635',
    fontFamily: FontFamily.numeric,
    fontSize: 10,
  },
  viewfinderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: '74%',
    aspectRatio: 1,
    borderRadius: Radius.xxl,
    borderWidth: 2,
    borderColor: 'rgba(240,247,242,0.55)',
    borderStyle: 'dashed',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  captureOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'rgba(240,247,242,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f0f7f2',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  analyzingText: {
    color: 'rgba(240,247,242,0.85)',
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  permissionCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  permissionIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  permissionTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    textAlign: 'center',
  },
  permissionBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  permissionCta: {
    width: '100%',
  },
});
