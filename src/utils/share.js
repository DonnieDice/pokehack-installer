import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

const WEB_MESSAGE = 'Sharing runs in the Android app only.';

export async function sharePatchedRom(path) {
  if (Platform.OS === 'web') {
    throw new Error(WEB_MESSAGE);
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }
  return Sharing.shareAsync(path, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Share patched ROM',
  });
}

export async function openInEmulator(path) {
  if (Platform.OS === 'web') {
    throw new Error(WEB_MESSAGE);
  }
  try {
    await IntentLauncher.startActivityAsync(
      'android.intent.action.VIEW',
      { data: path, type: 'application/octet-stream' }
    );
  } catch (e) {
    throw new Error(
      'No emulator found to open this ROM. Install one (e.g. My Boy!/Pizza Boy) then use Share.'
    );
  }
}
