// Curated Android emulators for the platforms this catalog covers.
// Links use Play Store SEARCH urls (never a hard-coded package id) so they
// cannot break when a listing moves; official sites are linked only where
// the domain is stable and well-known.
export const EMULATORS = [
  {
    id: 'pizza-boy-gba',
    name: 'Pizza Boy GBA',
    platforms: ['GBA'],
    price: 'Free + Pro',
    note: 'Fast, accurate, and constantly updated. The community default for GBA hacks.',
    playQuery: 'Pizza Boy GBA emulator',
  },
  {
    id: 'my-boy',
    name: 'My Boy!',
    platforms: ['GBA'],
    price: 'Free Lite + Paid',
    note: 'The long-time standard. The free version covers casual play; paid adds cheats and fast-forward.',
    playQuery: 'My Boy GBA emulator',
  },
  {
    id: 'john-gba',
    name: 'John GBA',
    platforms: ['GBA'],
    price: 'Free + Paid',
    note: 'Lightweight classic with a simple interface. Good on older phones.',
    playQuery: 'John GBA emulator',
  },
  {
    id: 'my-oldboy',
    name: 'My OldBoy!',
    platforms: ['GBC', 'GB'],
    price: 'Free Lite + Paid',
    note: 'From the My Boy team, for Game Boy and Game Boy Color hacks like Prism and Polished Crystal.',
    playQuery: 'My OldBoy GBC emulator',
  },
  {
    id: 'gbc-emu',
    name: 'GBC.emu',
    platforms: ['GBC', 'GB'],
    price: 'Paid',
    note: 'High-accuracy option from the emu family by Robert Broglia.',
    playQuery: 'GBC.emu emulator',
  },
  {
    id: 'drastic',
    name: 'DraStic DS',
    platforms: ['NDS'],
    price: 'Paid',
    note: 'The fastest NDS emulator on Android. The go-to for Blaze Black 2 and Renegade Platinum.',
    playQuery: 'DraStic DS emulator',
  },
  {
    id: 'melonds',
    name: 'melonDS',
    platforms: ['NDS'],
    price: 'Free',
    note: 'Accuracy-focused NDS emulator, now on Android. Great when compatibility matters.',
    playQuery: 'melonDS android emulator',
  },
  {
    id: 'lemuroid',
    name: 'Lemuroid',
    platforms: ['GBA', 'GBC', 'GB', 'NDS', 'SNES'],
    price: 'Free',
    note: 'One clean app for everything, built on libretro cores. Zero ads.',
    playQuery: 'Lemuroid emulator',
  },
  {
    id: 'retroarch',
    name: 'RetroArch',
    platforms: ['GBA', 'GBC', 'GB', 'NDS', 'SNES'],
    price: 'Free',
    note: 'The power-user option: every core, shaders, and save states everywhere.',
    playQuery: 'RetroArch',
    siteUrl: 'https://www.retroarch.com',
  },
  {
    id: 'snes9x',
    name: 'Snes9x EX+',
    platforms: ['SNES'],
    price: 'Free',
    note: 'Free, open-source, and reliable SNES emulation for future SNES additions.',
    playQuery: 'Snes9x EX+',
  },
];

export function playStoreSearchUrl(query) {
  return 'https://play.google.com/store/search?q=' + encodeURIComponent(query) + '&c=apps';
}
