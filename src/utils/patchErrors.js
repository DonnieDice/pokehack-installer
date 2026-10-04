/**
 * Friendly, user-facing error strings for patch failures.
 *
 * These map raw decoder/engine exceptions into human-readable messages so the
 * UI never surfaces `Truncated IPS: ...` / `bad magic bytes` verbatim. Work item
 * #4 (base ROM hash/size verification) is not merged yet — this mapper is the
 * current surface for the source-size-mismatch case, so it only names the
 * expected dump via `hack.baseRomName` and does not perform any verification
 * itself.
 *
 * @param {Error} e the original error
 * @param {object} hack the hack object routed to the patcher
 * @returns {string} a friendly, UI-safe error string
 */
export function friendlyPatchError(e, hack) {
  const fmt = ((hack && hack.patchFormat) || 'ips').toUpperCase();
  const baseRomName = (hack && hack.baseRomName) || 'the expected base ROM';
  const msg = (e && e.message) ? e.message : String(e);

  if (/magic/i.test(msg)) {
    return fmt + ' file is not a valid patch. Re-download from project page.';
  }
  if (/truncated/i.test(msg)) {
    return 'Patch file is incomplete/corrupted. Re-download.';
  }
  if (/source size mismatch|Wrong base ROM/i.test(msg)) {
    return 'Base ROM does not match this patch. Expected dump: ' + baseRomName + '.';
  }
  if (/cancelled/i.test(msg)) {
    return 'Patch cancelled — no files changed.';
  }
  return 'Patch failed: ' + msg;
}
