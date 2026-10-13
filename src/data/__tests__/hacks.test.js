/**
 * Catalog data integrity: every hack entry must be complete and its project
 * URL must be an https link (catches the broken/renumbered forum link class
 * that shipped before — see MR "catalog pivot").
 */
const { HACKS, PLATFORMS, TAGS } = require('../hacks');
const { COVERS } = require('../covers');

describe('catalog', () => {
  test('has at least 45 hacks', () => {
    expect(HACKS.length).toBeGreaterThanOrEqual(45);
  });

  test('every hack has unique ids', () => {
    const ids = HACKS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every hack has a valid https projectUrl', () => {
    for (const h of HACKS) {
      expect(typeof h.projectUrl).toBe('string');
      expect(h.projectUrl.startsWith('https://')).toBe(true);
      try {
        // Must parse as a well-formed URL with a host.
        const u = new URL(h.projectUrl);
        expect(u.hostname).toContain('.');
      } catch (e) {
        throw new Error(h.id + ' projectUrl is not a valid URL: ' + h.projectUrl);
      }
    }
  });

  test('remote cover art urls are valid https when present', () => {
    let withCover = 0;
    for (const h of HACKS) {
      if (h.coverUrl !== undefined) {
        expect(h.coverUrl.startsWith('https://')).toBe(true);
        expect(() => new URL(h.coverUrl)).not.toThrow();
        withCover++;
      }
    }
    // The large majority of the catalog must carry real remote cover art.
    expect(withCover).toBeGreaterThanOrEqual(Math.floor(HACKS.length * 0.7));
  });

  test('every hack has the required catalog fields', () => {
    for (const h of HACKS) {
      for (const field of [
        'id', 'title', 'subtitle', 'platform', 'baseGame', 'projectUrl',
        'description', 'difficulty', 'tags', 'rating', 'hours',
        'accentColor',
      ]) {
        if (h[field] === undefined || h[field] === null) {
          throw new Error(h.id + ' is missing field: ' + field);
        }
      }
      // features is optional; when present it must be a non-empty array.
      if (h.features !== undefined) {
        expect(Array.isArray(h.features)).toBe(true);
        expect(h.features.length).toBeGreaterThan(0);
      }
      expect(Array.isArray(h.tags)).toBe(true);
      expect(typeof h.completed).toBe('boolean');
      expect(h.rating).toBeGreaterThan(0);
      expect(h.rating).toBeLessThanOrEqual(10);
    }
  });

  test('every hack platform is in the PLATFORMS filter list', () => {
    const known = PLATFORMS.filter((p) => p !== 'All');
    for (const h of HACKS) {
      expect(known).toContain(h.platform);
    }
  });

  test('every hack has generated cover art', () => {
    for (const h of HACKS) {
      expect(COVERS[h.id]).toBeDefined();
    }
    // No orphan covers either.
    for (const id of Object.keys(COVERS)) {
      expect(HACKS.some((h) => h.id === id)).toBe(true);
    }
  });
});
