const MAGIC = [0x42, 0x50, 0x53, 0x31]; // "BPS1"

// CRC32 lookup table generated lazily at first use (pure JS, no native deps)
let CRC_TABLE = null;

function makeCRCTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

function crc32(data) {
  if (CRC_TABLE === null) CRC_TABLE = makeCRCTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// BPS custom variable-length integer encoding (byuu's spec).
// Decodes numbers encoded as 7-bit groups with a continuation bit.
function readVarint(data, pos) {
  let value = 0;
  let shift = 1;
  while (true) {
    if (pos >= data.length) throw new Error('Truncated BPS: varint overruns patch');
    const byte = data[pos];
    pos += 1;
    value += (byte & 0x7F) * shift;
    if ((byte & 0x80) !== 0) break;
    shift <<= 7;
    value += shift;
  }
  return { value, pos };
}

// Read a signed relative offset: bit 0 = sign, rest = magnitude.
function readSignedOffset(data, pos) {
  const r = readVarint(data, pos);
  const value = r.value;
  const offset = (value & 1 ? -1 : 1) * (value >>> 1);
  return { offset, pos: r.pos };
}

function readUInt32LE(data, pos) {
  return (
    data[pos] |
    (data[pos + 1] << 8) |
    (data[pos + 2] << 16) |
    (data[pos + 3] << 24)
  ) >>> 0;
}

export function applyBps(rom, patch) {
  if (!(rom instanceof Uint8Array) || !(patch instanceof Uint8Array)) {
    throw new Error('applyBps expects Uint8Array inputs');
  }
  if (patch.length < 12) throw new Error('Truncated BPS: patch too small to contain footer');
  for (let i = 0; i < 4; i++) {
    if (patch[i] !== MAGIC[i]) throw new Error('Not a BPS patch (bad magic bytes)');
  }
  let pos = 4;

  let sourceSize;
  let targetSize;
  let metadataSize;

  try {
    ({ value: sourceSize, pos } = readVarint(patch, pos));
    ({ value: targetSize, pos } = readVarint(patch, pos));
    ({ value: metadataSize, pos } = readVarint(patch, pos));
  } catch (e) {
    throw new Error('Truncated BPS: header field missing');
  }

  if (pos + metadataSize > patch.length) {
    throw new Error('Truncated BPS: patch ends in metadata');
  }
  pos = pos + metadataSize;

  // Footer is the last 12 bytes (3 x uint32)
  const footerStart = patch.length - 12;
  if (pos > footerStart) {
    throw new Error('Truncated BPS: command stream overruns into footer');
  }

  // Verify source-size matches rom.length
  if (sourceSize !== rom.length) {
    throw new Error('BPS source size mismatch: expected ' + sourceSize + ', got ' + rom.length);
  }

  const out = new Uint8Array(targetSize);
  let outputOffset = 0;
  let sourceOffset = 0;
  let targetOffset = 0;
  let records = 0;

  while (pos < footerStart) {
    let cmd;
    try {
      ({ value: cmd, pos } = readVarint(patch, pos));
    } catch (e) {
      throw new Error('Truncated BPS: command byte read overrun');
    }

    const action = cmd & 3;
    const length = (cmd >>> 2) + 1;

    if (action === 0) {
      // SourceRead: copy length bytes from source at sourceOffset
      if (sourceOffset + length > sourceSize) {
        throw new Error('Truncated BPS: SourceRead overruns source');
      }
      for (let i = 0; i < length; i++) {
        out[outputOffset++] = rom[sourceOffset++];
      }
    } else if (action === 1) {
      // TargetRead: copy length literal bytes from patch
      if (pos + length > footerStart) {
        throw new Error('Truncated BPS: TargetRead overruns patch');
      }
      for (let i = 0; i < length; i++) {
        out[outputOffset++] = patch[pos++];
      }
    } else if (action === 2) {
      // SourceCopy: adjust sourceOffset by a signed amount, then copy
      let offset;
      try {
        ({ offset, pos } = readSignedOffset(patch, pos));
      } catch (e) {
        throw new Error('Truncated BPS: SourceCopy offset read overrun');
      }
      sourceOffset += offset;
      if (sourceOffset < 0 || sourceOffset + length > sourceSize) {
        throw new Error('Truncated BPS: SourceCopy offset out of source bounds');
      }
      for (let i = 0; i < length; i++) {
        out[outputOffset++] = rom[sourceOffset++];
      }
    } else if (action === 3) {
      // TargetCopy: adjust targetOffset by a signed amount, then copy from target
      let offset;
      try {
        ({ offset, pos } = readSignedOffset(patch, pos));
      } catch (e) {
        throw new Error('Truncated BPS: TargetCopy offset read overrun');
      }
      targetOffset += offset;
      // targetRelativeOffset can never be < 0, or >= outputOffset
      if (targetOffset < 0 || targetOffset >= outputOffset) {
        throw new Error('Truncated BPS: TargetCopy offset before output start');
      }
      // The copy extends the output; verify it does not exceed targetSize
      if (outputOffset + length > targetSize) {
        throw new Error('Truncated BPS: TargetCopy overruns target size');
      }
      // Byte-by-byte copy handles overlapping references (LZ-style)
      for (let i = 0; i < length; i++) {
        out[outputOffset++] = out[targetOffset++];
      }
    } else {
      throw new Error('Truncated BPS: unknown action ' + action);
    }
    records++;
  }

  // Read footer CRCs
  let footer = footerStart;
  const sourceCRC = readUInt32LE(patch, footer);
  footer += 4;
  const targetCRC = readUInt32LE(patch, footer);
  footer += 4;
  const patchCRC = readUInt32LE(patch, footer);

  // Verify source CRC
  if (crc32(rom) !== sourceCRC) {
    throw new Error('BPS CRC mismatch: source CRC');
  }

  // Verify target CRC
  if (crc32(out) !== targetCRC) {
    throw new Error('BPS CRC mismatch: target CRC');
  }

  // Verify patch CRC (covers all bytes before the footer)
  if (crc32(patch.subarray(0, footerStart)) !== patchCRC) {
    throw new Error('BPS CRC mismatch: patch CRC');
  }

  return { rom: out, records };
}
