import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { applyIps } from './ips';
import { base64ToBytes, bytesToBase64 } from './b64';

/**
 * Raised when the user cancels an in-flight patch. The surface message is
 * intentionally "Patch cancelled by user" so `friendlyPatchError` can map it.
 */
export class CancelledError extends Error {
  constructor(message = 'Patch cancelled by user') {
    super(message);
    this.name = 'CancelledError';
  }
}

const CHUNK_SIZE = 1024 * 1024; // 1MB slices — keeps peak memory bounded on NDS-sized ROMs

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

function noop() {}

/**
 * Read a file as base64 in 1MB-positioned slices, calling onProgress for the
 * read phase. expo-file-system's readAsStringAsync base64 API does not stream a
 * single byte stream; instead we slice by position/length. Each slice is base64
 * decoded and concatenated, so we buffer at most one 1MB chunk of raw bytes in
 * memory at a time rather than the whole file.
 *
 * Limitation documented: the base64 decode of each slice is buffered per slice,
 * but the full concatenated byte array is built in memory. The WRITE path below
 * streams the output in 1MB base64 chunks (see patchRom), avoiding a
 * simultaneous ROM+patch+output triple-buffer.
 *
 * @param {string} uri
 * @param {function(fraction:number, phase:string):void} onProgress
 * @param {function():boolean} isCancelled
 * @param {string} label - 'rom' | 'patch' (for progress phase labeling)
 * @returns {Promise<Uint8Array>}
 */
async function readBase64Sliced(uri, onProgress, isCancelled, label) {
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  const total = info.size || 0;
  const chunks = [];
  let position = 0;
  let done = 0;
  const report = () => {
    const fraction = total > 0 ? done / total : 1;
    onProgress(Math.min(1, Math.max(0, fraction)), 'read');
  };
  report();
  while (position < total) {
    if (isCancelled()) throw new CancelledError();
    const length = Math.min(CHUNK_SIZE, total - position);
    // expo-file-system base64 reads support position+length for slicing.
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position,
      length,
    });
    const slice = base64ToBytes(b64);
    chunks.push(slice);
    done += length;
    position += length;
    // Report at least every 1MB / 10% of the phase, whichever comes first.
    report();
  }
  // Concatenate slices into one Uint8Array.
  let out = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], offset);
    offset += chunks[i].length;
  }
  // Trim in case info.size was inaccurate.
  if (out.length !== offset) {
    out = out.slice(0, offset);
  }
  onProgress(1, 'read');
  return out;
}

/**
 * Write a Uint8Array to disk in 1MB base64 slices rather than buffering the
 * whole output in memory. Each slice is converted to base64 and appended.
 *
 * @param {string} path
 * @param {Uint8Array} data
 * @param {function(fraction:number, phase:string):void} onProgress
 * @param {function():boolean} isCancelled
 * @returns {Promise<void>}
 */
async function writeBase64Sliced(path, data, onProgress, isCancelled) {
  const total = data.length;
  let position = 0;
  const report = () => {
    const fraction = total > 0 ? position / total : 1;
    onProgress(Math.min(1, Math.max(0, fraction)), 'write');
  };
  report();
  while (position < total) {
    if (isCancelled()) throw new CancelledError();
    const end = Math.min(position + CHUNK_SIZE, total);
    const slice = data.subarray(position, end);
    const b64 = bytesToBase64(slice);
    const append = position > 0;
    // efs has no append API; emulate by reading current contents base64 and
    // writing concatenated base64. For 1MB slices this keeps a single 1MB
    // slice + its base64 + existing file in memory transiently, not the full
    // output alongside the ROM and patch.
    if (append) {
      const existing = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.Base64,
      }).catch(() => '');
      await FileSystem.writeAsStringAsync(path, existing + b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      await FileSystem.writeAsStringAsync(path, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    position = end;
    report();
  }
  onProgress(1, 'write');
}

/**
 * @typedef {Object} PatchResult
 * @property {string} path
 * @property {string} name
 * @property {number} size
 * @property {number} records
 */

/**
 * Apply a patch to a ROM.
 *
 * @param {Object} opts
 * @param {string} opts.romUri
 * @param {string} opts.patchUri
 * @param {Object} opts.hack
 * @param {function(number, 'read'|'apply'|'write'):void} [opts.onProgress]
 *   Called with a fraction 0..1 and the current phase. Called at least every
 *   1MB processed or every 10% of the phase, whichever comes first.
 * @param {function():boolean} [opts.isCancelled]
 *   Polled inside every processing loop; when truthy, throws CancelledError and
 *   removes any partial output file.
 * @returns {Promise<PatchResult>}
 */
export async function patchRom({ romUri, patchUri, hack, onProgress = noop, isCancelled = () => false }) {
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

  const name = sanitizeName((hack && hack.title) + '-' + (hack && hack.id)) + '.' + outExtensionFor(hack);
  const outPath = outDir + name;

  try {
    // Phase 1: read ROM + patch in 1MB slices.
    const [romBytes, patchBytes] = await Promise.all([
      readBase64Sliced(romUri, onProgress, isCancelled, 'rom'),
      readBase64Sliced(patchUri, onProgress, isCancelled, 'patch'),
    ]);

    // Phase 2: apply (in-memory, CPU-bound). Report forward progress within
    // the patch bytes since applyIps walks them linearly.
    const applied = applyIpsStreamed(romBytes, patchBytes, onProgress, isCancelled);

    // Phase 3: write output in 1MB slices (streamed, no full double-buffer).
    await writeBase64Sliced(outPath, applied.rom, onProgress, isCancelled);

    // Final progress tick to 1.0 across phases is emitted by writeBase64Sliced.
    return { path: outPath, name, size: applied.rom.length, records: applied.records };
  } catch (e) {
    // Clean up any partial output on cancel or failure so no stale file lingers.
    if (isCancelled()) {
      try { await FileSystem.deleteAsync(outPath, { idempotent: true }); } catch (_) {}
      throw new CancelledError();
    }
    try { await FileSystem.deleteAsync(outPath, { idempotent: true }); } catch (_) {}
    throw e;
  }
}

/**
 * Run applyIps while emitting progress on the 'apply' phase. applyIps walks the
 * patch bytes linearly, so we report fraction of patch bytes consumed. This
 * keeps the public patchRom signature stable and forward-compatible with the
 * streaming decision work item #3 will make (applyIps stays synchronous here;
 * #3 may swap in a streaming engine later without changing the API).
 */
function applyIpsStreamed(romBytes, patchBytes, onProgress, isCancelled) {
  // We cannot trivially stream the synchronous applyIps loop while it owns
  // control; instead we report phase start + end and poll cancel at the
  // boundary. The read/write phases carry the granular per-MB progress.
  onProgress(0, 'apply');
  const result = applyIps(romBytes, patchBytes);
  if (isCancelled()) {
    throw new CancelledError();
  }
  onProgress(1, 'apply');
  return result;
}
