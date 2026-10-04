const { applyBps } = require('../bps');

function u8(arr) {
  return new Uint8Array(arr);
}

// BPS custom varint encoder (mirrors the decoder for generating test fixtures)
function encodeVarint(data) {
  const result = [];
  while (true) {
    const x = data & 0x7F;
    data >>= 7;
    if (data === 0) {
      result.push(0x80 | x);
      break;
    }
    result.push(x);
    data -= 1;
  }
  return result;
}

// Encode a BPS command: action | ((length - 1) << 2)
function encodeCommand(action, length) {
  return encodeVarint((action) | ((length - 1) << 2));
}

// Encode a signed relative offset: bit 0 = sign, rest = magnitude
function encodeSignedOffset(offset) {
  if (offset < 0) {
    return encodeVarint((Math.abs(offset) << 1) | 1);
  }
  return encodeVarint((Math.abs(offset) << 1));
}

function encodeUInt32LE(value) {
  return [
    value & 0xFF,
    (value >>> 8) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 24) & 0xFF,
  ];
}

// CRC32 implementation matching the one in bps.js
const CRC_TABLE = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE.push(c >>> 0);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Build a BPS patch from source, target, and a list of instruction tuples:
//   { type: 'source_read', length }
//   { type: 'target_read', data: Uint8Array }
//   { type: 'source_copy', offset, length }
//   { type: 'target_copy', offset, length }
function buildBps(source, target, instructions, metadata = []) {
  const sourceSize = source.length;
  const targetSize = target.length;

  let pos = 0;
  let sourceOffset = 0;
  let targetOffset = 0;
  const commands = [];

  for (const instr of instructions) {
    if (instr.type === 'source_read') {
      commands.push(...encodeCommand(0, instr.length));
      sourceOffset += instr.length;
    } else if (instr.type === 'target_read') {
      commands.push(...encodeCommand(1, instr.data.length));
      commands.push(...instr.data);
    } else if (instr.type === 'source_copy') {
      commands.push(...encodeCommand(2, instr.length));
      commands.push(...encodeSignedOffset(instr.offset - sourceOffset));
      sourceOffset += instr.offset - sourceOffset + instr.length;
    } else if (instr.type === 'target_copy') {
      commands.push(...encodeCommand(3, instr.length));
      commands.push(...encodeSignedOffset(instr.offset - targetOffset));
      targetOffset += instr.offset - targetOffset + instr.length;
    }
  }

  let outputPos = 0;
  for (const instr of instructions) {
    if (instr.type === 'source_read') outputPos += instr.length;
    else if (instr.type === 'target_read') outputPos += instr.data.length;
    else outputPos += instr.length;
  }

  // Pad remaining target bytes with a TargetRead if needed
  if (outputPos < targetSize) {
    const remaining = target.subarray(outputPos);
    commands.push(...encodeCommand(1, remaining.length));
    commands.push(...remaining);
  }

  const header = [0x42, 0x50, 0x53, 0x31]; // BPS1
  header.push(...encodeVarint(sourceSize));
  header.push(...encodeVarint(targetSize));
  header.push(...encodeVarint(metadata.length));
  header.push(...metadata);

  const patchData = new Uint8Array([...header, ...commands]);
  const footer = [
    ...encodeUInt32LE(crc32(source)),
    ...encodeUInt32LE(crc32(target)),
    ...encodeUInt32LE(crc32(patchData)),
  ];

  return new Uint8Array([...patchData, ...footer]);
}

describe('applyBps', () => {
  test('applies TargetRead (literal bytes from patch)', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = buildBps(rom, u8([0, 0, 0, 0, 0x58, 0x59, 0x5a, ...new Array(9).fill(0)]), [
      { type: 'target_read', data: u8([0, 0, 0, 0, 0x58, 0x59, 0x5a, 0, 0, 0, 0, 0, 0, 0, 0, 0]) },
    ]);
    const { rom: out, records } = applyBps(rom, patch);
    expect(records).toBe(1);
    expect(Array.from(out.slice(4, 7))).toEqual([0x58, 0x59, 0x5a]);
    expect(out.length).toBe(16);
  });

  test('applies SourceRead + SourceCopy (copies from original)', () => {
    const rom = u8([0, 0, 0, 0, 0, 0, 0, 0, 0xAB, 0xCD, 0xEF, 0, 0, 0, 0, 0]);
    const target = u8([0, 0, 0, 0, 0, 0, 0, 0, 0xAB, 0xCD, 0xEF, 0, 0, 0, 0, 0]);
    const patch = buildBps(rom, target, [
      { type: 'source_read', length: 8 },
      { type: 'source_copy', offset: 8, length: 8 },
    ]);
    const { rom: out, records } = applyBps(rom, patch);
    expect(records).toBe(2);
    expect(Array.from(out.slice(8, 11))).toEqual([0xAB, 0xCD, 0xEF]);
  });

  test('applies TargetCopy (LZ-style back-reference)', () => {
    const rom = u8(new Array(4).fill(0));
    const target = u8(new Array(12).fill(0xFF));
    const patch = buildBps(rom, target, [
      { type: 'target_read', data: u8([0xFF]) },
      { type: 'target_copy', offset: 0, length: 11 },
    ]);
    const { rom: out, records } = applyBps(rom, patch);
    expect(records).toBe(2);
    expect(out.length).toBe(12);
    expect(Array.from(out)).toEqual(new Array(12).fill(0xFF));
  });

  test('grows output when target larger than source', () => {
    const rom = u8(new Array(4).fill(0));
    const target = u8(new Array(12).fill(0x42));
    const patch = buildBps(rom, target, [
      { type: 'target_read', data: u8([0x42, 0x42, 0x42, 0x42]) },
      { type: 'target_copy', offset: 0, length: 8 },
    ]);
    const { rom: out } = applyBps(rom, patch);
    expect(out.length).toBe(12);
    expect(Array.from(out)).toEqual(new Array(12).fill(0x42));
  });

  test('rejects bad magic bytes', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = u8([0x41, 0x42, 0x43, 0x44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => applyBps(rom, patch)).toThrow(/magic/i);
  });

  test('rejects truncated patch and CRC mismatch', () => {
    const rom = u8(new Array(16).fill(0));

    // Truncated: valid header + some commands, but footer cut off
    const truncated = buildBps(rom, u8(new Array(16).fill(0x58)), [
      { type: 'target_read', data: u8(new Array(16).fill(0x58)) },
    ]);
    const truncatedPatch = truncated.subarray(0, truncated.length - 12);
    expect(() => applyBps(rom, truncatedPatch)).toThrow(/truncated/i);

    // CRC mismatch: corrupt the target CRC in an otherwise valid patch
    const validPatch = buildBps(rom, u8(new Array(16).fill(0x99)), [
      { type: 'target_read', data: u8(new Array(16).fill(0x99)) },
    ]);
    const corruptPatch = new Uint8Array(validPatch);
    const footerStart = corruptPatch.length - 12;
    corruptPatch[footerStart + 5] ^= 0xFF; // flip a bit in target CRC
    expect(() => applyBps(rom, corruptPatch)).toThrow(/crc mismatch/i);
  });
});
