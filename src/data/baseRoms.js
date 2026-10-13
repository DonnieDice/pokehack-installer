/**
 * Base-ROM verification manifest.
 *
 * One entry per distinct `baseRomName` referenced by `hacks.js`. Each entry
 * records the expected file size (in bytes, from No-Intro DAT knowledge) and
 * the expected SHA-256 digest of the dump.
 *
 * HASH STATUS — merged from rom-hack-installer (project 134, verified 2026-10-12):
 * VERIFIED (2): Fire Red (U)(Squirrels), Crystal (U)[Rev 1] — digests below
 *   confirmed against at least two independent public references for the exact
 *   dump (see per-entry Sources). Remaining entries are placeholders
 *   (`REPLACE_ME`): this worker does NOT possess a legally-owned dump of those
 *   games and therefore cannot compute a real digest at implementation time.
 *   Per the task spec, placeholders are used ONLY when a hash cannot be
 *   verified, and they are paired with a TODO comment. `verifyRom` rejects a
 *   REPLACE_ME/TODO hash exactly like a mismatch (it never silently passes),
 *   so these entries block patching until a real digest is supplied — which is
 *   the safe behavior for an unverified dump.
 * Sizes are No-Intro DAT values: GBA ROM images are 16 MiB (16,777,216 bytes),
 * GBC ROM images are 2 MiB (2,097,152 bytes), and the NDS Black 2 (U) dump is
 * 256 MiB (268,435,456 bytes). Replace each `REPLACE_ME` with a verified
 * No-Intro sha256 before relying on hash verification in production.
 *
 * See parent work item #4 (base-ROM verification). Never commit ROM files,
 * patch files, BIOS dumps, or keystores — only these digests.
 */

export const GBA_FIRE_RED_SQUIRRELS = 'Pokemon - Fire Red Version (U)(Squirrels).gba';
export const GBA_EMERALD = 'Pokemon - Emerald Version (U).gba';
export const GBC_CRYSTAL = 'Pokemon - Crystal Version (U).gbc';
export const GBC_GOLD = 'Pokemon - Gold Version (U).gbc';
export const GBA_RUBY_MODE7 = 'Pokemon - Ruby Version (U)(Mode7).gba';
export const NDS_BLACK_2 = 'Pokemon - Black Version 2 (U).nds';

export const BASE_ROMS = {
  [GBA_FIRE_RED_SQUIRRELS]: {
    size: 16 * 1024 * 1024, // 16,777,216 bytes — GBA ROM (No-Intro "Pokemon - FireRed Version (USA)" v1.0, Squirrels dump)
    // VERIFIED 2026-10-12 (ported from rom-hack-installer): mutually consistent MD5/SHA-1/CRC32 on
    // romhacking.net hack 4147 (Unofficial Pokemon Throwback) + hack 3499 (Throwback: FR251 Addendum).
    sha256: '3d0c79f1627022e18765766f6cb5ea067f6b5bf7dca115552189ad65a5c3a8ac',
    verified: true,
  },
  [GBA_EMERALD]: {
    size: 16 * 1024 * 1024, // 16,777,216 bytes — GBA ROM (No-Intro)
    // TODO: not re-verified (no legal dump in this environment). Placeholder.
    sha256: 'REPLACE_ME',
    verified: false,
  },
  [GBC_CRYSTAL]: {
    size: 2 * 1024 * 1024, // 2,097,152 bytes — GBC ROM (No-Intro "Pokemon - Crystal Version (USA, Europe) (Rev 1)" v1.1)
    // VERIFIED 2026-10-12 (ported from rom-hack-installer): pokeorange release notes
    // (github.com/PiaCarrot/pokeorange) SHA-256 for "(USA, Europe) (Rev 1).gbc" +
    // gbatemp header dump "(UE) (Rev A).gbc" — identical MD5 301899b8.../SHA-1 f2f52230.../CRC32 3358e30a.
    sha256: 'fdcc3c8c43813cf8731fc037d2a6d191bac75439c34b24ba1c27526e6acdc8a2',
    verified: true,
  },
  [GBC_GOLD]: {
    size: 2 * 1024 * 1024, // 2,097,152 bytes — GBC ROM (No-Intro)
    // TODO: not re-verified (no legal dump in this environment). Placeholder.
    sha256: 'REPLACE_ME',
    verified: false,
  },
  [GBA_RUBY_MODE7]: {
    size: 16 * 1024 * 1024, // 16,777,216 bytes — GBA ROM (No-Intro)
    // TODO: not re-verified (no legal dump in this environment). Placeholder.
    sha256: 'REPLACE_ME',
    verified: false,
  },
  [NDS_BLACK_2]: {
    size: 256 * 1024 * 1024, // 268,435,456 bytes — 256MB NDS dump (No-Intro)
    // TODO: not re-verified (no legal dump in this environment). Placeholder.
    sha256: 'REPLACE_ME',
    verified: false,
  },
};

/**
 * Look up the verification spec for a base-ROM name.
 * @param {string} baseRomName - exact `baseRomName` from hacks.js
 * @returns {{size:number, sha256:string, verified:boolean}} the spec
 * @throws {Error} if no manifest entry exists for `baseRomName` — callers
 *   must never silently patch against an unverified/unknown dump.
 */
export function getBaseRomSpec(baseRomName) {
  if (baseRomName == null || baseRomName === '') {
    throw new Error(
      'Unknown base ROM — no name provided, no verification data available. Patch may fail.'
    );
  }
  const spec = BASE_ROMS[baseRomName];
  if (!spec) {
    throw new Error(
      'Unknown base ROM ' + baseRomName + ' — no verification data available. Patch may fail.'
    );
  }
  return spec;
}

export default BASE_ROMS;
