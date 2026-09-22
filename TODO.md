# TODO — PokeHack Installer

## M1 — On-device patching alpha
- [x] Project bootstrapped on GitLab with CI (web bundle + debug APK artifacts)
- [x] IPS patch engine (unit tested)
- [ ] BPS patch support (Emerald Rogue, Crystal Clear use BPS)
- [ ] UPS patch support (Unbound, Gaia use UPS)
- [ ] xdelta support for NDS hacks (Blaze Black 2)
- [ ] Base ROM verification (file size + SHA-256 against baseRomName)
- [ ] In-app patch downloads (verified URLs per hack; catalog currently has projectUrl only)
- [ ] Patcher UX: progress percent, cancel, friendlier error mapping
- [ ] Share/open patched ROM from the app (expo-sharing)
- [ ] Real app icons + splash (1x1 placeholders currently shipped)

## M2 — Installer polish
- [ ] Patched-ROM library with rename/share/export
- [ ] Updates feed for actively-developed hacks (Emerald Rogue, Adventure Red)
- [ ] Emulator handoff (open patched ROM in the user's emulator)
- [ ] Signed release APK in CI (debug-only today)
- [ ] Catalog expansion beyond the current 10 hacks
