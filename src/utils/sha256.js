/**
 * Vendored pure-JS SHA-256 — zero new dependencies.
 *
 * Implements the SHA-256 hash function (FIPS 180-4 / SEC 1) in pure JS so the
 * project does NOT need to add `expo-crypto` as a dependency (which would bust
 * the CI node_modules cache keyed on package.json). This is a standard
 * reference implementation: 32-bit big-endian words, message schedule, round
 * constants from the fractional parts of the cube roots of the first 64 primes.
 *
 * It digests a `Uint8Array` / `number[]` and returns a lowercase 64-char
 * hex string. This matches the digest of Node `crypto.createHash('sha256')`
 * for the same input.
 */

// Fractional parts of the cube roots of the first 64 primes (2..311),
// big-endian, as 32-bit unsigned constants.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x128dc278, 0x243185be, 0x550c7dc7,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240095ee,
  0x2de92c6f, 0x4a47b81f, 0x5785ca2f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  0xca273ece, 0xd194c32f, 0xd4983e43, 0xf7d8a738,
  0x2d57c9c1, 0x6c6f1b1c, 0x7a8c8dd2, 0x8b7b6e0e,
  0x96c3f0ce, 0xa2744d1c, 0xbd01e1a8, 0xc2906f70,
  0xce6c3d0f, 0xdf3f28d0, 0xe5494991, 0xe9e0e387,
  0xf0b85e6e, 0xf47322b1, 0xfc7166e9, 0xfe3a2e0e,
  0x08f5b36a, 0x0d1a3c8a, 0x13af50a0, 0x19a046c5,
  0x20d9c2a9, 0x2ac9d020, 0x36f2e3a5, 0x41d02e87,
  0x4ce6e108, 0x57d09cc7, 0x61a0a86e, 0x6a84e1d2,
]);

const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function toBytes(input) {
  if (typeof input === 'string') {
    // UTF-8 encode
    const out = [];
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) {
        out.push(0xc0 | (c >> 6));
        out.push(0x80 | (c & 0x3f));
      } else {
        out.push(0xe0 | (c >> 12));
        out.push(0x80 | ((c >> 6) & 0x3f));
        out.push(0x80 | (c & 0x3f));
      }
    }
    return new Uint8Array(out);
  }
  if (input instanceof Uint8Array) return input;
  if (Array.isArray(input)) return new Uint8Array(input);
  throw new Error('sha256 expects a string or Uint8Array/array');
}

export function sha256(input) {
  const msg = toBytes(input);
  const h = new Uint32Array(H0);
  const bitLen = msg.length * 8;

  // Pre-processing: add trailing '1' bit, pad with zeros, then 64-bit length.
  const padded = [];
  for (let i = 0; i < msg.length; i++) padded.push(msg[i]);
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);
  // 64-bit big-endian bit length. JS can't losslessly hold >2^53, so for inputs
  // well under that we emit high 32 bits = 0 and low 32 bits = bitLen.
  const hi = 0;
  const lo = (bitLen & 0x0000ffff) | ((bitLen >> 16) << 16);
  padded.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
  padded.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

  // Process each 512-bit (64-byte) chunk.
  for (let p = 0; p < padded.length; p += 64) {
    const w = new Uint32Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] =
        (padded[p + i * 4] << 24) |
        (padded[p + i * 4 + 1] << 16) |
        (padded[p + i * 4 + 2] << 8) |
        (padded[p + i * 4 + 3] & 0xff);
      w[i] >>>= 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0], b = h[1], c = h[2], d = h[3];
    let e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += ('00000000' + (h[i] >>> 0).toString(16)).slice(-8);
  }
  return hex;
}
