# TODO — PokeHack Installer

## M1 — Catalog app
- [x] Project bootstrapped on GitLab with CI (web bundle + debug/release APK artifacts)
- [x] Catalog browse + hack detail screens
- [x] Cover art on cards and detail pages (original generated pixel art)
- [x] Safe-area handling so content clears the status bar
- [x] Sort options (rating / A-Z / difficulty / platform) + platform filters
- [x] Emulators page with Play Store links per platform
- [x] "Find download" opens a web search instead of in-app patching
- [x] Debug APKs embed the JS bundle + use a `.debug` package suffix (no more
      standalone-launch traps or signature conflicts with release installs)
- [x] Release APK cold-launches standalone (verified on-device: Pixel 6 / Android 17)

## M2 — Catalog polish
- [ ] More hacks: keep researching verified pages (NDS and GBC catalogs are thin)
- [ ] Per-hack screenshots gallery
- [ ] Emulator handoff: open a downloaded ROM in the installed emulator
- [ ] Catalog expansion beyond Pokémon (Mario, Zelda, Metroid hacks?)
- [ ] iOS port (separate repo)

## Parked
- On-device patch engines (IPS/UPS/BPS/xdelta) live in src/utils with passing
  tests but no longer wired to any UI. Re-enable if patching ever returns.
