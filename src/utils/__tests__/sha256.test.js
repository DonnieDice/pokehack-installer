const { sha256 } = require('../sha256');

// Standard SHA-256 known-answer vectors. Expected digests must stay literal:
// deriving them with the implementation under test would hide constant drift.
describe('sha256 known-answer vectors', () => {
  test.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ])('matches the standard digest for %j', (input, expected) => {
    expect(sha256(input)).toBe(expected);
    expect(sha256(new Uint8Array(Buffer.from(input, 'ascii')))).toBe(expected);
  });

  test('matches the million-a vector across many blocks', () => {
    expect(sha256(new Uint8Array(1000000).fill(0x61))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0'
    );
  });
});
