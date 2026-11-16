import { Platform, Share } from 'react-native';

/**
 * Share a text. On the phone: the system share sheet.
 * In the browser: the Web Share API where it exists (mobile browsers),
 * otherwise copy to the clipboard and say so.
 */
export async function shareText(message: string, copiedNotice: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await Share.share({ message });
    return;
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.share) {
    try {
      await nav.share({ text: message });
      return;
    } catch {
      // cancelled or not allowed: fall back to copying
    }
  }
  try {
    await nav?.clipboard?.writeText(message);
    window.alert(copiedNotice);
  } catch {
    window.prompt(copiedNotice, message);
  }
}
