import * as FileSystem from 'expo-file-system';
import { getBaseRomSpec } from '../data/baseRoms';
import { sha256 } from './sha256';
import { base64ToBytes } from './b64';

/**
 * Read the full contents of `romUri` into a Uint8Array.
 *
 * expo-file-system exposes byte content via `readAsStringAsync` with the
 * `Base64` encoding, which we decode back to bytes. For the ROM sizes in scope
 * (GBA 16 MiB, GBC 2 MiB) this is acceptable. The 256 MiB NDS Black 2 dump as
 * base64 is ~350 MB in memory — large but bounded — and is documented as a
 * platform/memory limitation in the MR. Chunked hashing would require a
 * streaming SHA-256; the pure-JS implementation here digests in one pass over
 * the full byte buffer.
 */
async function readRomBytes(romUri) {
  const b64 = await FileSystem.readAsStringAsync(romUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToBytes(b64);
}

/**
 * Verify a picked ROM against the manifest entry for `expectedName`.
 *
 * Checks file SIZE first (cheap — no full read required beyond stat), then
 * SHA-256. Order matters: size mismatches are caught before the expensive
 * hash pass. Throws a single Error on any mismatch; the Error carries the
 * picked name/size and the expected name/size + short hash so callers (and
 * the UI) can present a friendly message naming the expected dump.
 *
 * @param {string} romUri - local URI of the picked ROM file.
 * @param {string} expectedName - `baseRomName` from hacks.js.
 * @returns {Promise<{size:number, sha256:string}>} the verified ROM's size and digest.
 * @throws {Error} on size mismatch, hash mismatch, missing manifest entry, or
 *   an unverified (REPLACE_ME) manifest hash — never a silent pass.
 */
export async function verifyRom(romUri, expectedName) {
  // Resolve the manifest entry first: a missing entry is an explicit error,
  // not a silent pass (per task spec).
  const spec = getBaseRomSpec(expectedName);

  const info = await FileSystem.getInfoAsync(romUri);
  if (!info.exists) {
    throw new Error('ROM file does not exist at ' + romUri);
  }

  const pickedSize = info.size;
  if (pickedSize !== spec.size) {
    const e = new Error(
      'Wrong base ROM: picked ' +
        formatName(romUri, pickedSize) +
        ' (' + pickedSize + ' bytes). Expected ' +
        expectedName + ' (' + spec.size + ' bytes, SHA256 ' + shortHash(spec.sha256) +
        '...). Re-dump your legally-owned cart.'
    );
    e.code = 'ROM_SIZE_MISMATCH';
    e.expectedName = expectedName;
    e.expectedSize = spec.size;
    e.pickedSize = pickedSize;
    throw e;
  }

  // Hash only after the size matches (cheap check above avoided the big read).
  const bytes = await readRomBytes(romUri);
  const pickedHash = sha256(bytes);

  if (spec.sha256 === 'REPLACE_ME' || spec.sha256 === '') {
    // An unverified manifest entry must NOT silently green-light a ROM. Block.
    const e = new Error(
      'Wrong base ROM: picked ' +
        formatName(romUri, pickedSize) +
        ' (' + pickedSize + ' bytes, SHA256 ' + pickedHash.slice(0, 12) +
        '...). Expected ' + expectedName + ' (' + spec.size + ' bytes, SHA256 ' +
        shortHash(spec.sha256) + '...). Re-dump your legally-owned cart.'
    );
    e.code = 'ROM_HASH_UNVERIFIED';
    e.expectedName = expectedName;
    e.expectedSize = spec.size;
    e.expectedHash = spec.sha256;
    e.pickedSize = pickedSize;
    e.pickedHash = pickedHash;
    throw e;
  }

  if (pickedHash !== spec.sha256) {
    const e = new Error(
      'Wrong base ROM: picked ' +
        formatName(romUri, pickedSize) +
        ' (' + pickedSize + ' bytes, SHA256 ' + pickedHash.slice(0, 12) +
        '...). Expected ' + expectedName + ' (' + spec.size + ' bytes, SHA256 ' +
        shortHash(spec.sha256) + '...). Re-dump your legally-owned cart.'
    );
    e.code = 'ROM_HASH_MISMATCH';
    e.expectedName = expectedName;
    e.expectedSize = spec.size;
    e.expectedHash = spec.sha256;
    e.pickedSize = pickedSize;
    e.pickedHash = pickedHash;
    throw e;
  }

  return { size: pickedSize, sha256: pickedHash };
}

// Derive a human label for the picked file (basename) for error messages.
function formatName(romUri, size) {
  const name = typeof romUri === 'string' && romUri.length
    ? romUri.replace(/^.*[\\/:]/, '').split('?')[0]
    : 'ROM';
  return name || 'ROM';
}

// Short, readable hash prefix for UI messages.
function shortHash(hash) {
  if (!hash || hash.length < 8) return hash || 'REPLACE_ME';
  return hash.slice(0, 8);
}

/**
 * Convert a verifyRom Error (or any Error with the structured fields above, or
 * a decoder mismatch error) into a friendly UI-renderable message.
 *
 * Decoder mismatch errors (e.g. UPS/xdelta `source size mismatch`) are passed
 * through verbatim — this module does not swallow them; it only augments the
 * shape of its own errors.
 *
 * @param {Error} e
 * @returns {{title:string, body:string}} title + body for the errorBox.
 */
export function formatVerifyError(e) {
  // Wrong-base-ROM family: this child's own errors.
  if (e && (e.code === 'ROM_SIZE_MISMATCH' || e.code === 'ROM_HASH_MISMATCH' || e.code === 'ROM_HASH_UNVERIFIED')) {
    return {
      title: 'WRONG BASE ROM',
      body: e.message,
    };
  }
  // Anything else (decoder mismatch, missing manifest, missing file, etc.):
  // preserve the underlying message untouched.
  return {
    title: 'PATCH FAILED',
    body: (e && e.message) || String(e),
  };
}

export default { verifyRom, formatVerifyError };
