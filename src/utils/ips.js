const MAGIC = [0x50, 0x41, 0x54, 0x43, 0x48];

function grow(src, needed) {
  const next = new Uint8Array(needed);
  next.set(src);
  return next;
}

export function applyIps(rom, patch) {
  if (!(rom instanceof Uint8Array) || !(patch instanceof Uint8Array)) {
    throw new Error('applyIps expects Uint8Array inputs');
  }
  if (patch.length < 8) throw new Error('Patch file too small to be IPS');
  for (let i = 0; i < 5; i++) {
    if (patch[i] !== MAGIC[i]) throw new Error('Not an IPS patch (bad magic bytes)');
  }
  let out = new Uint8Array(rom);
  let pos = 5;
  let records = 0;
  while (pos + 5 <= patch.length) {
    if (patch[pos] === 0x45 && patch[pos + 1] === 0x4f && patch[pos + 2] === 0x46) break;
    const offset = (patch[pos] << 16) | (patch[pos + 1] << 8) | patch[pos + 2];
    pos += 3;
    const length = (patch[pos] << 8) | patch[pos + 1];
    pos += 2;
    if (length === 0) {
      const count = (patch[pos] << 8) | patch[pos + 1];
      pos += 2;
      if (pos >= patch.length) throw new Error('Truncated IPS: RLE record missing value byte');
      const value = patch[pos];
      pos += 1;
      const end = offset + count;
      if (end > out.length) out = grow(out, end);
      for (let k = 0; k < count; k++) out[offset + k] = value;
    } else {
      if (pos + length > patch.length) {
        throw new Error('Truncated IPS: data record overruns patch file');
      }
      const end = offset + length;
      if (end > out.length) out = grow(out, end);
      for (let k = 0; k < length; k++) out[offset + k] = patch[pos + k];
      pos += length;
    }
    records++;
  }
  if (records === 0) throw new Error('No IPS records found before EOF marker');
  return { rom: out, records };
}
