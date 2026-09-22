const { applyIps } = require('../ips');

function u8(arr) {
  return new Uint8Array(arr);
}

describe('applyIps', () => {
  test('applies a simple data record', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = u8([
      0x50, 0x41, 0x54, 0x43, 0x48,
      0x00, 0x00, 0x04,
      0x00, 0x03,
      0x58, 0x59, 0x5a,
      0x45, 0x4f, 0x46,
    ]);
    const { rom: out, records } = applyIps(rom, patch);
    expect(records).toBe(1);
    expect(Array.from(out.slice(4, 7))).toEqual([0x58, 0x59, 0x5a]);
    expect(out.length).toBe(16);
  });

  test('applies an RLE record', () => {
    const rom = u8(new Array(8).fill(0));
    const patch = u8([
      0x50, 0x41, 0x54, 0x43, 0x48,
      0x00, 0x00, 0x02,
      0x00, 0x00,
      0x00, 0x03,
      0xab,
      0x45, 0x4f, 0x46,
    ]);
    const { rom: out } = applyIps(rom, patch);
    expect(Array.from(out.slice(2, 5))).toEqual([0xab, 0xab, 0xab]);
  });

  test('grows the ROM when a record extends past the end', () => {
    const rom = u8(new Array(4).fill(0));
    const patch = u8([
      0x50, 0x41, 0x54, 0x43, 0x48,
      0x00, 0x00, 0x06,
      0x00, 0x02,
      0x11, 0x22,
      0x45, 0x4f, 0x46,
    ]);
    const { rom: out } = applyIps(rom, patch);
    expect(out.length).toBe(8);
    expect(Array.from(out.slice(6, 8))).toEqual([0x11, 0x22]);
  });

  test('rejects bad magic bytes', () => {
    const rom = u8([0, 0, 0, 0]);
    const patch = u8([0x41, 0x42, 0x43, 0x44, 0x45, 0x46]);
    expect(() => applyIps(rom, patch)).toThrow(/magic/i);
  });

  test('rejects truncated data records', () => {
    const rom = u8(new Array(16).fill(0));
    const patch = u8([0x50, 0x41, 0x54, 0x43, 0x48, 0x00, 0x00, 0x04, 0x00, 0x20, 0x01, 0x02]);
    expect(() => applyIps(rom, patch)).toThrow(/truncated/i);
  });
});
