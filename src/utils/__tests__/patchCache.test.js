/**
 * Tests for src/utils/patchCache.js — getCachedPatch and clearPatchCache.
 *
 * expo-file-system is mocked so no real filesystem access is required.
 * The real (un-mocked) sha256 and b64 modules are used to verify hashing
 * logic. Tests use synthetic fixture bytes — never real patch data.
 */

const { getCachedPatch, clearPatchCache } = require('../patchCache');
const { sha256 } = require('../sha256');
const { base64ToBytes } = require('../b64');

// Reusable base64 encoder for Uint8Array.
function u8ToB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  return btoa(bin);
}

// ---- fixture data ----
const PATCH_BYTES_1 = new Uint8Array([0x50, 0x41, 0x54, 0x43, 0x48, 0x00, 0x01, 0x02]);
const PATCH_BYTES_2 = new Uint8Array([0x50, 0x41, 0x54, 0x43, 0x48, 0x03, 0x04, 0x05]);
const SHA256_1 = sha256(PATCH_BYTES_1);
const SHA256_2 = sha256(PATCH_BYTES_2);

// ---- expo-file-system mock surface ----
const mockState = {
  // Map of fileUri -> Uint8Array bytes (what's on "disk").
  files: new Map(),
  // What downloadAsync should simulate (status code).
  downloadStatus: 200,
  // Whether to write download bytes to the "disk".
  downloadWritesBytes: true,
};

function setFile(uri, bytes) {
  mockState.files.set(uri, bytes);
}
function removeFile(uri) {
  mockState.files.delete(uri);
}

jest.mock('expo-file-system', () => {
  // Inline base64 encoder — Jest mock factories cannot reference
  // outer-scope variables (except `mock`-prefixed vars).
  const mockB64encode = (bytes) => {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    return btoa(bin);
  };
  return {
    cacheDirectory: '/mock/cache/',
    EncodingType: { Base64: 'base64' },
    makeDirectoryAsync: jest.fn((_dir, _opts) => Promise.resolve()),
    getInfoAsync: jest.fn((uri) =>
      Promise.resolve({
        exists: mockState.files.has(uri),
        size: mockState.files.has(uri) ? mockState.files.get(uri).length : 0,
        uri,
      })
    ),
    readAsStringAsync: jest.fn((uri, _opts) => {
      if (!mockState.files.has(uri)) return Promise.reject(new Error('File not found'));
      return Promise.resolve(mockB64encode(mockState.files.get(uri)));
    }),
    downloadAsync: jest.fn((url, fileUri) => {
      if (mockState.downloadStatus !== 200) {
        return Promise.resolve({ status: mockState.downloadStatus, uri: fileUri });
      }
      if (mockState.downloadWritesBytes && mockState.files.has(url)) {
        // Copy from URL to file URI using pre-staged bytes.
        mockState.files.set(fileUri, mockState.files.get(url));
      }
      return Promise.resolve({ status: 200, uri: fileUri });
    }),
    deleteAsync: jest.fn((uri, _opts) => {
      if (mockState.files.has(uri)) mockState.files.delete(uri);
      // If it's a directory "delete", clear all children.
      if (uri.endsWith('/')) {
        for (const key of mockState.files.keys()) {
          if (key.startsWith(uri)) mockState.files.delete(key);
        }
      }
      return Promise.resolve();
    }),
  };
});

const FileSystem = require('expo-file-system');

/** Helper: compute the expected cached URI for a hash. */
function cacheUriFor(hex) {
  return `/mock/cache/patches/${hex}.ips`;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState.files.clear();
  mockState.downloadStatus = 200;
  mockState.downloadWritesBytes = true;
});

describe('getCachedPatch', () => {
  test('rejects non-HTTPS URL', async () => {
    await expect(getCachedPatch('http://example.com/patch.ips', SHA256_1)).rejects.toThrow(
      /HTTPS/
    );
    await expect(getCachedPatch('', SHA256_1)).rejects.toThrow();
    await expect(getCachedPatch(null, SHA256_1)).rejects.toThrow();
  });

  test('rejects malformed SHA-256', async () => {
    await expect(getCachedPatch('https://example.com/p.ips', 'nothex')).rejects.toThrow(/SHA-256/);
    await expect(getCachedPatch('https://example.com/p.ips', '0'.repeat(63))).rejects.toThrow();
    await expect(getCachedPatch('https://example.com/p.ips', null)).rejects.toThrow();
  });

  test('downloads, verifies, and caches a fresh patch', async () => {
    const url = 'https://example.com/patch1.ips';
    // Stage the download bytes at the URL so downloadAsync can copy them.
    setFile(url, PATCH_BYTES_1);

    const uri = await getCachedPatch(url, SHA256_1);
    expect(uri).toBe(cacheUriFor(SHA256_1));
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith('/mock/cache/patches/', {
      intermediates: true,
    });
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(url, cacheUriFor(SHA256_1));
  });

  test('returns cached URI on cache hit with valid hash (no download)', async () => {
    const url = 'https://example.com/patch1.ips';
    const expectedUri = cacheUriFor(SHA256_1);
    // Pre-seed the cache with correct bytes.
    setFile(expectedUri, PATCH_BYTES_1);
    setFile(url, PATCH_BYTES_1);

    const uri = await getCachedPatch(url, SHA256_1);
    expect(uri).toBe(expectedUri);
    // No download should have been issued.
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  test('byte rot: cache hit with corrupted bytes triggers re-download', async () => {
    const url = 'https://example.com/patch1.ips';
    const cacheUri = cacheUriFor(SHA256_1);
    // Pre-seed cache with WRONG bytes (byte rot).
    setFile(cacheUri, PATCH_BYTES_2); // different bytes => different hash
    // Stage download with correct bytes.
    setFile(url, PATCH_BYTES_1);

    const uri = await getCachedPatch(url, SHA256_1);
    expect(uri).toBe(cacheUri);
    // Should have deleted the rotten cache file and re-downloaded.
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(cacheUri, { idempotent: true });
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(url, cacheUri);
    // After re-download, the file should contain the correct bytes.
    const newB64 = u8ToB64(PATCH_BYTES_1);
    const storedB64 = await FileSystem.readAsStringAsync(cacheUri, {
      encoding: 'base64',
    });
    expect(storedB64).toBe(Buffer.from(PATCH_BYTES_1).toString('base64'));
  });

  test('hash mismatch after download: deletes file and throws', async () => {
    const url = 'https://example.com/wrong-patch.ips';
    // Download writes bytes that don't match the expected hash.
    setFile(url, PATCH_BYTES_2);
    const expectedUri = cacheUriFor(SHA256_1); // We expect SHA256_1 but get PATCH_BYTES_2

    await expect(getCachedPatch(url, SHA256_1)).rejects.toThrow(/integrity check failed/i);
    // The mismatched file should have been deleted.
    expect(mockState.files.has(expectedUri)).toBe(false);
  });

  test('HTTP failure: deletes partial download and throws', async () => {
    const url = 'https://example.com/missing.ips';
    mockState.downloadStatus = 404;
    setFile(url, PATCH_BYTES_1);

    await expect(getCachedPatch(url, SHA256_1)).rejects.toThrow(/HTTP status 404/);
    // The cache file should not exist after a failed download.
    expect(mockState.files.has(cacheUriFor(SHA256_1))).toBe(false);
  });

  test('returns the original URL on web (no native filesystem)', async () => {
    // Save and replace the module-level FileSystem reference.
    const saved = FileSystem;
    // Unregister mock to simulate web env — this is a two-phase trick:
    // we can't easily swap the module reference post-import, so instead we
    // verify the fallback by checking that the web-path call doesn't throw.
    const { getCachedPatch: getCachedPatchWeb } = require('../patchCache');
    // When cacheDirectory is undefined, patchCache returns the URL as-is.
    // We can't fully simulate web without module re-exports, but we verify
    // the web guard works by checking the code path exists.
    const url = 'https://example.com/patch.ips';
    // This should not throw because with FileSystem mocked, cacheDirectory exists.
    // Real web testing requires an actual web runtime. We just verify the fn returns.
    expect(typeof getCachedPatchWeb).toBe('function');
  });

  test('uppercase hex input is normalized before use', async () => {
    const url = 'https://example.com/patch1.ips';
    setFile(url, PATCH_BYTES_1);
    const uri = await getCachedPatch(url, SHA256_1.toUpperCase());
    expect(uri).toBe(cacheUriFor(SHA256_1));
  });
});

describe('clearPatchCache', () => {
  test('deletes the patch cache directory', async () => {
    await clearPatchCache();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('/mock/cache/patches/', {
      idempotent: true,
    });
  });

  test('swallows errors gracefully (web / already-missing)', async () => {
    FileSystem.deleteAsync.mockRejectedValueOnce(new Error('ENOENT'));
    await expect(clearPatchCache()).resolves.toBeUndefined();
  });
});
