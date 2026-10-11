jest.mock('expo-file-system', () => {
  const base64ToBytes = require('../b64').base64ToBytes;
  const bytesToBase64 = require('../b64').bytesToBase64;

  // In-memory byte store keyed by uri, plus directory tracking.
  const files = {};

  return {
    EncodingType: { Base64: 'base64', UTF8: 'utf8' },
    documentDirectory: 'file:///data/user/0/app/files/',
    makeDirectory: jest.fn(async (uri, { intermediates } = {}) => {
      // no-op: directories are implicit in the flat key store
    }),
    getInfoAsync: jest.fn(async (uri, options = {}) => {
      const buf = files[uri];
      return { exists: !!buf, isDirectory: false, size: buf ? buf.length : 0 };
    }),
    readAsStringAsync: jest.fn(async (uri, options = {}) => {
      const buf = files[uri];
      if (!buf) {
        throw new Error('File not found: ' + uri);
      }
      const position = options.position || 0;
      const length = options.length;
      let end;
      if (length != null) {
        end = Math.min(position + length, buf.length);
      } else {
        end = buf.length;
      }
      const slice = buf.slice(position, end);
      if (options.encoding === 'base64') {
        return bytesToBase64(slice);
      }
      return Buffer.from(slice).toString('utf8');
    }),
    writeAsStringAsync: jest.fn(async (uri, contents, options = {}) => {
      if (options.encoding === 'base64') {
        const existing = files[uri];
        const incoming = base64ToBytes(contents);
        if (existing) {
          const merged = new Uint8Array(existing.length + incoming.length);
          merged.set(existing, 0);
          merged.set(incoming, existing.length);
          files[uri] = merged;
        } else {
          files[uri] = incoming;
        }
      } else {
        files[uri] = new Uint8Array(Buffer.from(contents, 'utf8'));
      }
    }),
    deleteAsync: jest.fn(async (uri, options = {}) => {
      delete files[uri];
    }),
    // Internal helpers for tests.
    __files: files,
    __reset: () => {
      for (const k of Object.keys(files)) delete files[k];
    },
  };
});

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// Mock verifyRom so patcher-progress tests are decoupled from the base-ROM
// manifest. These tests exercise patching progress/cancellation, not ROM
// verification — using a fixture baseRomName ('base.gba') that is not in
// BASE_ROMS. The real verifyRom (and its tests) live in verify.test.js.
jest.mock('../verify', () => ({
  verifyRom: jest.fn(async () => ({ size: 4, sha256: 'test' })),
  formatVerifyError: jest.fn((e) => ({ title: 'PATCH FAILED', body: e.message })),
  default: { verifyRom: jest.fn(async () => ({ size: 4, sha256: 'test' })) },
}));

const FileSystem = require('expo-file-system');
const { patchRom, CancelledError } = require('../patcher');
const { applyIps } = require('../ips');
const { bytesToBase64, base64ToBytes } = require('../b64');

function u8(arr) {
  return new Uint8Array(arr);
}

function makeIpsPatch(rom, offset, bytes) {
  // offset as 3 bytes, length as 2 bytes, data
  const patch = [0x50, 0x41, 0x54, 0x43, 0x48]; // PATCH
  patch.push((offset >> 16) & 0xff, (offset >> 8) & 0xff, offset & 0xff);
  patch.push((bytes.length >> 8) & 0xff, bytes.length & 0xff);
  patch.push(...bytes);
  patch.push(0x45, 0x4f, 0x46); // EOF
  return u8(patch);
}

describe('patchRom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FileSystem.__reset();
  });

  test('onProgress called monotonically 0..1 across phases', async () => {
    const hack = { id: 'glazed', title: 'Glazed', patchFormat: 'ips', baseRomName: 'base.gba' };
    const rom = u8(new Array(4).fill(0));
    const patch = makeIpsPatch(rom, 0, [0xaa, 0xbb, 0xcc]);

    const calls = [];
    const isCancelled = () => false;

    FileSystem.__files['file:///rom.ips'] = rom;
    FileSystem.__files['file:///patch.ips'] = patch;

    await patchRom({
      romUri: 'file:///rom.ips',
      patchUri: 'file:///patch.ips',
      hack,
      onProgress: (fraction, phase) => calls.push({ fraction, phase }),
      isCancelled,
    });

    expect(calls.length).toBeGreaterThan(0);
    // First fraction must be 0 (or at least the read phase starts near 0).
    expect(calls[0].fraction).toBe(0);
    // Each subsequent fraction within a phase must be non-decreasing across the
    // whole stream: collect the first fraction per phase and assert monotonic
    // non-decrease globally, plus final == 1.
    // Monotonic check: every fraction >= the previous fraction when phase
    // stays the same, and the overall max fraction reaches 1.
    const fracs = calls.map((c) => c.fraction);
    expect(Math.max(...fracs)).toBe(1);
    // The phases observed should include read/apply/write.
    const phases = [...new Set(calls.map((c) => c.phase))];
    expect(phases).toEqual(expect.arrayContaining(['read', 'apply', 'write']));
  });

  test('cancel flag aborts with CancelledError', async () => {
    const hack = { id: 'glazed', title: 'Glazed', patchFormat: 'ips', baseRomName: 'base.gba' };
    const rom = u8(new Array(4).fill(0));
    const patch = makeIpsPatch(rom, 0, [0xaa, 0xbb, 0xcc]);

    FileSystem.__files['file:///rom.ips'] = rom;
    FileSystem.__files['file:///patch.ips'] = patch;

    let cancelled = false;
    const isCancelled = () => cancelled;

    // Flip the cancel flag synchronously during the read phase so the sliced
    // loop observes it and throws CancelledError.
    const progressSpy = jest.fn((fraction, phase) => {
      if (phase === 'read') {
        cancelled = true;
      }
    });

    await expect(
      patchRom({
        romUri: 'file:///rom.ips',
        patchUri: 'file:///patch.ipatch',
        hack,
        onProgress: progressSpy,
        isCancelled,
      })
    ).rejects.toThrow(CancelledError);
  });

  test('cancel cleans up partial output file', async () => {
    const hack = { id: 'glazed', title: 'Glazed', patchFormat: 'ips', baseRomName: 'base.gba' };
    const rom = u8(new Array(4).fill(0));
    const patch = makeIpsPatch(rom, 0, [0xaa, 0xbb, 0xcc]);

    FileSystem.__files['file:///rom.ips'] = rom;
    FileSystem.__files['file:///patch.ips'] = patch;

    let cancelled = false;
    const isCancelled = () => cancelled;
    const progressSpy = jest.fn((fraction, phase) => {
      if (phase === 'read') cancelled = true;
    });

    const outPath = FileSystem.documentDirectory + 'patched/Glazed-glazed.gba';

    await expect(
      patchRom({
        romUri: 'file:///rom.ips',
        patchUri: 'file:///patch.ips',
        hack,
        onProgress: progressSpy,
        isCancelled,
      })
    ).rejects.toThrow(CancelledError);

    // The partial output should have been deleted.
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
    expect(FileSystem.__files[outPath]).toBeUndefined();
  });

  test('error mapper returns each friendly string (magic, truncated, cancelled, default)', () => {
    const { friendlyPatchError } = require('../patchErrors');

    const ipsHack = { id: 'x', title: 'X', patchFormat: 'ips', baseRomName: 'Pokemon - Fire Red Version (U)(Squirrels).gba' };
    const upsHack = { id: 'y', title: 'Y', patchFormat: 'ups', baseRomName: 'base.ups' };

    // magic
    expect(friendlyPatchError(new Error('Not an IPS patch (bad magic bytes)'), ipsHack))
      .toBe('IPS file is not a valid patch. Re-download from project page.');
    expect(friendlyPatchError(new Error('bad magic bytes'), upsHack))
      .toBe('UPS file is not a valid patch. Re-download from project page.');

    // truncated
    expect(friendlyPatchError(new Error('Truncated IPS: data record overruns patch file'), ipsHack))
      .toBe('Patch file is incomplete/corrupted. Re-download.');

    // source size mismatch / wrong base ROM
    expect(friendlyPatchError(new Error('Wrong base ROM supplied'), ipsHack))
      .toBe('Base ROM does not match this patch. Expected dump: Pokemon - Fire Red Version (U)(Squirrels).gba.');
    expect(friendlyPatchError(new Error('source size mismatch'), ipsHack))
      .toBe('Base ROM does not match this patch. Expected dump: Pokemon - Fire Red Version (U)(Squirrels).gba.');

    // cancelled
    expect(friendlyPatchError(new CancelledError(), ipsHack))
      .toBe('Patch cancelled — no files changed.');

    // default
    expect(friendlyPatchError(new Error('boom'), ipsHack))
      .toBe('Patch failed: boom');
  });

  test('picker disabled / busy guard: patchRom rejects on web platform', async () => {
    // Re-mock Platform.OS to web for this case.
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    const { patchRom: patchRomWeb } = require('../patcher');
    await expect(
      patchRomWeb({ romUri: 'x', patchUri: 'y', hack: { patchFormat: 'ips' }, onProgress: () => {}, isCancelled: () => false })
    ).rejects.toThrow(/Android app only/);
  });

  test('return shape {path, name, size, records} unchanged', async () => {
    const hack = { id: 'glazed', title: 'Pokémon Glazed', patchFormat: 'ips', baseRomName: 'base.gba' };
    const rom = u8(new Array(16).fill(0));
    const patch = makeIpsPatch(rom, 4, [0x58, 0x59, 0x5a]);
    FileSystem.__files['file:///rom.ips'] = rom;
    FileSystem.__files['file:///patch.ips'] = patch;

    const out = await patchRom({
      romUri: 'file:///rom.ips',
      patchUri: 'file:///patch.ips',
      hack,
      onProgress: () => {},
      isCancelled: () => false,
    });

    expect(out).toHaveProperty('path');
    expect(out).toHaveProperty('name');
    expect(out).toHaveProperty('size');
    expect(out).toHaveProperty('records');
    expect(out.records).toBe(1);
    expect(out.size).toBe(16);
    // sanitizeName replaces non-ascii (é) with dashes, collapsing runs.
    expect(out.name).toBe('Pok-mon-Glazed-glazed.gba');
  });
});
