import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * Alert.alert that also works in the browser.
 * React Native Web has no Alert, so on web the dialog becomes window.confirm:
 * one question per action button, in order; the first one the user accepts runs.
 * A cancel button needs no question: declining every action is the cancel.
 */
function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    NativeAlert.alert(title, message, buttons);
    return;
  }

  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const head = message ? `${title}\n\n${message}` : title;

  if (actions.length === 0) {
    window.alert(head);
    return;
  }
  if (actions.length === 1) {
    if (window.confirm(head)) actions[0].onPress?.();
    return;
  }
  for (const action of actions) {
    if (window.confirm(`${head}\n\n→ ${action.text ?? ''}`)) {
      action.onPress?.();
      return;
    }
  }
}

export const Alert = { alert };
