import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import i18n from '@/i18n';

export async function getCurrentCoordinates() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('permission');
  if (!(await Location.hasServicesEnabledAsync())) {
    if (Platform.OS === 'android') {
      try { await Location.enableNetworkProviderAsync(); } catch { throw new Error('services'); }
    } else throw new Error('services');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 20000); }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } finally { if (timer) clearTimeout(timer); }
}

export function showLocationError(error: unknown) {
  const reason = error instanceof Error ? error.message : '';
  Alert.alert(i18n.t('location.errorTitle'), i18n.t(reason === 'permission' ? 'location.permission' : reason === 'services' ? 'location.services' : 'location.unavailable'), [
    { text: i18n.t('location.close'), style: 'cancel' },
    { text: i18n.t('location.settings'), onPress: () => { Linking.openSettings().catch(() => {}); } },
  ]);
}
