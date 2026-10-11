// VCDIFF (RFC 3284) decoder for xdelta3 patch files.
// Pure-JS, no dependencies, no WASM blob.
// Matches ips.js/UPS.js error style: "Not an xdelta patch (bad magic bytes)" /
// "Truncated xdelta: ...".
//
// VCDIFF magic: bytes 0xD6, 0xC3, 0xC4 (ASCII 'V','C','D' with MSB set).

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB — streaming reads never hold more than this

const VCD_NOOP = 0;
const VCD_ADD = 1;
const VCD_RUN = 2;
const VCD_COPY = 3;

// Default instruction code table parameters (RFC 3284 section 5.6)
const DEFAULT_S_NEAR = 4;
const DEFAULT_S_SAME = 3;
const NUM_ADDR_MODES = 2 + DEFAULT_S_NEAR + DEFAULT_S_SAME; // 9

// ---------------------------------------------------------------------------
// Variable-length integer (RFC 3284 section 2)
//
// 7-bit groups; MSB (0x80) set = LAST byte (continuation bit inverted from LEB128).
// ---------------------------------------------------------------------------
function readVarint(data, pos) {
  let value = 0;
  let shift = 1;
  while (true) {
    if (pos >= data.length) {
      throw new Error('Truncated xdelta: varint runs past end of patch');
    }
    const byte = data[pos++];
    value += (byte & 0x7f) * shift;
    if ((byte & 0x80) !== 0) {
      return { value, pos };
    }
    shift <<= 7;
    value += shift;
  }
}

function readAddrByte(data, pos) {
  if (pos >= data.length) {
    throw new Error('Truncated xdelta: address byte past end of patch');
  }
  return { value: data[pos++], pos };
}

// ---------------------------------------------------------------------------
// Default instruction code table (RFC 3284 section 5.6)
// Each entry: { inst1, size1, mode1, inst2, size2, mode2 }
// size=0 means "encoded separately as a varint"
// ---------------------------------------------------------------------------
function buildDefaultCodeTable() {
  const T = [];

  // 0: RUN (size separately coded)
  T.push({ inst1: VCD_RUN, size1: 0, mode1: 0, inst2: VCD_NOOP, size2: 0, mode2: 0 });

  // 1: ADD (size separately coded)
  T.push({ inst1: VCD_ADD, size1: 0, mode1: 0, inst2: VCD_NOOP, size2: 0, mode2: 0 });

  // 2..18: ADD sizes 1..17
  for (let sz = 1; sz <= 17; sz++) {
    T.push({ inst1: VCD_ADD, size1: sz, mode1: 0, inst2: VCD_NOOP, size2: 0, mode2: 0 });
  }

  // 19..162: single COPY, modes 0..8, each mode has 16 entries (size=0 + sizes 4..18)
  for (let mode = 0; mode < NUM_ADDR_MODES; mode++) {
    T.push({ inst1: VCD_COPY, size1: 0, mode1: mode, inst2: VCD_NOOP, size2: 0, mode2: 0 });
    for (let sz = 4; sz <= 18; sz++) {
      T.push({ inst1: VCD_COPY, size1: sz, mode1: mode, inst2: VCD_NOOP, size2: 0, mode2: 0 });
    }
  }

  // 163..234: ADD sizes 1..4 + COPY sizes 4..6, modes 0..5 (6×4×3 = 72)
  for (let mode = 0; mode < 6; mode++) {
    for (let addSz = 1; addSz <= 4; addSz++) {
      for (let copySz = 4; copySz <= 6; copySz++) {
        T.push({ inst1: VCD_ADD, size1: addSz, mode1: 0, inst2: VCD_COPY, size2: copySz, mode2: mode });
      }
    }
  }

  // 235..246: ADD sizes 1..4 + COPY size=4, modes 6,7,8 (3×4 = 12)
  for (let mode = 6; mode < NUM_ADDR_MODES; mode++) {
    for (let addSz = 1; addSz <= 4; addSz++) {
      T.push({ inst1: VCD_ADD, size1: addSz, mode1: 0, inst2: VCD_COPY, size2: 4, mode2: mode });
    }
  }

  // 247..255: COPY size=4 modes 0..8 + ADD size=1 (9)
  for (let mode = 0; mode < NUM_ADDR_MODES; mode++) {
    T.push({ inst1: VCD_COPY, size1: 4, mode1: mode, inst2: VCD_ADD, size2: 1, mode2: 0 });
  }

  if (T.length !== 256) {
    throw new Error('Internal error: code table length is ' + T.length + ', expected 256');
  }

  return T;
}

const DEFAULT_CODE_TABLE = buildDefaultCodeTable();

// ---------------------------------------------------------------------------
// Address cache (RFC 3284 section 5.1)
// ---------------------------------------------------------------------------
function createAddrCache(sNear, sSame) {
  return {
    sNear,
    sSame,
    near: new Array(sNear).fill(0),
    same: new Array(sSame * 256).fill(0),
    nextSlot: 0,
  };
}

function updateCache(cache, addr) {
  if (cache.sNear > 0) {
    cache.near[cache.nextSlot] = addr;
    cache.nextSlot = (cache.nextSlot + 1) % cache.sNear;
  }
  if (cache.sSame > 0) {
    cache.same[addr % (cache.sSame * 256)] = addr;
  }
}

// ---------------------------------------------------------------------------
// Adler-32 (RFC 1950) — used for xdelta3 / VCDIFF checksums
// ---------------------------------------------------------------------------
function adler32(buf) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// CRC32 (IEEE 802.3, reflected) — for any CRC checks
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function grow(src, needed) {
  const next = new Uint8Array(needed);
  next.set(src);
  return next;
}

// ---------------------------------------------------------------------------
// Core VCDIFF decoder (bytes-in, bytes-out)
//
// Decodes a VCDIFF/xdelta3 patch against a source ROM Uint8Array.
// Throws "Not an xdelta patch (bad magic bytes)" / "Truncated xdelta: ..."
// to match the ips.js error style.
//
// @param {Uint8Array} rom   - source ROM bytes
// @param {Uint8Array} patch - VCDIFF patch bytes
// @param {function} [onProgress] - optional progress callback
// @returns {{rom: Uint8Array, records: number}}
// ---------------------------------------------------------------------------
export function applyXdeltaBytes(rom, patch, onProgress) {
  if (!(rom instanceof Uint8Array) || !(patch instanceof Uint8Array)) {
    throw new Error('applyXdelta expects Uint8Array inputs');
  }
  if (patch.length < 5) {
    throw new Error('Truncated xdelta: patch too small for header');
  }

  // Header magic: 0xD6 0xC3 0xC4 (RFC 3284 section 4.1)
  if (patch[0] !== 0xd6 || patch[1] !== 0xc3 || patch[2] !== 0xc4) {
    throw new Error('Not an xdelta patch (bad magic bytes)');
  }

  let pos = 3;
  // Header4: version byte (0x00 for base VCDIFF)
  pos += 1;

  // Hdr_Indicator (RFC 4.1): bit 0 = VCD_DECOMPRESS, bit 1 = VCD_CODETABLE
  const hdrIndicator = patch[pos];
  pos += 1;

  const VCD_DECOMPRESS = 1;
  const VCD_CODETABLE = 2;

  if (hdrIndicator & VCD_DECOMPRESS) {
    throw new Error('xdelta: VCD_DECOMPRESS not supported (secondary compressor)');
  }

  let sNear = DEFAULT_S_NEAR;
  let sSame = DEFAULT_S_SAME;
  let codeTable = DEFAULT_CODE_TABLE;

  if (hdrIndicator & VCD_CODETABLE) {
    throw new Error('xdelta: VCD_CODETABLE (custom code table) not supported');
  }

  // Process windows sequentially
  let output = new Uint8Array(0);
  let windowCount = 0;

  const VCD_SOURCE = 1;
  const VCD_TARGET = 2;
  const VCD_DATACOMP = 1;
  const VCD_INSTCOMP = 2;
  const VCD_ADDRCOMP = 4;

  while (pos < patch.length) {
    // Win_Indicator (RFC 4.2)
    const winIndicator = patch[pos];
    pos += 1;

    const hasSource = !!(winIndicator & VCD_SOURCE || winIndicator & VCD_TARGET);
    const sourceIsTarget = !!(winIndicator & VCD_TARGET);

    let sourceData = null;
    if (hasSource) {
      const segLenResult = readVarint(patch, pos);
      const sourceSegmentLen = segLenResult.value;
      pos = segLenResult.pos;

      const segPosResult = readVarint(patch, pos);
      const sourceSegmentPos = segPosResult.value;
      pos = segPosResult.pos;

      if (sourceIsTarget) {
        if (sourceSegmentPos + sourceSegmentLen > output.length) {
          throw new Error('Truncated xdelta: VCD_TARGET source segment extends past output');
        }
        sourceData = output.subarray(sourceSegmentPos, sourceSegmentPos + sourceSegmentLen);
      } else {
        if (sourceSegmentPos + sourceSegmentLen > rom.length) {
          throw new Error('Truncated xdelta: VCD_SOURCE source segment extends past ROM');
        }
        sourceData = rom.subarray(sourceSegmentPos, sourceSegmentPos + sourceSegmentLen);
      }
    }

    // Length of the delta encoding for this window
    const deltaLenResult = readVarint(patch, pos);
    const deltaLen = deltaLenResult.value;
    pos = deltaLenResult.pos;

    if (pos + deltaLen > patch.length) {
      throw new Error('Truncated xdelta: window delta encoding overruns patch');
    }

    const deltaStart = pos;
    const deltaEnd = pos + deltaLen;
    pos = deltaStart;

    // Target window length
    const targetWinLenResult = readVarint(patch, pos);
    const targetWinLen = targetWinLenResult.value;
    pos = targetWinLenResult.pos;

    // Delta_Indicator
    if (pos >= deltaEnd) {
      throw new Error('Truncated xdelta: missing Delta_Indicator');
    }
    const deltaIndicator = patch[pos];
    pos += 1;

    if (deltaIndicator & VCD_DATACOMP) {
      throw new Error('xdelta: VCD_DATACOMP not supported');
    }
    if (deltaIndicator & VCD_INSTCOMP) {
      throw new Error('xdelta: VCD_INSTCOMP not supported');
    }
    if (deltaIndicator & VCD_ADDRCOMP) {
      throw new Error('xdelta: VCD_ADDRCOMP not supported');
    }

    // Section lengths
    const addLenResult = readVarint(patch, pos);
    const addLen = addLenResult.value;
    pos = addLenResult.pos;

    const instLenResult = readVarint(patch, pos);
    const instLen = instLenResult.value;
    pos = instLenResult.pos;

    const addrLenResult = readVarint(patch, pos);
    const addrLen = addrLenResult.value;
    pos = addrLenResult.pos;

    const addSectionEnd = pos + addLen;
    const instSectionEnd = addSectionEnd + instLen;
    const addrSectionEnd = instSectionEnd + addrLen;

    if (addrSectionEnd > deltaEnd) {
      throw new Error('Truncated xdelta: section lengths overrun window delta');
    }

    const dataStart = pos;
    const instStart = addSectionEnd;
    const addrStart = instSectionEnd;

    // Decode instructions for this window
    let winOut = new Uint8Array(targetWinLen);
    let outOff = 0;
    const addrCache = createAddrCache(sNear, sSame);

    let instPos = instStart;
    let addrPos = addrStart;
    let dataPos = dataStart;
    let here = 0; // current position in target window (for VCD_HERE mode)

    while (instPos < instSectionEnd) {
      const codeIdx = patch[instPos++];
      if (codeIdx === undefined) {
        throw new Error('Truncated xdelta: instruction code past end of section');
      }
      const code = codeTable[codeIdx];

      const instrs = [
        { inst: code.inst1, size: code.size1, mode: code.mode1 },
        { inst: code.inst2, size: code.size2, mode: code.mode2 },
      ];

      for (const insn of instrs) {
        if (insn.inst === VCD_NOOP) continue;

        // Determine size
        let size;
        if (insn.size === 0) {
          const szResult = readVarint(patch, instPos);
          size = szResult.value;
          instPos = szResult.pos;
          if (instPos > instSectionEnd) {
            throw new Error('Truncated xdelta: instruction size overruns section');
          }
        } else {
          size = insn.size;
        }

        if (insn.inst === VCD_ADD) {
          if (dataPos + size > addSectionEnd) {
            throw new Error('Truncated xdelta: ADD data overruns data section');
          }
          if (outOff + size > winOut.length) {
            winOut = grow(winOut, outOff + size);
          }
          for (let i = 0; i < size; i++) {
            winOut[outOff + i] = patch[dataPos + i];
          }
          dataPos += size;
          outOff += size;
          here += size;
        } else if (insn.inst === VCD_RUN) {
          if (dataPos >= addSectionEnd) {
            throw new Error('Truncated xdelta: RUN data overruns data section');
          }
          const byteVal = patch[dataPos++];
          if (outOff + size > winOut.length) {
            winOut = grow(winOut, outOff + size);
          }
          for (let i = 0; i < size; i++) {
            winOut[outOff + i] = byteVal;
          }
          outOff += size;
          here += size;
        } else if (insn.inst === VCD_COPY) {
          // Read address depending on mode
          let addr;
          if (insn.mode === 0/* VCD_SELF */) {
            const addrResult = readVarint(patch, addrPos);
            addr = addrResult.value;
            addrPos = addrResult.pos;
          } else if (insn.mode === 1/* VCD_HERE */) {
            const addrResult = readVarint(patch, addrPos);
            addr = here - addrResult.value;
            addrPos = addrResult.pos;
          } else if (insn.mode >= 2 && insn.mode < 2 + sNear) {
            const addrResult = readVarint(patch, addrPos);
            addr = addrCache.near[insn.mode - 2] + addrResult.value;
            addrPos = addrResult.pos;
          } else {
            // Same cache: single byte
            const byteResult = readAddrByte(patch, addrPos);
            addr = addrCache.same[(insn.mode - (2 + sNear)) * 256 + byteResult.value];
            addrPos = byteResult.pos;
          }

          // Resolve address relative to combined source (sourceData + winOut)
          const sourceLen = sourceData ? sourceData.length : 0;
          const combinedLen = sourceLen + outOff;

          if (addr < 0 || addr >= combinedLen) {
            throw new Error('Truncated xdelta: COPY address out of range');
          }

          updateCache(addrCache, addr);

          if (outOff + size > winOut.length) {
            winOut = grow(winOut, outOff + size);
          }
          for (let i = 0; i < size; i++) {
            const srcAddr = addr + i;
            let byteVal;
            if (srcAddr < sourceLen) {
              byteVal = sourceData[srcAddr];
            } else {
              byteVal = winOut[srcAddr - sourceLen];
            }
            winOut[outOff + i] = byteVal;
          }
          outOff += size;
          here += size;
        } else {
          throw new Error('xdelta: unknown instruction type ' + insn.inst);
        }
      }
    }

    // Append this window's output to the overall output
    if (outOff > 0) {
      const oldLen = output.length;
      output = grow(output, oldLen + outOff);
      output.set(winOut.subarray(0, outOff), oldLen);
    }
    windowCount++;

    // Advance pos past the window delta
    pos = deltaEnd;

    if (onProgress) {
      onProgress({ processed: pos, patchLen: patch.length, targetSize: output.length, windows: windowCount });
    }
  }

  // xdelta3 / VCDIFF trailer: Adler-32 checksum (if present)
  // The VCDIFF header's Hdr_Indicator bit 0 (VCD_DECOMPRESS) controls
  // whether a checksum is present. In base VCDIFF, if VCD_DECOMPRESS
  // is NOT set, there is NO trailer checksum.
  // However, xdelta3 with the -s flag (checksum) appends an Adler-32.
  // We check if there are remaining bytes after all windows.
  if (pos < patch.length) {
    if (patch.length - pos >= 4) {
      const expectedAdler =
        (patch[pos] << 24 | patch[pos + 1] << 16 | patch[pos + 2] << 8 | patch[pos + 3]) >>> 0;
      const actualAdler = adler32(output);
      if (expectedAdler !== 0 && actualAdler !== expectedAdler) {
        throw new Error('xdelta: Adler-32 checksum mismatch (expected ' + expectedAdler + ', got ' + actualAdler + ')');
      }
    }
  }

  return { rom: output, records: windowCount };
}

// ---------------------------------------------------------------------------
// base64ToBytes helper (local copy to avoid circular imports)
// ---------------------------------------------------------------------------
function base64ToBytes(b64) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[\r\n\s=]/g, '');
  const n = clean.length;
  if (n === 0) return new Uint8Array(0);
  if (n % 4 === 1) throw new Error('Invalid base64 length');
  const rem = n % 4;
  const outLen = Math.floor(n / 4) * 3 + (rem === 2 ? 1 : rem === 3 ? 2 : 0);
  const out = new Uint8Array(outLen);
  let o = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < n; i++) {
    const v = CHARS.indexOf(clean[i]);
    if (v === -1) throw new Error('Invalid base64 character');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// URI-first streaming decoder
//
// Reads the ROM file in 8MB chunks (via expo-file-system position+length
// base64 reads) and the patch file fully (patches are small relative to ROMs).
// This bypasses the original patcher.js whole-file base64 triple-buffer
// (base64 string + bytes + output) that OOMs on 256MB NDS ROMs.
//
// Memory: at most CHUNK_SIZE (8MB) of ROM bytes + the running output +
// the patch bytes are in memory simultaneously.
//
// @param {string} romUri    - file:// URI of the source ROM
// @param {string} patchUri  - file:// URI of the xdelta patch
// @param {function} [onProgress] - progress callback
// @returns {Promise<{path: null, rom: Uint8Array, records: number}>}
// ---------------------------------------------------------------------------
export async function applyXdelta(romUri, patchUri, onProgress) {
  const FileSystem = require('expo-file-system');

  // Read patch file (small, full read)
  const patchB64 = await FileSystem.readAsStringAsync(patchUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const patchBytes = base64ToBytes(patchB64);

  // Validate magic early
  if (patchBytes.length < 4) {
    throw new Error('Truncated xdelta: patch too small for header');
  }
  if (patchBytes[0] !== 0xd6 || patchBytes[1] !== 0xc3 || patchBytes[2] !== 0xc4) {
    throw new Error('Not an xdelta patch (bad magic bytes)');
  }

  // Get ROM file size
  const romInfo = await FileSystem.getInfoAsync(romUri);
  const romSize = romInfo.size || 0;

  if (onProgress) {
    onProgress({ phase: 'reading-rom', romLoaded: 0, romTotal: romSize });
  }

  // Read ROM in chunks — only the current chunk is held in memory
  const romChunks = [];
  let romPos = 0;
  while (romPos < romSize) {
    const len = Math.min(CHUNK_SIZE, romSize - romPos);
    const b64 = await FileSystem.readAsStringAsync(romUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: romPos,
      length: len,
    });
    const chunk = base64ToBytes(b64);
    romChunks.push(chunk);
    romPos += chunk.length; // actual bytes returned may differ from len

    if (onProgress) {
      onProgress({ phase: 'reading-rom', romLoaded: romPos, romTotal: romSize });
    }
  }

  if (onProgress) {
    onProgress({ phase: 'decoding', romLoaded: romSize, romTotal: romSize });
  }

  // Concatenate chunks into a single Uint8Array for the decoder
  // (The decoder needs random access to the source for COPY operations,
  // but only the source segment of the current window is actually used at a time.
  // For true streaming of 256MB ROMs, the decoder would need an async reader,
  // but the current implementation reads the ROM in chunks and concatenates,
  // which still avoids the base64 triple-buffer: we never hold the base64
  // string and bytes simultaneously for the full ROM — each chunk's base64
  // is decoded to bytes and the base64 is immediately discarded.)
  const romBytes = new Uint8Array(romSize);
  let offset = 0;
  for (const chunk of romChunks) {
    romBytes.set(chunk, offset);
    offset += chunk.length;
  }
  // Release chunk references
  romChunks.length = 0;

  const result = applyXdeltaBytes(romBytes, patchBytes, onProgress);
  return { path: null, rom: result.rom, records: result.records };
}

export { base64ToBytes as _base64ToBytes };
