const { applyXdeltaBytes } = require('../xdelta');

function u8(arr) {
  return new Uint8Array(arr);
}

// VCDIFF varint encoder (RFC 3284 section 2).
function encodeVarint(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid varint');
  const bytes = [value % 128];
  while ((value = Math.floor(value / 128)) > 0) bytes.unshift((value % 128) | 0x80);
  return bytes;
}

function writeUint32LE(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

// Build a minimal VCDIFF patch from a list of instructions.
// instructions: array of {type: 'add', data: Uint8Array/byte[]} or
//                              {type: 'run', size: n, byte: b} or
//                              {type: 'copy', addr: n, size: n}
// If any copy instructions are present, the patch uses VCD_SOURCE with
// the entire source file as the source segment.
function buildVcdiffPatch(instructions, sourceLen) {
  const hasCopy = instructions.some(i => i.type === 'copy');

  const dataSection = [];
  const instSection = [];
  const addrSection = [];

  // Default code table indices:
  //   RUN (size separately coded) = 0
  //   ADD (size separately coded) = 1; ADD sizes 1..17 = indices 2..18
  //   COPY (size separately coded, mode 0) = 19; COPY sizes 4..18 mode 0 = 20..33

  for (const instr of instructions) {
    if (instr.type === 'add') {
      const data = Array.from(instr.data);
      if (data.length <= 17 && data.length >= 1) {
        instSection.push(1 + data.length); // ADD size N → index 2..18
      } else {
        instSection.push(1); // ADD size separately coded
        instSection.push(...encodeVarint(data.length));
      }
      dataSection.push(...data);
    } else if (instr.type === 'run') {
      instSection.push(0); // RUN
      instSection.push(...encodeVarint(instr.size));
      dataSection.push(instr.byte);
    } else if (instr.type === 'copy') {
      if (instr.size >= 4 && instr.size <= 18) {
        instSection.push(19 + 1 + (instr.size - 4)); // COPY size N mode 0
      } else {
        instSection.push(19); // COPY size separately coded, mode 0
        instSection.push(...encodeVarint(instr.size));
      }
      // Address: VCD_SELF mode → addrint = absolute address
      addrSection.push(...encodeVarint(instr.addr));
    }
  }

  // Target window length
  const targetWinLen = instructions.reduce((sum, i) => {
    if (i.type === 'add') return sum + i.data.length;
    if (i.type === 'run') return sum + i.size;
    if (i.type === 'copy') return sum + i.size;
    return sum;
  }, 0);

  const dataLen = dataSection.length;
  const instLen = instSection.length;
  const addrLen = addrSection.length;

  const deltaEncoding = [];
  deltaEncoding.push(...encodeVarint(targetWinLen));
  deltaEncoding.push(0x00); // Delta_Indicator (no compression)
  deltaEncoding.push(...encodeVarint(dataLen));
  deltaEncoding.push(...encodeVarint(instLen));
  deltaEncoding.push(...encodeVarint(addrLen));
  deltaEncoding.push(...dataSection);
  deltaEncoding.push(...instSection);
  deltaEncoding.push(...addrSection);

  // Window
  const winIndicator = hasCopy ? 0x01 : 0x00; // VCD_SOURCE = 1
  const window = [winIndicator];
  if (hasCopy) {
    window.push(...encodeVarint(sourceLen));
    window.push(...encodeVarint(0)); // source segment position = 0
  }
  window.push(...encodeVarint(deltaEncoding.length));
  window.push(...deltaEncoding);

  // Header: magic 0xD6 0xC3 0xC4, version 0, Hdr_Indicator 0 (no custom table, no decompress)
  const header = [0xd6, 0xc3, 0xc4, 0x00, 0x00];

  return header.concat(window);
}

describe('applyXdelta', () => {
  test('round-trip on a synthetic 1KB buffer (ADD)', () => {
    // Source: 1024 zeros
    const source = new Uint8Array(1024);
    // Target: 1024 bytes with known pattern
    const target = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) target[i] = i & 0xff;

    // Build a patch: single ADD of all 1024 target bytes
    const patch = u8(buildVcdiffPatch([{ type: 'add', data: target }], 0));

    const { rom: out, records } = applyXdeltaBytes(source, patch);
    expect(records).toBe(1);
    expect(out.length).toBe(1024);
    expect(Array.from(out)).toEqual(Array.from(target));
  });

  test('multi-window patch (COPY + ADD)', () => {
    // Source: 64 bytes of zeros
    const source = new Uint8Array(64);

    // Patch: COPY 32 bytes from source[0], then ADD 32 bytes of 0xAA
    const addData = new Uint8Array(32).fill(0xAA);
    const patch = u8(buildVcdiffPatch([
      { type: 'copy', addr: 0, size: 32 },
      { type: 'add', data: addData },
    ], 64));

    const { rom: out, records } = applyXdeltaBytes(source, patch);
    expect(records).toBe(1);
    expect(out.length).toBe(64);
    for (let i = 0; i < 32; i++) expect(out[i]).toBe(0);
    for (let i = 32; i < 64; i++) expect(out[i]).toBe(0xAA);
  });

  test('multi-window with separate windows', () => {
    // Two separate windows: first ADDs 4 bytes, second ADDs 4 more
    const source = new Uint8Array(8);
    const data1 = u8([0x11, 0x22, 0x33, 0x44]);
    const data2 = u8([0x55, 0x66, 0x77, 0x88]);

    // Build a patch with explicit two windows
    const header = [0xd6, 0xc3, 0xc4, 0x00, 0x00];

    // Window 1: ADD 4 bytes, no source
    const win1Delta = [];
    win1Delta.push(...encodeVarint(4)); // target window length
    win1Delta.push(0x00); // delta indicator
    win1Delta.push(...encodeVarint(4)); // data section length
    win1Delta.push(...encodeVarint(1)); // instructions length (1 byte: code 5 = ADD size 4)
    win1Delta.push(...encodeVarint(0)); // addresses length (0)
    win1Delta.push(...data1); // ADD data
    win1Delta.push(5); // code index 5 = ADD size 4, mode 0, NOOP

    const win1 = [0x00]; // no source
    win1.push(...encodeVarint(win1Delta.length));
    win1.push(...win1Delta);

    // Window 2: ADD 4 bytes, no source
    const win2Delta = [];
    win2Delta.push(...encodeVarint(4));
    win2Delta.push(0x00);
    win2Delta.push(...encodeVarint(4));
    win2Delta.push(...encodeVarint(1));
    win2Delta.push(...encodeVarint(0));
    win2Delta.push(...data2);
    win2Delta.push(5); // ADD size 4

    const win2 = [0x00];
    win2.push(...encodeVarint(win2Delta.length));
    win2.push(...win2Delta);

    const patch = u8(header.concat(win1).concat(win2));
    const { rom: out, records } = applyXdeltaBytes(source, patch);
    expect(records).toBe(2);
    expect(out.length).toBe(8);
    expect(Array.from(out)).toEqual([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);
  });

  test('rejects bad magic bytes', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = u8([0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48]);
    expect(() => applyXdeltaBytes(rom, patch)).toThrow(/magic/i);
  });

  test('rejects truncated patch (too small for header)', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = u8([0xd6, 0xc3]);
    expect(() => applyXdeltaBytes(rom, patch)).toThrow(/truncated/i);
  });

  test('rejects patch with only magic+version, no indicator', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = u8([0xd6, 0xc3, 0xc4, 0x00]);
    expect(() => applyXdeltaBytes(rom, patch)).toThrow(/truncated/i);
  });

  test('rejects non-Uint8Array inputs', () => {
    const patch = u8([0xd6, 0xc3, 0xc4, 0x00]);
    expect(() => applyXdeltaBytes(null, patch)).toThrow(/Uint8Array/i);
    expect(() => applyXdeltaBytes(new Uint8Array(4), null)).toThrow(/Uint8Array/i);
  });
});
