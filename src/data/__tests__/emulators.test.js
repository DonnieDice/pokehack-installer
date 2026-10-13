/**
 * Emulator directory data integrity: every entry must link out safely via a
 * Play Store search URL (never a hard-coded package id that can break) and
 * optional stable website links must be https.
 */
const { EMULATORS, playStoreSearchUrl } = require('../emulators');

describe('emulators', () => {
  test('has a curated directory', () => {
    expect(EMULATORS.length).toBeGreaterThanOrEqual(8);
  });

  test('every emulator has required fields and unique ids', () => {
    const ids = EMULATORS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EMULATORS) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.note).toBe('string');
      expect(typeof e.price).toBe('string');
      expect(typeof e.playQuery).toBe('string');
      expect(e.playQuery.length).toBeGreaterThan(0);
      expect(Array.isArray(e.platforms)).toBe(true);
      expect(e.platforms.length).toBeGreaterThan(0);
    }
  });

  test('playStoreSearchUrl builds a valid https Play search URL', () => {
    const url = playStoreSearchUrl('Pizza Boy GBA emulator');
    expect(url.startsWith('https://play.google.com/store/search?q=')).toBe(true);
    expect(url.endsWith('&c=apps')).toBe(true);
    expect(url).toContain(encodeURIComponent(' '));
    expect(() => new URL(url)).not.toThrow();
  });

  test('optional site links are https', () => {
    for (const e of EMULATORS) {
      if (e.siteUrl) {
        expect(e.siteUrl.startsWith('https://')).toBe(true);
      }
    }
  });

  test('most emulators carry a Play Store CDN icon', () => {
    const withIcon = EMULATORS.filter((e) => e.iconUrl);
    expect(withIcon.length).toBeGreaterThanOrEqual(8);
    for (const e of withIcon) {
      expect(e.iconUrl.startsWith('https://play-lh.googleusercontent.com/')).toBe(true);
    }
  });

  test('covers every platform in the catalog (GBA, GBC, NDS, SNES)', () => {
    const covered = new Set();
    for (const e of EMULATORS) {
      e.platforms.forEach((p) => covered.add(p));
    }
    for (const p of ['GBA', 'GBC', 'NDS', 'SNES']) {
      expect(covered.has(p)).toBe(true);
    }
  });
});
