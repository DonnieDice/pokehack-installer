import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { applyIps } from './ips';
import { base64ToBytes, bytesToBase64 } from './b64';

function outExtensionFor(hack) {
  const base = (hack && hack.baseRomName) || '';
  const parts = base.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'gba';
}

export function sanitizeName(text) {
  return (text || 'patched')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function patchRom({ romUri, patchUri, hack }) {
  if (Platform.OS === 'web') {
    throw new Error('Patching runs in the Android app only. The web preview is for browsing the catalog.');
  }
  const fmt = ((hack && hack.patchFormat) || 'ips').toLowerCase();
  if (fmt !== 'ips') {
    throw new Error(
      fmt.toUpperCase() + ' patching is not implemented yet (tracked as a work item). IPS works today.'
    );
  }
  const outDir = FileSystem.documentDirectory + 'patched/';
  try {
    await FileSystem.makeDirectory(outDir, { intermediates: true });
  } catch (e) {}

  const romB64 = await FileSystem.readAsStringAsync(romUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const patchB64 = await FileSystem.readAsStringAsync(patchUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const romBytes = base64ToBytes(romB64);
  const patchBytes = base64ToBytes(patchB64);
  const applied = applyIps(romBytes, patchBytes);

  const name = sanitizeName((hack && hack.title) + '-' + (hack && hack.id)) + '.' + outExtensionFor(hack);
  const outPath = outDir + name;
  await FileSystem.writeAsStringAsync(outPath, bytesToBase64(applied.rom), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { path: outPath, name, size: applied.rom.length, records: applied.records };
}
