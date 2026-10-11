const { applyUps } = require('../ups');

// UPS-specific variable-length integer encoding.
// MSB (0x80) is the terminator: when set, this is the last byte.
// After each non-terminating byte, an extra `shift` is added.
function writeVarint(value) {
  const bytes = [];
  let shift = 1;
  while (true) {
    const b = value & 0x7f;
    value -= b * shift;
    if (value < shift) {
      bytes.push(0x80 | b);
      break;
    }
    bytes.push(b);
    value -= shift;
    shift <<= 7;
  }
  return bytes;
}

function writeUint32LE(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
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

// Build a valid UPS patch from source, target, and hunks.
// Each hunk: { absOffset, data } where data is the XOR patch bytes.
// hunks must be in increasing absOffset order.
function buildUpsPatch(source, target, hunks) {
  const body = [];
  body.push(0x55, 0x50, 0x53, 0x31); // "UPS1"
  body.push(...writeVarint(source.length));
  body.push(...writeVarint(target.length));

  let prevEnd = 0;
  for (const hunk of hunks) {
    const relOffset = hunk.absOffset - prevEnd;
    if (relOffset < 0) throw new Error('Hunk absOffset must be non-decreasing');
    body.push(...writeVarint(relOffset));
    // XOR data bytes (these are source XOR target)
    body.push(...hunk.data);
    // 0x00 terminator — also consumes one source byte position (copies source byte)
    body.push(0);
    prevEnd = hunk.absOffset + hunk.data.length + 1;
  }

  // If there are bytes between the last hunk end and the end of the source,
  // the patch still needs to cover the full file. But if target is same size
  // or larger, the trailing bytes after the last hunk are copied from source.
  // We don't need to add a final skip unless we want to.

  // Patch CRC covers everything before the footer
  const patchCrc = crc32(new Uint8Array(body));

  // Footer: source CRC, target CRC, patch CRC (each 4 bytes LE)
  body.push(...writeUint32LE(crc32(source)));
  body.push(...writeUint32LE(crc32(target)));
  body.push(...writeUint32LE(patchCrc));

  return new Uint8Array(body);
}

// Create a hunk at absolute offset that XORs source[offset..] to become target[offset..]
// Source bytes beyond source length are treated as 0 (per UPS spec).
function makeHunk(source, target, absOffset, len) {
  const data = [];
  for (let i = 0; i < len; i++) {
    const si = absOffset + i;
    const ti = absOffset + i;
    const s = si < source.length ? source[si] : 0;
    const t = ti < target.length ? target[ti] : 0;
    data.push(s ^ t);
  }
  return { absOffset, data };
}

function u8(arr) { return new Uint8Array(arr); }

describe('applyUps', () => {
  test('applies a single-byte change', () => {
    const rom = u8(new Array(16).fill(0));
    const target = u8(new Array(16).fill(0));
    target[5] = 0x42;
    // Hunk at abs offset 5: relative offset = 5 (skip 5 from pos 0)
    // XOR data: 0 XOR 0x42 = 0x42
    const patch = buildUpsPatch(rom, target, [makeHunk(rom, target, 5, 1)]);
    const { rom: out, records } = applyUps(rom, patch);
    expect(records).toBe(1);
    expect(out.length).toBe(16);
    expect(out[5]).toBe(0x42);
    // Untouched bytes preserved
    expect(out[0]).toBe(0);
    expect(out[4]).toBe(0);
    expect(out[15]).toBe(0);
  });

  test('applies a multi-hunk patch', () => {
    const rom = u8(new Array(32).fill(0));
    const target = u8(new Array(32).fill(0));
    target[5] = 0x11;
    target[10] = 0x22;
    target[20] = 0x33;
    // Hunk 1 at offset 5: rel=5, data=[0x11], terminator copies byte 6
    // Hunk 2 at offset 10: rel=10-7=3, data=[0x22], terminator copies byte 11
    // Hunk 3 at offset 20: rel=20-12=8, data=[0x33], terminator copies byte 21
    const patch = buildUpsPatch(rom, target, [
      makeHunk(rom, target, 5, 1),
      makeHunk(rom, target, 10, 1),
      makeHunk(rom, target, 20, 1),
    ]);
    const { rom: out, records } = applyUps(rom, patch);
    expect(records).toBe(3);
    expect(out[5]).toBe(0x11);
    expect(out[10]).toBe(0x22);
    expect(out[20]).toBe(0x33);
  });

  test('supports target larger than source (append)', () => {
    const rom = u8(new Array(8).fill(0));
    const target = u8(new Array(16).fill(0));
    target[8] = 0xAA;
    target[9] = 0xBB;
    target[10] = 0xCC;
    // Hunk at abs offset 8, len 3: rel=8, data = source[8..10] XOR target[8..10]
    // Source bytes beyond source are 0, so data = 0xAA, 0xBB, 0xCC
    const patch = buildUpsPatch(rom, target, [makeHunk(rom, target, 8, 3)]);
    const { rom: out, records } = applyUps(rom, patch);
    expect(records).toBe(1);
    expect(out.length).toBe(16);
    expect(out[8]).toBe(0xAA);
    expect(out[9]).toBe(0xBB);
    expect(out[10]).toBe(0xCC);
    // Original region preserved
    for (let i = 0; i < 8; i++) expect(out[i]).toBe(0);
  });

  test('rejects bad magic bytes', () => {
    const rom = u8([0, 0, 0, 0]);
    // 8-byte patch so it passes the minimum size check, then fails on magic
    const patch = u8([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48]);
    expect(() => applyUps(rom, patch)).toThrow(/magic/i);
  });

  test('rejects truncated patch', () => {
    const rom = u8(new Array(16).fill(0));
    // Too small to even contain header + footer (need at least 18 bytes)
    const patch = u8([0x55, 0x50, 0x53, 0x31, 0x10, 0x10, 0x00]);
    expect(() => applyUps(rom, patch)).toThrow(/truncated/i);
  });

  test('rejects source-size mismatch and CRC mismatch', () => {
    const rom = u8(new Array(16).fill(0));
    const target = u8(new Array(16).fill(0));
    target[5] = 0x42;
    const patch = buildUpsPatch(rom, target, [makeHunk(rom, target, 5, 1)]);

    // Source-size mismatch: wrong length
    const wrongRom = u8(new Array(32).fill(0));
    expect(() => applyUps(wrongRom, patch)).toThrow(/source size mismatch/i);

    // CRC mismatch: correct length but wrong content (source CRC won't match)
    const corruptRom = u8(new Array(16).fill(0x99));
    expect(() => applyUps(corruptRom, patch)).toThrow(/crc mismatch/i);
  });
});
