/**
 * Tests for the base-ROM verification gate (src/utils/verify.js) and the
 * base-ROM manifest (src/data/baseRoms.js).
 *
 * expo-file-system is mocked so no real filesystem access is required — the
 * tests exercise verifyRom's size-first, hash-second decision logic with
 * synthetic fixture data. SHA-256 is computed over in-memory Uint8Array fix
 * contents via the real (un-mocked) vendored sha256 module.
 */

const { verifyRom, formatVerifyError } = require('../verify');
const { getBaseRomSpec, BASE_ROMS } = require('../../data/baseRoms');
const { sha256 } = require('../sha256');

// Minimal base64 encoder for Uint8Array (keeps tests dependency-free).
const btoaFor =
  typeof Buffer !== 'undefined'
    ? (bytes) => Buffer.from(bytes).toString('base64')
    : (bytes) => {
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      };

// Synthetic fixture ROM bytes (small, never real copyrighted material).
const FIXTURE_BYTES = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
const FIXTURE_HASH = sha256(FIXTURE_BYTES);

// A baseRomName that exists in the manifest but whose hash is a placeholder
// (REPLACE_ME). We build a per-test expected spec by copying the manifest and
// substituting a real verified hash + correct size, so the test controls the
// "expected" side without ever committing ROM data.
const KNOWN_NAME = Object.keys(BASE_ROMS)[0];

// ---- expo-file-system mock surface ----
// jest.mock factories cannot reference out-of-scope variables, so the mutable
// state backing the mock lives on a module-level object (prefixed `mock` so
// jest permits it) and the factory returns jest.fn implementations that read
// from it at call time.
const mockState = {
  // The bytes that readAsStringAsync should return (default fixture).
  romBytes: FIXTURE_BYTES,
  // The info object getInfoAsync returns.
  info: { exists: true, size: FIXTURE_BYTES.length },
};

jest.mock('expo-file-system', () => {
  const mod = {
    EncodingType: { Base64: 'base64' },
    documentDirectory: '/data/',
    makeDirectory: jest.fn(),
    getInfoAsync: jest.fn((uri) =>
      Promise.resolve({ exists: mockState.info.exists, size: mockState.info.size, uri }
      )),
    readAsStringAsync: jest.fn((uri) => {
      // Encode mockState.romBytes to base64 at call time.
      let bin = '';
      const b = mockState.romBytes;
      for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      if (typeof Buffer !== 'undefined') {
        return Promise.resolve(Buffer.from(b).toString('base64'));
      }
      return Promise.resolve(btoa(bin));
    }),
  };
  return mod;
});

const FileSystem = require('expo-file-system');

/** Install a mocked ROM file with a given byte content and return its hash. */
function installMockRom(bytes) {
  const hash = sha256(bytes);
  mockState.romBytes = bytes;
  mockState.info = { exists: true, size: bytes.length };
  FileSystem.getInfoAsync.mockImplementation((uri) =>
    Promise.resolve({ exists: true, size: bytes.length, uri })
  );
  FileSystem.readAsStringAsync.mockImplementation(() => {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    if (typeof Buffer !== 'undefined') return Promise.resolve(Buffer.from(bytes).toString('base64'));
    return Promise.resolve(btoa(bin));
  });
  return hash;
}

/** Replace the manifest entry for KNOWN_NAME with a fully-verified spec. */
function patchManifest(expectedName, overrides) {
  const orig = BASE_ROMS[expectedName];
  BASE_ROMS[expectedName] = { ...orig, ...overrides };
  return () => { BASE_ROMS[expectedName] = orig; };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.romBytes = FIXTURE_BYTES;
  mockState.info = { exists: true, size: FIXTURE_BYTES.length };
  FileSystem.getInfoAsync.mockImplementation((uri) =>
    Promise.resolve({ exists: true, size: FIXTURE_BYTES.length, uri })
  );
  FileSystem.readAsStringAsync.mockImplementation(() => {
    let bin = '';
    const b = mockState.romBytes;
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    if (typeof Buffer !== 'undefined') {
      return Promise.resolve(Buffer.from(b).toString('base64'));
    }
    return Promise.resolve(btoa(bin));
  });
});

describe('getBaseRomSpec', () => {
  test('returns the spec for a known baseRomName', () => {
    const spec = getBaseRomSpec(KNOWN_NAME);
    expect(spec).toHaveProperty('size');
    expect(spec).toHaveProperty('sha256');
    expect(typeof spec.size).toBe('number');
  });

  test('throws on a missing manifest entry instead of silently passing', () => {
    expect(() => getBaseRomSpec('Definitely Not A Real ROM (U).gba')).toThrow(
      /Unknown base ROM/
    );
  });

  test('throws on an empty name', () => {
    expect(() => getBaseRomSpec('')).toThrow(/no name provided/i);
  });
});

describe('verifyRom', () => {
  test('passes when size and hash both match the manifest', async () => {
    const hash = installMockRom(FIXTURE_BYTES);
    const restore = patchManifest(KNOWN_NAME, {
      size: FIXTURE_BYTES.length,
      sha256: hash,
      verified: true,
    });
    try {
      const out = await verifyRom('/mock/rom', KNOWN_NAME);
      expect(out.size).toBe(FIXTURE_BYTES.length);
      expect(out.sha256).toBe(hash);
    } finally {
      restore();
    }
  });

  test('rejects a wrong-size ROM before hashing (size checked first)', async () => {
    // Wrong size: 9 bytes instead of 8.
    installMockRom(new Uint8Array([...FIXTURE_BYTES, 0x09]));
    const restore = patchManifest(KNOWN_NAME, {
      size: FIXTURE_BYTES.length,
      sha256: FIXTURE_HASH,
      verified: true,
    });
    try {
      await expect(verifyRom('/mock/rom', KNOWN_NAME)).rejects.toThrow(/Wrong base ROM/);
      await expect(verifyRom('/mock/rom', KNOWN_NAME)).rejects.toMatchObject({
        code: 'ROM_SIZE_MISMATCH',
        expectedSize: FIXTURE_BYTES.length,
        pickedSize: FIXTURE_BYTES.length + 1,
      });
      // The size mismatch must surface before any hash is computed.
      expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  test('rejects a correct-size but wrong-hash ROM', async () => {
    installMockRom(FIXTURE_BYTES);
    // Wrong expected hash (size still matches the fixture).
    const restore = patchManifest(KNOWN_NAME, {
      size: FIXTURE_BYTES.length,
      sha256: '0'.repeat(64),
      verified: true,
    });
    try {
      await expect(verifyRom('/mock/rom', KNOWN_NAME)).rejects.toMatchObject({
        code: 'ROM_HASH_MISMATCH',
      });
      await expect(verifyRom('/mock/rom', KNOWN_NAME)).rejects.toThrow(/Wrong base ROM/);
    } finally {
      restore();
    }
  });

  test('rejects a manifest entry whose hash is an unverified placeholder', async () => {
    installMockRom(FIXTURE_BYTES);
    // Known-name manifest entry has sha256 === 'REPLACE_ME' by default. Patch
    // only the size so the size check passes and we reach the unverified gate.
    const restore = patchManifest(KNOWN_NAME, { size: FIXTURE_BYTES.length });
    try {
      expect(BASE_ROMS[KNOWN_NAME].sha256).toBe('REPLACE_ME');
      // Size matches the fixture, so we get past the size check and hit the
      // unverified-hash gate — which must BLOCK, not silently pass.
      await expect(verifyRom('/mock/rom', KNOWN_NAME)).rejects.toMatchObject({
        code: 'ROM_HASH_UNVERIFIED',
      });
      await expect(verifyRom('/mock/rom', KNOWN_NAME)).rejects.toThrow(/Wrong base ROM/);
    } finally {
      restore();
    }
  });

  test('reports the expected dump name and both sizes in the message', async () => {
    installMockRom(new Uint8Array([...FIXTURE_BYTES, 0x09]));
    const expectedSize = FIXTURE_BYTES.length + 5;
    const restore = patchManifest(KNOWN_NAME, { sha256: FIXTURE_HASH, verified: true, size: expectedSize });
    try {
      let msg = '';
      try {
        await verifyRom('/mock/01-saved-game (U).gba', KNOWN_NAME);
      } catch (e) {
        msg = e.message;
      }
      expect(msg).toContain(KNOWN_NAME);
      expect(msg).toContain(String(expectedSize));
      expect(msg).toContain(String(FIXTURE_BYTES.length + 1));
    } finally {
      restore();
    }
  });
});

describe('formatVerifyError', () => {
  test('renders WRONG BASE ROM for verify errors', () => {
    const e = new Error('Wrong base ROM: picked x (8 bytes). Expected y (16 bytes).');
    e.code = 'ROM_SIZE_MISMATCH';
    const out = formatVerifyError(e);
    expect(out.title).toBe('WRONG BASE ROM');
    expect(out.body).toBe(e.message);
  });

  test('preserves decoder mismatch errors (PATCH FAILED, message intact)', () => {
    const e = new Error('source size mismatch in UPS decoder');
    e.code = 'UPS_SOURCE_SIZE_MISMATCH';
    const out = formatVerifyError(e);
    expect(out.title).toBe('PATCH FAILED');
    expect(out.body).toBe('source size mismatch in UPS decoder');
  });

  test('falls back to PATCH FAILED for unknown errors', () => {
    const out = formatVerifyError(new Error('boom'));
    expect(out.title).toBe('PATCH FAILED');
    expect(out.body).toBe('boom');
  });
});
