import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { applyIps } from './ips';
import { applyUps } from './ups';
import { applyBps } from './bps';
import { applyXdelta } from './xdelta';
import { base64ToBytes, bytesToBase64 } from './b64';
import { verifyRom } from './verify';

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
  const outDir = FileSystem.documentDirectory + 'patched/';
  try {
    await FileSystem.makeDirectory(outDir, { intermediates: true });
  } catch (e) {}

  // Verify the base ROM BEFORE reading the patch or writing any output.
  // A wrong dump must abort early — no partial patched file is produced.
  await verifyRom(romUri, (hack && hack.baseRomName) || '');

  let applied;
  if (fmt === 'xdelta') {
    // URI-first streaming: bypasses the whole-file base64 triple-buffer
    // (base64 string + bytes + output) that OOMs on 256MB NDS ROMs.
    // The xdelta decoder reads the ROM in 8MB chunks and uses file URIs
    // directly, never holding the full base64 representation in memory.
    const result = await applyXdelta(romUri, patchUri);
    applied = { rom: result.rom, records: result.records };
  } else {
    const romB64 = await FileSystem.readAsStringAsync(romUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const patchB64 = await FileSystem.readAsStringAsync(patchUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    let decoder;
    if (fmt === 'ips') {
      decoder = applyIps;
    } else if (fmt === 'bps') {
      decoder = applyBps;
    } else if (fmt === 'ups') {
      decoder = applyUps;
    } else {
      throw new Error(
        fmt.toUpperCase() + ' patching is not implemented yet (tracked as a work item). IPS works today.'
      );
    }

    const romBytes = base64ToBytes(romB64);
    const patchBytes = base64ToBytes(patchB64);
    applied = decoder(romBytes, patchBytes);
  }

  const name = sanitizeName((hack && hack.title) + '-' + (hack && hack.id)) + '.' + outExtensionFor(hack);
  const outPath = outDir + name;
  await FileSystem.writeAsStringAsync(outPath, bytesToBase64(applied.rom), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { path: outPath, name, size: applied.rom.length, records: applied.records };
}
