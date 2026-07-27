// Import différé (pas au niveau module) : le module expo-notifications exécute du
// code natif à l'import (auto-registration du push token) qui plante en Expo Go
// SDK 53+ (le remote push y a été retiré) et fait planter tout le bundle avant même
// le rendu de React — écran blanc sans erreur visible. En ne l'important qu'ici, au
// moment de l'appel, ça n'affecte plus le boot de l'app.
export async function scheduleReminderNotification(
  plantName: string,
  days: number,
  body: string,
): Promise<boolean> {
  const Notifications = await import('expo-notifications');

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
