import * as Notifications from 'expo-notifications';

export async function scheduleReminderNotification(
  plantName: string,
  days: number,
  body: string,
): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  await Notifications.scheduleNotificationAsync({
    content: { title: plantName, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: days * 24 * 60 * 60,
    },
  });
  return true;
}
