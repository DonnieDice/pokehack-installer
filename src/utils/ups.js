const MAGIC = [0x55, 0x50, 0x53, 0x31]; // "UPS1"

function grow(src, needed) {
  const next = new Uint8Array(needed);
  next.set(src);
  return next;
}

// UPS-specific variable-length integer (not standard LEB128).
// Each byte contributes (byte & 0x7f) * shift to the running total.
// The MSB (0x80) is the TERMINATOR bit: when set, this is the last byte.
// After each non-terminating byte, an additional `shift` is added and
// shift is left-shifted by 7.
function readVarint(patch, pos, end) {
  let value = 0;
  let shift = 1;
  while (pos < end) {
    if (pos >= patch.length) {
      throw new Error('Truncated UPS: varint runs past end of patch');
    }
    const b = patch[pos++];
    value += (b & 0x7f) * shift;
    if ((b & 0x80) !== 0) {
      return { value, pos };
    }
    shift <<= 7;
    value += shift;
  }
  throw new Error('Truncated UPS: varint runs past end of patch');
}

// CRC32 (IEEE 802.3, reflected, same as PNG/Zip)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readUint32LE(buf, offset) {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}

export function applyUps(rom, patch) {
  if (!(rom instanceof Uint8Array) || !(patch instanceof Uint8Array)) {
    throw new Error('applyUps expects Uint8Array inputs');
  }

  // Magic check
  if (patch.length < 4) {
    throw new Error('Truncated UPS: patch too small for header');
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (patch[i] !== MAGIC[i]) {
      throw new Error('Not a UPS patch (bad magic bytes)');
    }
  }

  // We need at minimum: 4 (magic) + 2 (two 1-byte varints) + 12 (footer) = 18
  if (patch.length < 18) {
    throw new Error('Truncated UPS: patch too small to contain header and footer');
  }

  let pos = 4;
  const patchEnd = patch.length - 12; // 12 bytes of footer (3 x 4-byte CRC32)

  // Source-size and dest-size (varints)
  const srcSize = readVarint(patch, pos, patchEnd);
  pos = srcSize.pos;
  const dstSize = readVarint(patch, pos, patchEnd);
  pos = dstSize.pos;

  // Source-size check
  if (rom.length !== srcSize.value) {
    throw new Error('UPS source size mismatch: expected ' + srcSize.value + ', got ' + rom.length);
  }

  // Allocate output at dest-size
  let out = new Uint8Array(dstSize.value);
  out.set(rom.slice(0, Math.min(rom.length, dstSize.value)));

  let records = 0;
  let srcPtr = 0;
  let dstPtr = 0;

  // Hunks — each hunk starts with a relative offset (skip/copy source bytes),
  // then XOR data bytes until a 0x00 terminator is encountered.
  // Source bytes beyond the source end are treated as 0x00.
  while (pos < patchEnd) {
    const relOffset = readVarint(patch, pos, patchEnd);
    pos = relOffset.pos;

    // Copy skip bytes from source to output
    let skip = relOffset.value;
    while (skip > 0 && dstPtr < dstSize.value) {
      out[dstPtr] = (srcPtr < rom.length) ? rom[srcPtr] : 0;
      dstPtr++;
      srcPtr++;
      skip--;
    }

    // XOR-apply patch bytes until we hit a 0x00 terminator
    while (dstPtr < dstSize.value) {
      const patchByte = patch[pos++];
      if (pos > patchEnd) {
        throw new Error('Truncated UPS: hunk data overruns patch file');
      }
      const srcByte = (srcPtr < rom.length) ? rom[srcPtr] : 0;
      out[dstPtr] = (srcByte ^ patchByte) & 0xff;
      dstPtr++;
      srcPtr++;

      // 0x00 patch byte is the terminator for this hunk block
      if (patchByte === 0) {
        break;
      }
    }

    records++;
  }

  // Footer (last 12 bytes): source-crc, target-crc, patch-crc (each 4 bytes LE)
  const footerStart = patch.length - 12;

  const expectedSrcCrc = readUint32LE(patch, footerStart);
  const expectedDstCrc = readUint32LE(patch, footerStart + 4);
  const expectedPatchCrc = readUint32LE(patch, footerStart + 8);

  const actualSrcCrc = crc32(rom);
  if (actualSrcCrc !== expectedSrcCrc) {
    throw new Error('UPS CRC mismatch (source)');
  }

  const actualDstCrc = crc32(out);
  if (actualDstCrc !== expectedDstCrc) {
    throw new Error('UPS CRC mismatch (target)');
  }

  const actualPatchCrc = crc32(patch.subarray(0, footerStart));
  if (actualPatchCrc !== expectedPatchCrc) {
    throw new Error('UPS CRC mismatch (patch)');
  }

  if (records === 0) {
    throw new Error('No UPS records found before terminator');
  }
  return { rom: out, records };
}
