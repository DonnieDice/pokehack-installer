const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64) {
  if (typeof b64 !== 'string') throw new Error('base64ToBytes expects a string');
  const clean = b64.replace(/[\r\n\s=]/g, '');
  const n = clean.length;
  if (n === 0) return new Uint8Array(0);
  if (n % 4 === 1) throw new Error('Invalid base64 length');
  const rem = n % 4;
  const outLen = Math.floor(n / 4) * 3 + (rem === 2 ? 1 : rem === 3 ? 2 : 0);
  const out = new Uint8Array(outLen);
  let o = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < n; i++) {
    const v = CHARS.indexOf(clean[i]);
    if (v === -1) throw new Error('Invalid base64 character');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out;
}

export function bytesToBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error('bytesToBase64 expects a Uint8Array');
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : null;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : null;
    out += CHARS[b0 >> 2];
    out += CHARS[((b0 & 3) << 4) | (b1 === null ? 0 : b1 >> 4)];
    if (b1 === null) break;
    out += CHARS[((b1 & 15) << 2) | (b2 === null ? 0 : b2 >> 6)];
    if (b2 === null) break;
    out += CHARS[b2 & 63];
  }
  while (out.length % 4 !== 0) out += '=';
  return out;
}
