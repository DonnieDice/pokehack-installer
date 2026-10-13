// Curated Android emulators for the platforms this catalog covers.
// Links use Play Store SEARCH urls (never a hard-coded package id) so they
// cannot break when a listing moves; optional stable website links must be
// https. Icons are hotlinked from the Play Store CDN (play-lh.googleusercontent)
// — same "link, don't redistribute" policy as the catalog cover art.
export const EMULATORS = [
  {
    id: 'pizza-boy-gba',
    name: 'Pizza Boy GBA',
    platforms: ['GBA'],
    price: 'Free + Pro',
    note: 'Fast, accurate, and constantly updated. The community default for GBA hacks.',
    playQuery: 'Pizza Boy GBA emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/2i_qnb_wA_hrqbSCoViUQdbICPxaa_Vvas7jDd8bS_oxcK8BqQt9_KC3t_9qI7J28PgyK4J8-qEQRpo5W8HXoA',
  },
  {
    id: 'my-boy',
    name: 'My Boy!',
    platforms: ['GBA'],
    price: 'Free Lite + Paid',
    note: 'The long-time standard. The free version covers casual play; paid adds cheats and fast-forward.',
    playQuery: 'My Boy GBA emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/GmMy8HhuZPLeCep5Op5SOo7hn2S_n9520IZU0G6YStm4qIzzn7AlX1BD9S2jyQ8AOlOWX5hEuHHAM-VGaa8CrTo',
  },
  {
    id: 'john-gba',
    name: 'John GBA',
    platforms: ['GBA'],
    price: 'Free + Paid',
    note: 'Lightweight classic with a simple interface. Good on older phones.',
    playQuery: 'John GBA emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/_RdnLWig8CCr2HQUnM7mfHEUlqMbYepKrSUfAdD4vsrhTosWvtlUr4S1We3BNeCpmDiVRjyk752ZMhv-q3rAVQ',
  },
  {
    id: 'my-oldboy',
    name: 'My OldBoy!',
    platforms: ['GBC', 'GB'],
    price: 'Free Lite + Paid',
    note: 'From the My Boy team, for Game Boy and Game Boy Color hacks like Prism and Polished Crystal.',
    playQuery: 'My OldBoy GBC emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/8MXDIivg1geazXua1Mds-9KxWv-LgVdYa5AChZpkr7MFMCZ9cOXm8Vopirmc_IXoXZI6UNBZj1cT9sXv5IlCi_k',
  },
  {
    id: 'gbc-emu',
    name: 'GBC.emu',
    platforms: ['GBC', 'GB'],
    price: 'Paid',
    note: 'High-accuracy option from the .emu family by Robert Broglia.',
    playQuery: 'GBC.emu emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/vv1vJ9VLUoYZn2y4Cjwoik50sBWxw87d0ziGVVqqdr_XUDc2rsbfFLMX3bf9Fjv8WQ0_Oj2-yzynjiEJFDFfuA',
  },
  {
    id: 'drastic',
    name: 'DraStic DS',
    platforms: ['NDS'],
    price: 'Paid',
    note: 'The fastest NDS emulator on Android. The go-to for Blaze Black 2 and Renegade Platinum.',
    playQuery: 'DraStic DS emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/1ebQX4kclIAodgeR27yy6ELQraO9Tc9us7Xq2adT3k_jotYm2sQ9IG_edpmQmIvXnhbtSssUpq7DEJDBx5BDmQ',
  },
  {
    id: 'melonds',
    name: 'melonDS',
    platforms: ['NDS'],
    price: 'Free',
    note: 'Accuracy-focused NDS emulator, now on Android. Great when compatibility matters.',
    playQuery: 'melonDS android emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/J-fwkKNmnDtjjXL2HdYzZzJKvtmheQyds0FSFf59wcT6xBqA_jaq47k5yXaH3dDjR2NL-OLQ5NRiQBUe5kaq9A',
  },
  {
    id: 'lemuroid',
    name: 'Lemuroid',
    platforms: ['GBA', 'GBC', 'GB', 'NDS', 'SNES'],
    price: 'Free',
    note: 'One clean app for everything, built on libretro cores. Zero ads.',
    playQuery: 'Lemuroid emulator',
    iconUrl: 'https://play-lh.googleusercontent.com/hWs9NKnx1bqRK3x8l-e2KlvBbgOBWikkdYsIvSVtkOHNNwLxpxv6OI6V2v2IaDpEantdC97JnEQdIYAEhA4fRw',
  },
  {
    id: 'retroarch',
    name: 'RetroArch',
    platforms: ['GBA', 'GBC', 'GB', 'NDS', 'SNES'],
    price: 'Free',
    note: 'The power-user option: every core, shaders, and save states everywhere.',
    playQuery: 'RetroArch',
    siteUrl: 'https://www.retroarch.com',
    iconUrl: 'https://play-lh.googleusercontent.com/7LwjMAul9vqH8urHnAnJs7svOT0pKOtugzIIX0D6aI1eyAcXxawqVMy71mixyGZpvJJvZ58DU2-2lK0yOZrU',
  },
  {
    id: 'snes9x',
    name: 'Snes9x EX+',
    platforms: ['SNES'],
    price: 'Free',
    note: 'Free, open-source, and reliable SNES emulation for future SNES additions.',
    playQuery: 'Snes9x EX+',
    iconUrl: 'https://play-lh.googleusercontent.com/p9iRgQZHMBYFw8o0ic71K0jmPImpyLK2jatm4YV6ZMAhsch7oUxlRTHbXXcMd_aVV5uchHGj5LogpINIgKovkg',
  },
];

export function playStoreSearchUrl(query) {
  return 'https://play.google.com/store/search?q=' + encodeURIComponent(query) + '&c=apps';
}
