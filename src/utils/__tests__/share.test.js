jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

const Sharing = require('expo-sharing');
const IntentLauncher = require('expo-intent-launcher');
const { sharePatchedRom, openInEmulator } = require('../share');

describe('sharePatchedRom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls Sharing.shareAsync when available', async () => {
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue({ dismissed: false });

    await sharePatchedRom('/path/to/rom.gba');

    expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith('/path/to/rom.gba', {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Share patched ROM',
    });
  });

  test('throws "Sharing is not available on this device" when unavailable', async () => {
    Sharing.isAvailableAsync.mockResolvedValue(false);

    await expect(sharePatchedRom('/path/to/rom.gba')).rejects.toThrow(
      'Sharing is not available on this device'
    );
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  test('throws "Sharing runs in the Android app only." on web', async () => {
    const originalOS = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';
    try {
      await expect(sharePatchedRom('/path/to/rom.gba')).rejects.toThrow(
        'Sharing runs in the Android app only.'
      );
      expect(Sharing.isAvailableAsync).not.toHaveBeenCalled();
    } finally {
      require('react-native').Platform.OS = originalOS;
    }
  });
});

describe('openInEmulator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls IntentLauncher.startActivityAsync with correct args', async () => {
    IntentLauncher.startActivityAsync.mockResolvedValue({});

    await openInEmulator('/path/to/rom.gba');

    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      'android.intent.action.VIEW',
      { data: '/path/to/rom.gba', type: 'application/octet-stream' }
    );
  });

  test('throws friendly message when no emulator is found', async () => {
    IntentLauncher.startActivityAsync.mockRejectedValue(new Error('Activity not found'));

    await expect(openInEmulator('/path/to/rom.gba')).rejects.toThrow(
      'No emulator found to open this ROM. Install one (e.g. My Boy!/Pizza Boy) then use Share.'
    );
  });

  test('throws "Sharing runs in the Android app only." on web', async () => {
    const originalOS = require('react-native').Platform.OS;
    require('react-native').Platform.OS = 'web';
    try {
      await expect(openInEmulator('/path/to/rom.gba')).rejects.toThrow(
        'Sharing runs in the Android app only.'
      );
      expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    } finally {
      require('react-native').Platform.OS = originalOS;
    }
  });
});
