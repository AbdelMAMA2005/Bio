import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const NOTIFICATIONS_KEY = 'planai.pref.notifications';
const GEO_PRIVACY_KEY = 'planai.pref.geo-ask-every-time';

function usePersistedBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    AsyncStorage.getItem(key).then((stored) => {
      if (stored !== null) setValue(stored === '1');
    });
  }, [key]);

  const update = (next: boolean) => {
    setValue(next);
    AsyncStorage.setItem(key, next ? '1' : '0').catch(() => {});
  };

  return [value, update] as const;
}

export function usePreferences() {
  const [notifications, setNotifications] = usePersistedBoolean(NOTIFICATIONS_KEY, true);
  const [geoPrivacy, setGeoPrivacy] = usePersistedBoolean(GEO_PRIVACY_KEY, true);

  return { notifications, setNotifications, geoPrivacy, setGeoPrivacy };
}
