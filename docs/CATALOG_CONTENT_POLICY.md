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

A public image URL, social card, or creator page is not a reuse license, and a
launch decision needs written permission for the assets actually shipped. The
runtime behavior is display-by-default: `coverUrl` images are shown from their
source pages so the catalog stays useful, and a `coverPermission.status` of
`'revoked'` hides an entry's art immediately in response to a complaint. Before
**production publication** (see the release gate below), record for each image
still in use:

1. The actual rights holder and original source (not merely an image host).
2. Written permission or an applicable license covering this app's intended
   distribution, modification/cropping, commercial use if any, and attribution.
3. Whether underlying characters/logos/assets need additional authorization.
4. Required attribution and any revocation/expiry terms.

Do not treat a ROM-hack author's page as proof they control every underlying
right. Keep permission correspondence outside public Git if it contains
personal data; use a non-sensitive evidence reference in the record.

## Existing catalog

The historical catalog's community details (ratings, playtime, difficulty,
completion) display as community-sourced information pending review, clearly
separated from creator-verified records. Historical descriptions/features still
need factual review; historical cover URLs display from their sources with the
revocation mechanism above available for complaints.

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
