# Catalog sourcing and publication gate

This is an editorial risk-reduction policy, not legal advice or a guarantee of
Google Play acceptance. A creator submission or patch-only distribution does
not prove that the creator has all underlying intellectual-property rights.

## What the app should do

- Discover projects and link to reviewed creator-maintained project pages.
- Never bundle, host, cache, or directly link base ROMs or pre-patched games.
- Prefer patches distributed by their creators, without promising those patches
  are lawful in every jurisdiction. Obtain legal review before publication.
- Do not treat buying a cartridge as blanket permission to download a ROM.
- Do not advertise the app as official, affiliated, endorsed, or an installer
  if it only provides a catalog. Review its name and store copy before launch.
- Avoid Nintendo/Pokémon logos, characters, or recognizable trade dress in app
  branding. Generated artwork is not automatically free of trademark concerns.

## Evidence required for catalog additions

Research records live in `src/data/catalog-candidates.json` and are normalized
into the app catalog by `buildCatalog`. After editing them, run
`npm run catalog:assets` followed by `npm test -- --ci --runInBand` and a release
export/build. Source records are not guaranteed to have a playable binary;
source-only and experimental projects can be listed honestly as discovery.

Each reviewed record needs `sourceType: 'creator'`, a creator/project URL,
`sourceUrl`, and `verifiedAt` (ISO date). The source must support the title,
platform, and short factual description. Verification describes sourcing, not
legal approval. If a destination later changes to distributing base/pre-patched
ROMs, quarantine it and re-review before restoring its link.

Keep release status, base game, difficulty, playtime, and features unknown when
not supported by a source. Do not invent numerical ratings. Record variants as
distinct projects only when the source supports that distinction.

Search results are uncontrolled third-party content. The app's creator/patch
searches reduce deliberate routing to ROM download aggregators but cannot
guarantee lawful results. Counsel and Play policy review may still require
removing search links entirely.

## Cover art

A public image URL, social card, or creator page is not a reuse license.
Remote covers are hidden unless `coverPermission` includes both
`status: 'approved'` and an `evidenceUrl`. Before setting that flag, record:

1. The actual rights holder and original source (not merely an image host).
2. Written permission or an applicable license allowing this app's intended
   distribution, modification/cropping, commercial use if any, and attribution.
3. Whether underlying characters/logos/assets need additional authorization.
4. Required attribution and any revocation/expiry terms.

Do not approve art solely because the ROM-hack author supplied it. Keep
permission correspondence outside public Git if it contains personal data;
use a non-sensitive evidence reference in the record. Local neutral placeholders
remain until the publication rights review is complete.

## Existing catalog

The historical catalog is retained for discovery, not vouched for. Its
unsourced ratings, length, difficulty, and completion estimates are excluded
from exported app data. Existing outbound URLs are not opened directly until
creator-source evidence is attached. Historical descriptions/features still
need factual review; historical cover URLs are retained for provenance research
but are not fetched without permission evidence.

## Reporting and takedowns — launch blockers

Before publication, implement an accessible in-app reporting/contact route,
publish a rights-holder reporting policy, designate an operator, record and
resolve complaints, and establish an update/removal turnaround. Do not invent
a contact address or claim this workflow exists before it is operational.

The app currently has a static bundled catalog: urgent removals require an app
update. Decide whether that response is sufficient before launch; a remote
catalog must also have validation, availability, privacy, and abuse controls.

## Release gate

Do not publish to production until creator destinations and image permissions,
branding, embedded assets/fonts, emulator icons, privacy disclosures, report
handling, and the complete store listing have been reviewed. See
`PLAY_STORE_PUBLISHING.md` for the platform-specific checklist. These technical
controls are necessary safeguards, not a legal determination.
