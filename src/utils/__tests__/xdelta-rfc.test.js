const { applyXdeltaBytes } = require('../xdelta');
const u8 = (bytes) => new Uint8Array(bytes);

// Literal RFC 3284 fixtures: no shared encoder that can mask a decoder defect.
describe('RFC 3284 integer interoperability', () => {
  test('accepts a standard literal ADD patch', () => {
    const patch = u8([0xd6, 0xc3, 0xc4, 0, 0, 0, 9, 3, 0, 3, 1, 0, 65, 66, 67, 4]);
    expect(applyXdeltaBytes(u8([]), patch).rom).toEqual(u8([65, 66, 67]));
  });

  test('accepts multi-byte target, section and instruction sizes', () => {
    const data = Array(128).fill(65);
    const patch = u8([0xd6, 0xc3, 0xc4, 0, 0, 0, 0x81, 0x0a,
      0x81, 0, 0, 0x81, 0, 3, 0, ...data, 1, 0x81, 0]);
    expect(applyXdeltaBytes(u8([]), patch).rom).toEqual(u8(data));
  });

  test('accepts a multi-byte source size and COPY address', () => {
    const source = new Uint8Array(131);
    source.set([65, 66, 67], 128);
    const patch = u8([0xd6, 0xc3, 0xc4, 0, 0, 1, 0x81, 3, 0,
      9, 3, 0, 0, 2, 2, 19, 3, 0x81, 0]);
    expect(applyXdeltaBytes(source, patch).rom).toEqual(u8([65, 66, 67]));
  });

  test('rejects an unterminated standard integer', () => {
    expect(() => applyXdeltaBytes(u8([]), u8([0xd6, 0xc3, 0xc4, 0, 0, 0, 0x81])))
      .toThrow('Truncated xdelta: varint runs past end of patch');
  });

  test('rejects unsafe integers before allocating the target', () => {
    const patch = u8([0xd6, 0xc3, 0xc4, 0, 0, 0, 8,
      0x90, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0]); // 2**53 target length
    expect(() => applyXdeltaBytes(u8([]), patch)).toThrow('xdelta: varint exceeds safe integer range');
  });
});
