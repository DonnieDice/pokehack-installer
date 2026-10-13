import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function readPng(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.length < 8 || data.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`${filePath}: not a PNG`);
  }
  const ihdrLen = data.readUInt32BE(8);
  if (ihdrLen !== 13 || data.slice(12, 16).toString() !== 'IHDR') {
    throw new Error(`${filePath}: bad IHDR`);
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];
  return { width, height, bitDepth, colorType, data };
}

describe('assets', () => {
  test('icon.png is 1024x1024 RGBA', () => {
    const p = path.join(__dirname, '..', '..', '..', 'assets', 'icon.png');
    const { width, height, bitDepth, colorType } = readPng(p);
    expect(width).toBe(1024);
    expect(height).toBe(1024);
    expect(bitDepth).toBe(8);
    expect(colorType).toBe(6);
  });

  test('adaptive-icon.png is 1024x1024 RGBA', () => {
    const p = path.join(__dirname, '..', '..', '..', 'assets', 'adaptive-icon.png');
    const { width, height, bitDepth, colorType } = readPng(p);
    expect(width).toBe(1024);
    expect(height).toBe(1024);
    expect(bitDepth).toBe(8);
    expect(colorType).toBe(6);
  });

  test('splash.png is 1284x2778 RGBA', () => {
    const p = path.join(__dirname, '..', '..', '..', 'assets', 'splash.png');
    const { width, height, bitDepth, colorType } = readPng(p);
    expect(width).toBe(1284);
    expect(height).toBe(2778);
    expect(bitDepth).toBe(8);
    expect(colorType).toBe(6);
  });

  test('favicon.png is 64x64 RGBA', () => {
    const p = path.join(__dirname, '..', '..', '..', 'assets', 'favicon.png');
    const { width, height, bitDepth, colorType } = readPng(p);
    expect(width).toBe(64);
    expect(height).toBe(64);
    expect(bitDepth).toBe(8);
    expect(colorType).toBe(6);
  });

  test('icon.png is fully opaque (no transparent pixels)', () => {
    const p = path.join(__dirname, '..', '..', '..', 'assets', 'icon.png');
    const { data } = readPng(p);
    let offset = 8;
    let idat = Buffer.alloc(0);
    while (offset < data.length) {
      const len = data.readUInt32BE(offset);
      const type = data.slice(offset + 4, offset + 8).toString();
      if (type === 'IDAT') {
        idat = Buffer.concat([idat, data.slice(offset + 8, offset + 8 + len)]);
      }
      offset += 12 + len;
    }
    const raw = zlib.inflateSync(idat);
    const stride = 1024 * 4 + 1;
    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        const i = y * stride + x * 4 + 4; // skip filter byte
        if (raw[i] !== 0xff) {
          throw new Error(`icon.png has transparent pixel at ${x},${y}`);
        }
      }
    }
  });

  test('adaptive-icon.png has transparent corners', () => {
    const p = path.join(__dirname, '..', '..', '..', 'assets', 'adaptive-icon.png');
    const { data } = readPng(p);
    let offset = 8;
    let idat = Buffer.alloc(0);
    while (offset < data.length) {
      const len = data.readUInt32BE(offset);
      const type = data.slice(offset + 4, offset + 8).toString();
      if (type === 'IDAT') {
        idat = Buffer.concat([idat, data.slice(offset + 8, offset + 8 + len)]);
      }
      offset += 12 + len;
    }
    const raw = zlib.inflateSync(idat);
    const stride = 1024 * 4 + 1;
    const corners = [
      { x: 0, y: 0 },
      { x: 1023, y: 0 },
      { x: 0, y: 1023 },
      { x: 1023, y: 1023 },
    ];
    for (const { x, y } of corners) {
      const i = y * stride + x * 4 + 4;
      if (raw[i] !== 0x00) {
        throw new Error(`adaptive-icon.png corner ${x},${y} is not transparent`);
      }
    }
  });

  test('every catalog hack has a 480x270 RGBA cover under 100KB', () => {
    const { HACKS } = require('../../data/hacks');
    for (const h of HACKS) {
      const p = path.join(__dirname, '..', '..', '..', 'assets', 'covers', `${h.id}.png`);
      const { width, height, bitDepth, colorType, data } = readPng(p);
      expect(width).toBe(480);
      expect(height).toBe(270);
      expect(bitDepth).toBe(8);
      expect(colorType).toBe(6);
      expect(data.length).toBeLessThan(102400);
    }
  });

  test('covers are fully opaque (no transparent pixels in title-safe zone)', () => {
    const { HACKS } = require('../../data/hacks');
    for (const h of HACKS) {
      const p = path.join(__dirname, '..', '..', '..', 'assets', 'covers', `${h.id}.png`);
      const { data } = readPng(p);
      let offset = 8;
      let idat = Buffer.alloc(0);
      while (offset < data.length) {
        const len = data.readUInt32BE(offset);
        const type = data.slice(offset + 4, offset + 8).toString();
        if (type === 'IDAT') {
          idat = Buffer.concat([idat, data.slice(offset + 8, offset + 8 + len)]);
        }
        offset += 12 + len;
      }
      const raw = zlib.inflateSync(idat);
      const stride = 480 * 4 + 1;
      // Spot-check alpha across the image; every pixel must be opaque.
      for (let y = 0; y < 270; y += 5) {
        for (let x = 0; x < 480; x += 5) {
          const i = y * stride + x * 4 + 4;
          if (raw[i] !== 0xff) {
            throw new Error(`${h.id}.png has transparent pixel at ${x},${y}`);
          }
        }
      }
    }
  });
});
