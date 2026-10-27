import { Alert, Platform, type AlertButton, type AlertOptions } from 'react-native';

/**
 * Même signature qu'Alert.alert, qui ne fait rien sur le web (react-native-web) : les
 * confirmations de suppression ou de signalement y étaient donc sans effet. Sur le web, on
 * utilise les boîtes du navigateur : alert pour un message, confirm pour une action, et une
 * liste numérotée quand il y a plusieurs choix.
 */
export function showDialog(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons, options);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((button) => button.style !== 'cancel');
  const cancel = () => {
    (buttons ?? []).find((button) => button.style === 'cancel')?.onPress?.();
    options?.onDismiss?.();
  };

  if (actions.length === 0) {
    window.alert(text);
    cancel();
  } else if (actions.length === 1) {
    if (window.confirm(text)) actions[0].onPress?.();
    else cancel();
  } else {
    const list = actions.map((action, index) => `${index + 1}. ${action.text}`).join('\n');
    const picked = actions[Number(window.prompt(`${text}\n\n${list}`, '1')) - 1];
    if (picked) picked.onPress?.();
    else cancel();
  }
}
