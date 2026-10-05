#!/usr/bin/env python3
"""
Deterministic pure-Python (stdlib only) asset generator for PokeHack Installer.

Produces original pixel-art Pokéball/D-pad hybrid motif assets on the app's
brand colors:

  - background  #0a0a0f  (COLORS.bg)
  - accent      #ff4757  (COLORS.primary)

No copyrighted sprites. Output:
  - assets/icon.png            1024x1024, fully opaque (alpha=FF)
  - assets/adaptive-icon.png   1024x1024, foreground with transparency
  - assets/splash.png          1284x2778 portrait on solid #0a0a0f
  - assets/favicon.png         64x64

Usage:
  python3 scripts/generate_assets.py
"""
import io
import os
import struct
import zlib

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")

# Brand colors (RGB).
BG = (0x0a, 0x0a, 0x0f)      # #0a0a0f  dark background
PRIMARY = (0xff, 0x47, 0x57)  # #ff4757  red accent
WHITE = (0xff, 0xff, 0xff)
RED = PRIMARY


def _chunk(chunk_type: bytes, data: bytes) -> bytes:
    c = chunk_type + data
    return (
        struct.pack(">I", len(data))
        + c
        + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    )


def write_png(path: str, width: int, height: int, rgba: bytearray) -> None:
    """Write a PNG file from an RGBA bytearray (length == width*height*4)."""
    raw = bytearray()
    plte_stride = width * 4
    for y in range(height):
        raw.append(0)  # filter byte: None
        raw.extend(rgba[y * plte_stride : (y + 1) * plte_stride])
    png = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit, color type 6 (RGBA)
    png += _chunk(b"IHDR", ihdr)
    png += _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += _chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


class Canvas:
    """Simple RGBA framebuffer with alpha blending."""

    def __init__(self, width: int, height: int, bg: tuple):
        self.w = width
        self.h = height
        r, g, b = bg
        self.px = bytearray((bytes((r, g, b, 0xFF)) * width) * height)

    def set_pixel(self, x: int, y: int, color: tuple) -> None:
        """color is (r,g,b,a) with alpha 0=transparent,255=opaque."""
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 4
            self.px[i:i + 4] = bytes(color)

    def fill_rect(self, x0: int, y0: int, x1: int, y1: int, color: tuple) -> None:
        for y in range(max(0, y0), min(self.h, y1)):
            for x in range(max(0, x0), min(self.w, x1)):
                self.set_pixel(x, y, color)

    def fill_disk(self, cx: int, cy: int, radius: int, color: tuple) -> None:
        r2 = radius * radius
        for y in range(-radius, radius + 1):
            for x in range(-radius, radius + 1):
                if x * x + y * y <= r2:
                    self.set_pixel(cx + x, cy + y, color)

    def fill_ring(self, cx: int, cy: int, r_outer: int, r_inner: int, color: tuple) -> None:
        for y in range(-r_outer, r_outer + 1):
            for x in range(-r_outer, r_outer + 1):
                d2 = x * x + y * y
                if r_inner * r_inner <= d2 <= r_outer * r_outer:
                    self.set_pixel(cx + x, cy + y, color)

    def hline(self, x0: int, x1: int, y: int, color: tuple) -> None:
        if x0 > x1:
            x0, x1 = x1, x0
        self.fill_rect(x0, y, x1 + 1, y + 1, color)

    def vline(self, x: int, y0: int, y1: int, color: tuple) -> None:
        if y0 > y1:
            y0, y1 = y1, y0
        self.fill_rect(x, y0, x + 1, y1 + 1, color)

    def to_rgba(self) -> bytearray:
        return self.px


def draw_motif(cv: Canvas, cx: int, cy: int, outer: int) -> None:
    """
    Draw an original Pokéball/D-pad hybrid motif centered at (cx,cy).

    Top half of a Pokéball with a red upper cap, white lower cap, a black
    horizontal divide, and a D-pad-style plus in the center. Fully original
    design, no copyrighted sprites.
    """
    # Outer circle (white disk) - the ball body.
    cv.fill_disk(cx, cy, outer, (*WHITE, 255))
    # Red upper cap: top semicircle.
    r2 = outer * outer
    for y in range(-outer, 0):  # top half only
        for x in range(-outer, outer + 1):
            if x * x + y * y <= r2:
                cv.set_pixel(cx + x, cy + y, (*RED, 255))
    # Black divider band across the middle.
    band = max(1, outer // 24)
    cv.hline(cx - outer, cx + outer, cy, (*PRIMARY, 255))
    for dy in range(-band, band + 1):
        cv.hline(cx - outer, cx + outer, cy + dy, (0x11, 0x11, 0x11, 255))
    # Central button: dark circle.
    btn_r = max(3, outer // 11)
    cv.fill_disk(cx, cy, btn_r, (0x11, 0x11, 0x11, 255))
    # D-pad arms: thin rectangles pointing up/down/left/right.
    arm_w = max(1, outer // 16)
    arm_len = max(2, outer // 6)
    cv.fill_rect(cx - arm_w, cy - outer + 3 + btn_r, cx + arm_w + 1, cy - arm_w + 1, (*PRIMARY, 255))  # up
    cv.fill_rect(cx - arm_w, cy + arm_w, cx + arm_w + 1, cy + outer - 3 - btn_r + 1, (*PRIMARY, 255))   # down
    cv.fill_rect(cx - outer + 3 + btn_r, cy - arm_w, cx - arm_w + 1, cy + arm_w + 1, (*PRIMARY, 255))   # left
    cv.fill_rect(cx + arm_w, cy - arm_w, cx + outer - 3 - btn_r + 1, cy + arm_w + 1, (*PRIMARY, 255))  # right


def make_icon(size: int, opaque: bool) -> bytearray:
    """size x size icon: motif centered.

    opaque=True  -> solid #0a0a0f background with opaque motif (launcher icon).
    opaque=False -> transparent background with opaque motif only inside a
                    safe zone (adaptive-icon foreground). Corners stay alpha=0.
    """
    cv = Canvas(size, size, BG)
    if opaque:
        # Fill entire canvas solid background (Canvas already did this).
        pass
    else:
        # Transparent background: clear every pixel's alpha to 0.
        for i in range(size * size):
            cv.px[i * 4 + 3] = 0x00
    # Motif scale: for opaque icons a large inner circle (72%) is fine since
    # the solid background fills corners. For the transparent adaptive-icon we
    # keep the motif inside a smaller circle so all four corners stay alpha=0.
    outer = int(size * (0.72 if opaque else 0.46))
    cx, cy = size // 2, size // 2
    draw_motif(cv, cx, cy, outer)
    return cv.to_rgba()


def make_splash(width: int, height: int) -> bytearray:
    """Splash: solid #0a0a0f with a large centered motif scaled up."""
    cv = Canvas(width, height, BG)
    # Fill fully opaque background.
    for i in range(width * height):
        cv.px[i * 4 + 3] = 0xFF
    outer = min(width, height) // 2
    cx, cy = width // 2, height - int(height * 0.22)
    draw_motif(cv, cx, cy, outer)
    return cv.to_rgba()


def make_favicon(size: int) -> bytearray:
    """64x64 favicon: motif centered, fully opaque."""
    cv = Canvas(size, size, BG)
    outer = int(size * 0.74)
    cx, cy = size // 2, size // 2
    draw_motif(cv, cx, cy, outer)
    return cv.to_rgba()


def main() -> None:
    os.makedirs(ASSETS_DIR, exist_ok=True)

    assets = [
        ("icon.png", make_icon(1024, opaque=True)),          # 1024x1024 opaque
        ("adaptive-icon.png", make_icon(1024, opaque=False)), # 1024x1024 foreground w/ transparency
        ("favicon.png", make_favicon(64)),                    # 64x64
    ]
    # Splash: 1284x2778 portrait.
    assets.append(("splash.png", make_splash(1284, 2778)))

    sizes = {
        "icon.png": (1024, 1024),
        "adaptive-icon.png": (1024, 1024),
        "splash.png": (1284, 2778),
        "favicon.png": (64, 64),
    }

    total = 0
    for name, rgba in assets:
        path = os.path.join(ASSETS_DIR, name)
        w, h = sizes[name]
        assert len(rgba) == w * h * 4, f"{name}: pixel buffer size mismatch"
        write_png(path, w, h, rgba)
        sz = os.path.getsize(path)
        total += sz
        print(f"wrote {path}: {w}x{h}, {sz} bytes")

    print(f"total assets/ size: {total} bytes")
    # Sanity: total must be < 1 MB (1048576).
    if total >= 1048576:
        raise SystemExit(f"FAIL: total assets size {total} exceeds 1MB")
    print("OK: total assets < 1MB")


if __name__ == "__main__":
    main()
