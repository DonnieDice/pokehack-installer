# Additional ROM-hack catalog research

Verified on **2026-10-13**. Deliverable: [`src/data/catalog-candidates.json`](../src/data/catalog-candidates.json), a research-only list of **76 additional candidate records**. No existing catalog entries were changed. No commit, push, task creation, ROM download, artwork download, or emulator testing was performed.

## Evidence standard and limits

- Every JSON record has a `sourceUrl` whose actual content was fetched successfully (HTTP 200), not merely found in a search snippet. GitHub README content, creator-posted PokéCommunity threads, Drayano's Project Pokémon thread, and RainbowDevs project pages establish the project identity and its base engine/platform.
- Each record's `sourceUrl` is its individual citation for the title, engine and restrained description. `projectUrl` points to the source project or creator thread, **never a prepatched-ROM aggregator**. Numeric PokéCommunity thread URLs redirect to the corresponding named thread.
- Verification means **source-backed identity**, not a claim that the game is finished, safe, supported, downloadable as a patch, playable, or compatible with this installer. Several entries are source-only projects or incomplete work. Integration must check patch availability, exact base revision/checksum, format and emulator support independently.
- `baseGame` denotes the verified original engine/base game, not a promise that a patch accepts every regional ROM of that game. A derivative may require its upstream hack rather than a clean original ROM. Region/revision is included only where explicitly supported by the source. Do not generate `baseRomName` or patch instructions from these labels alone.
- `status: unknown` is deliberate where the consulted source does not explicitly establish completion/development state. A release number alone does not establish completion. Status wording can be normalized by the integrating application; do not map unknown to completed.
- No ratings, playtime, difficulty labels, unsupported completion flags, popularity superlatives or artwork permission claims were added. Descriptions are original, short summaries of the consulted sources. Source descriptions are author claims, not independently tested features.
- Paired versions are normally kept as a family record. Blaze Black and Volt White are separate because they use different original ROMs, following the existing catalog's version-specific pattern. The three Ruby Destiny games are separate original projects; the canceled Reign of Legends remake is not confused with the completed original.

### Platform convention

`GB` is used for original Game Boy/Generation I projects retaining DMG/SGB-compatible gameplay. Yellow-derived projects can have a `.gbc` filename and CGB-enhanced color support without becoming GBC-only games. `GBC` is used for Crystal-derived games, explicitly identified GBC games, or GBC-only conversions. `GBA` and `NDS` denote the original executable platform, **not every device capable of running an emulator**. RainbowDevs lists backward-compatible devices broadly; that does not make a FireRed hack an NDS ROM.

Useful source-code cross-checks fetched during this pass:

- [Historical Red++ Makefile](https://raw.githubusercontent.com/jayceekaycee/RedPlusPlus/master/Makefile): Red/Blue use `dmg_opt`; filenames end in `.gbc`. The candidate describes **this historical GB-compatible source**, not the later v3/v4 project. A modern Red++ entry needs a fresh version-specific source review.
- [Red★/Blue★ Makefile](https://raw.githubusercontent.com/Rangi42/redstarbluestar/master/Makefile): `rgbfix` options do not mark the ROM GBC-only despite the `.gbc` output names.
- [Kanto Expansion Pak Makefile](https://raw.githubusercontent.com/PlagueManRodi/kep-hack/master/Makefile): the ROM header options likewise do not mark a GBC-only ROM.
- [Pink Makefile](https://raw.githubusercontent.com/TotalTS/pokepink/main/Makefile) and [Cramorant Edition Makefile](https://raw.githubusercontent.com/Cram-o-dev/cramorantedition/main/Makefile): use lowercase `-c`, the dual-mode CGB flag, rather than uppercase `-C` for GBC-only.
- [Red++ Kaizo Makefile](https://raw.githubusercontent.com/CreamElDudJafar/RedplusplusKaizo/main/Makefile): uses uppercase `-C`; this is a **different GBC-only derivative**. Do not substitute the historical Red++ candidate for this existing catalog entry.

## Integration verification audit (2026-10-13)

- All 76 `sourceUrl`s were re-checked from the integration side. Raw scripted
  HTTP fetches to `pokecommunity.com` return **HTTP 403 (bot filtering)**; the
  pages themselves serve normal readers and fetch tools normally. That 403 is a
  fetch-environment artifact, **not** a dead or unverifiable source.
- Representative PokéCommunity records (`ultra-violet`, `sors`) were re-verified
  by reading the actual thread bodies: Ultra Violet's author confirms the
  FireRed base, single-save full-catch design and the 4-Points Isle addition;
  Sors' author confirms the VytroVerse Part 2 identity, FireRed (U)(Squirrels)
  base and the completed v1.3 (2025) release. Records match the sources.
- The RainbowDevs and GitHub README sources all returned live content in the
  same sweep.
- Verification remains source-backed identity only; none of it is rights
  clearance or a playability guarantee.

## Verified candidate index

The precise source URLs and verification dates are stored alongside every entry in the JSON. These groups are an index, not additional unsupported metadata.

### Game Boy and Generation I-derived projects

| Candidate ID | Source-backed identity / scope |
| --- | --- |
| `pink-special-clefairy` | TotalTS's Pink: Special Clefairy Edition; continued version of a Yellow modification |
| `yellow-cramorant-edition` | Cram-o-dev's Yellow companion replacement |
| `red-speedchoice` | Dabomstew's randomizer-speedrun Red modification |
| `star-beasts-comet` | Star Beasts: Comet; source expressly says patch **Blue, not Red** |
| `carmine-red` | wrulfy's Generation I rebalance and map overhaul |
| `red-blue-96` | TotalTS's early-English-translation reconstruction |
| `kanto-expansion-pak` | PlagueManRodi's Kanto-related Pokémon expansion |
| `red-plus-plus` | Historical jayceekaycee Red++ source; not Red++ Kaizo |
| `hattrem-version` | KingMayro's Yellow-based demo |
| `shin-pokemon` | jojobear13's Shin enhancement family |
| `red-star-blue-star` | Rangi42's prototype-graphics enhancement pair |
| `pure-rgb` | Vortyne's PureRed/PureGreen/PureBlue family |
| `anniversary-red` | RainbowDevs' Anniversary Red |

### Game Boy Color projects

| Candidate ID | Source-backed identity / scope |
| --- | --- |
| `crystal-legacy` | TheSmithPlays team's Crystal refinement |
| `peridot` | TheSeaTree source explicitly builds Peridot Version `.gbc` |
| `salt-crystal` | oatspear/crystal50's real title is **Salt Crystal**, not Crystal 50 |
| `safari-gauntlet` | gillkyle's challenge game derived from Polished Crystal |
| `crystal-not-for-resale` | TotalTS's alternate Crystal demo concept |
| `crystal-red` | Sotomura's Red remake uses **Crystal**, not Red, as its engine |
| `sour-crystal` | SoupPotato's enhancement, not an unrelated fork |
| `anniversary-crystal` | RainbowDevs' Crystal retelling; external AI is optional and needs special setup |
| `pinball-generations` | RainbowDevs' Pinball expansion; a spin-off ROM hack, not a mainline RPG |

### Game Boy Advance projects

| Candidate ID | Source-backed identity / scope |
| --- | --- |
| `emerald-legacy` | TheSmithPlays team's Emerald refinement |
| `crystaldust` | Crystal recreation on **Emerald/GBA** |
| `crossroads` | eonlynx team's Hoenn/Kanto beta; Johto remains a development goal |
| `darkfire` | meta-boy's redevelopment; README says no stable build of the new source |
| `tumbledemerald` | Historical repository; future development moved to `https://gitlab.com/tbld/game` |
| `citrite` | nicholatian's unmaintained Emerald project |
| `modern-emerald` | resetes12's configurable Emerald refinement |
| `heart-and-soul-gba` | PokémonHnS team's completed Johto/Kanto recreation |
| `yaeeh` | PCG06's Yet Another Emerald Enhancement Hack; early development |
| `revelation` | PCG06's competitive battle project; WIP features must not be promoted as tested |
| `emerald-legacy-enhanced` | Exclsior's independent fork; **not affiliated** with TheSmithPlays team |
| `emerald-20xx` | froggestspirit's optional Nuzlocke modification |
| `emerald-plus-plus` | AbsolianSW/ReEmerald README calls the project **Emerald++** |
| `neo-emerald` | digita-LUNA's graphical and balance modification |
| `doomred` | bacowan's Twitch-integrated FireRed hack; needs external software |
| `azoth-english` | RiFa-Innovation translation of Azoth/Mercury, not the original Chinese project's repository |
| `modern-heart-and-soul` | Unofficial modification of HnS 1.2.1; creator recommends official HnS 2.0 for new players |
| `modern-emerald-worped` | worpbane's personal Modern Emerald fork |
| `modern-emerald-oras-tileset` | lbsbezerra graphics variant, linked by Modern Emerald's creator |
| `emerald-battle-revolution` | damon-murdoch's historical sandbox repository; README links a successor repository |
| `emerald-revisited` | ATClemente's source establishes title and Emerald identity; no speculative feature list |
| `emerald-explorer` | Aujacob's solo-Pokédex/ecosystem project |
| `trinity` | jps7878's source-only multi-region project; no binary or playability audit |
| `emerald-gengar-edition` | apeabody007's Gastly-starter modification |
| `elite-redux` | Elite-Redux team's published Emerald source |
| `inclement-emerald` | **BuffelSaft's** repository, not another user's implementation fork |
| `firered-evolved` | NiceLikeTryce's beta with separate FireRed revision patches |
| `pokemon-quests` | shacharCaduri's FireRed source project |
| `pokemon-peru` | Uhemaat's FireRed new-region project |
| `wishes-of-tomorrow` | jmaloney95's original-region source project; README labels its upstream gameplay GIFs as placeholders |
| `dreams` | Creator thread specifies Solda, original creatures and FireRed 1.0 patching |
| `saffron` | mattymannnn's current creator post says **in development / no releases available**; do not infer release status from old aggregator downloads |
| `sors` | Vytron's second VytroVerse project; complete game and FireRed patch requirement confirmed |
| `sors-2` | Vytron's fourth VytroVerse project; story demo, not completed |
| `saiph-2` | Vytron's third VytroVerse project; full-game release explicitly described |
| `odyssey` | PacoScarso's completed FireRed/Etrian Odyssey crossover, distinct from existing Odyssey II |
| `ultra-violet` | LocksmithArmy creator thread describes the final update |
| `exceeded` | Creator thread documents the Innate mechanic and alternate Hoenn plot |
| `emerald-crest` | Aaghat creator thread; title/version/engine stated in Game Info |
| `emerald-horizons` | Creator thread identifies completed Emerald challenge project |
| `chaos-emerald` | Creator thread identifies completed unconventional Emerald modification |
| `emerald-final` | Creator thread documents clean-Emerald patching and optional patches |
| `nameless-version` | 1158's Chronya adventure; not the several unrelated projects called Nameless |
| `darkviolet` | Chaos Rush's completed hack, with hacksrepairman's continuation explicitly credited |
| `liquid-crystal` | linkandzelda's live-beta Crystal remake on FireRed 1.0 |
| `ruby-destiny-reign-of-legends` | **Original** Reign of Legends, not its canceled remake |
| `ruby-destiny-rescue-rangers` | Separate Ruby Destiny game, documented in creator thread post 2 |
| `ruby-destiny-life-of-guardians` | Separate Ruby Destiny game, documented in creator thread post 3 |
| `blazed-glazed` | Creator-posted Glazed derivative, not original Glazed |
| `rijon-adventures` | RainbowDevs' FireRed Rijon adventure, explicitly Beta 2 |

### Nintendo DS projects

| Candidate ID | Source-backed identity / scope |
| --- | --- |
| `blaze-black` | Drayano's original Black enhancement, not Black 2 or Redux |
| `volt-white` | Drayano's original White enhancement, not existing Volt White 2 Redux |
| `platinum-individual-colors` | TheGag96's standalone Platinum palette modification |

## Audit of the existing 24 added entries

This audit covers `brown` through `volt-white-2-redux` in the supplied `hacks.js`, not the preceding 21 entries. All 24 currently use a prepatched-ROM aggregator as `projectUrl`; none should be treated as creator provenance. The findings below are recommendations only. **No production fields were edited.**

The ratings, playtime and difficulty values in these 24 records have no identified measurement/source basis in this research. Likewise, `patchFormat: 'patch'` is not a verified format. Do not carry these values into a purportedly verified catalog. Artwork availability is not permission to reuse it.

| Existing ID | Finding / recommendation |
| --- | --- |
| `brown` | **Wrong platform: GB, not GBC.** [RainbowDevs](https://rainbowdevs.com/title/brown/) explicitly gives Red as base and Game Boy/Pocket support. Replace aggregator with this creator page. |
| `creepy-black` | **Internal contradiction:** declared GBC, but base name/file and description say FireRed/GBA. Quarantine identity rather than switching engines blindly: different creepypasta implementations exist. The [PokéCommunity discussion fetched](https://www.pokecommunity.com/threads/306910/) is a discussion of the story, **not a creator release**. No definitive creator source for this precise entry was located. |
| `red-kaizo` | **Identity mismatch:** the supplied [aggregator URL](https://www.pokeharbor.com/2024/09/pokemon-red-kaizo/) was opened and actually titles the project **Red++ Kaizo**, naming DarthBR and CreamElDudJafar. This is provenance inspection, not accepting the aggregator as authority. [Creator repository](https://github.com/CreamElDudJafar/RedplusplusKaizo), [README](https://raw.githubusercontent.com/CreamElDudJafar/RedplusplusKaizo/main/README.md), and [GBC-only Makefile](https://raw.githubusercontent.com/CreamElDudJafar/RedplusplusKaizo/main/Makefile) identify the derivative. Rename/re-key after version review; do not label it original Red Kaizo or use historical Red++'s GB platform. The derivative README still inherits Red++ v3 wording, so exact Kaizo release notes need further checking. |
| `yellow-legacy` | Generation I Yellow project: use **GB**, with optional CGB-enhanced compatibility, rather than conflating it with Crystal. [Creator README](https://raw.githubusercontent.com/cRz-Shadows/Pokemon_Yellow_Legacy/main/README.md) establishes identity and original generation. This pass does not verify current completion status or every existing feature claim. |
| `crystal-awakening` | Unverified creator provenance. GitHub discovery found [FrenchOrange/pokezelda](https://github.com/FrenchOrange/pokezelda), a Crystal Zelda-themed project, but that similarity alone does **not** establish an alias. Keep in audit backlog until exact creator thread/title is matched. |
| `core-crystal` | Empty description and aggregator-only provenance. Base/platform and completion need creator verification. |
| `crooked-crystal` | Story text is clipped and source is aggregator-only. Find a creator release before accepting story/completion. |
| `crystal-inheritance` | Aggregator-only provenance; time-travel premise and completion remain unverified. |
| `theta-emerald-ex` | Do not equate EX with Renev or another Theta release. Existing claims including DexNav and endless postgame need exact-version creator evidence. |
| `soulgold-gba` | Do not conflate the title with Heart & Soul or SoulSilver. Exact creator source and FireRed-base assertion remain unverified. |
| `resolute` | **Wrong base: Emerald, not FireRed.** [1158 creator thread](https://www.pokecommunity.com/threads/pokemon-resolute-version-version-2-97-released.294565/) is explicitly labeled Emerald hack and describes Logan/Alma and Sylon. Existing `.gba` platform is correct; base ROM and project URL must change together. |
| `moemon-quetzal` | Verify the specific Moemon derivative, not Quetzal's original documentation. Co-op/player-count/completion claims remain unverified. |
| `meta-firered-x-y` | Exact creator/version source needed. Do not infer generations or mechanics from the X/Y label. |
| `metal-red` | Exact creator source needed; Gigantamax and roster/mechanic claims remain unverified. |
| `mega-delta` | **Internal platform/base contradiction:** existing description says NDS/Black 2, but fields say GBA/Emerald. Search discovery points to Sir Rualy, but no authoritative creator release was successfully established. Quarantine pending primary evidence; do not merely rewrite from aggregator text. |
| `kanlara-adventures` | Creator provenance not verified in this pass. Do not silently substitute a Kanlara Ultimate or other derivative release. |
| `nova-silver` | Existing text describes a **FireRed stat rebalance**, while subtitle/tags imply a new story. That implication is unsupported. Exact creator source and completion remain unverified. |
| `dark-rising-1-kaizo` | Verify the Kaizo edition separately from original Dark Rising. Original-game story text does not establish derivative features/completion. |
| `too-many-types-2` | Hoenn references conflict with a presumed FireRed base but are not sufficient by themselves to prove Emerald. Discovery found creator release discussion on Reddit/Hackdex, but a creator-owned release page with verified patch requirements was not opened in this pass. Base mapping remains **unverified**, not an automatic fix. |
| `odyssey-ii` | [PacoScarso creator thread](https://www.pokecommunity.com/threads/pok%C3%A9mon-odyssey-ii-heroes-of-lemuria-demo.539664/) explicitly confirms **FireRed (U) 1.0**, sequel identity, Etrian Odyssey connection and **DEMO 0.1.3**. The crossover claim is genuinely source-backed; `completed: true` / Completed tag are wrong. Do not confuse the first game's completed status with the sequel. |
| `synthesis-version` | Veldan/open-world and Emerald-base claims remain aggregator-only; creator verification required. |
| `unnamed-open-world` | McPaul attribution and scaling/completion claims remain unverified. The ambiguous working title needs a stable creator-thread match. |
| `sonicmon-fire-red` | Description is copied download-site text, not original catalog prose. Exact creator source and completion needed; no artwork-use permission established. |
| `volt-white-2-redux` | Plausible identity but current `projectUrl` is not creator provenance. Keep separate from original Volt White and non-Redux White 2. This research did not verify all existing Redux feature or completion assertions. |

## Backlog: not included in verified JSON

These are discovery leads or projects whose consulted material was insufficient. They are **not verified entries**, even where a repository exists. No rating, platform, completion or patch compatibility is asserted here. The breadth is retained for follow-up instead of padding the verified list.

### Consulted repositories with insufficient project-specific evidence

Several have an inherited vanilla/engine README that does not document the named hack. An unchanged upstream README is not enough to promote a project:

| Lead | Consulted source / blocking issue |
| --- | --- |
| Pokémon Prototype | [dannye/pokered-prototype](https://github.com/dannye/pokered-prototype): fetched README is vanilla Red/Blue documentation |
| Original Star Beasts | [StarBeasts/Star-Beasts](https://github.com/StarBeasts/Star-Beasts): inherited README; Comet has genuine project-specific documentation and is verified separately |
| Crystal Plus | [Monkiikong/Pokemon-Crystal-Plus](https://github.com/Monkiikong/Pokemon-Crystal-Plus): vanilla Crystal README with a title suffix |
| Pokémon Dark Void | [TrainerTaiga/PokemonDarkVoid](https://github.com/TrainerTaiga/PokemonDarkVoid): inherited Crystal README |
| Crystal Post-Game Expansion | [carameix/crystalPGE](https://github.com/carameix/crystalPGE): inherited Crystal README |
| Enigma Crystal | [x1kurosu/enigmacrystal](https://github.com/x1kurosu/enigmacrystal): inherited Crystal README |
| Withering Leaf | [Gemini04126/withering-leaf](https://github.com/Gemini04126/withering-leaf): inherited hack-base README says it is not a standalone game |
| Eccentric Emerald | [metang17/pokeemerald-eccentricemerald](https://github.com/metang17/pokeemerald-eccentricemerald): inherited engine README |
| Island Adventure | [PCG06/pokeislandadventure](https://github.com/PCG06/pokeislandadventure): inherited engine README; repository description suggests canceled work |
| Battle & Bounty | [PCG06/pokebattlebounty](https://github.com/PCG06/pokebattlebounty): inherited engine README |
| Cursed Yellow | [cRz-Shadows/Pokemon_Cursed_Yellow](https://github.com/cRz-Shadows/Pokemon_Cursed_Yellow): official Crystal Legacy README links it, but its own README lacks hack details |
| Crystal NEO | [digita-LUNA/neocrystal](https://github.com/digita-LUNA/neocrystal): title-only README; need gameplay/base documentation |
| Another PKMN Crystal Remaster | [Idain/Another-PKMN-Crystal-Remaster](https://github.com/Idain/Another-PKMN-Crystal-Remaster): largely inherited README, insufficient distinguishing features |
| Emerald Vault | [CaptainNorty/emerald-vault](https://github.com/CaptainNorty/emerald-vault): README expressly says economy gameplay changes are **not implemented**, unchanged baseline only |
| Paradoxia | [Zelda-Junkie/pokemon-paradoxia](https://github.com/Zelda-Junkie/pokemon-paradoxia): inherited engine README |
| Pokémon Nightmare | [tonyb12/Pokemon_Nightmare](https://github.com/tonyb12/Pokemon_Nightmare): title-only README |
| FireRed Legacy | [jsunaldo/Pokemon-Fire-Red-Legacy](https://github.com/jsunaldo/Pokemon-Fire-Red-Legacy): inherited vanilla README; not the SmithPlays Legacy team's project |
| FireRed Hinglish | [aman179102/pokefirered-hinglish](https://github.com/aman179102/pokefirered-hinglish): inherited vanilla README |
| Yellow++ | [mirko93s/yellowplusplus](https://github.com/mirko93s/yellowplusplus): project-specific README exists, but links a compiled ROM; native compatibility and clean patch distribution need review |
| Pokémon Tempora | [PlatinumMaster/poketempora](https://github.com/PlatinumMaster/poketempora): short competition-submission README; need explicit game title/build evidence |
| Ironémon Red Kaizo Edition | [U-K-L/Pokemon-Kaizo-IronRed](https://github.com/U-K-L/Pokemon-Kaizo-IronRed): substantial rules documentation, but the consulted excerpt did not establish exact FireRed base revision/platform; not original Red Kaizo |
| Emotemon | [bacowan/Emotemon](https://github.com/bacowan/Emotemon): attempted `README.md` path returned 404; inspect repository files rather than guessing |
| Pokémon Conjure | [Nonibros/Pokemon-Conjure](https://github.com/Nonibros/Pokemon-Conjure): attempted `README.md` returned 404 |
| FireRed Tactics | [mkennedy714/FireRedTactics](https://github.com/mkennedy714/FireRedTactics): attempted `README.md` returned 404 |

### Additional discovery leads requiring an opened creator source

- Emerald Seaglass — discovery identifies Nemo622 and [creator Ko-fi](https://ko-fi.com/nemo622); verify the actual patch/documentation page before promotion.
- Pokémon Lazarus — Nemo622 creator-profile discovery; no release page opened here.
- Pokémon Saffron's old demo — current creator post is verified as in-development, but an older demo is not interchangeable with the current version.
- Pokémon Saiph — [creator thread](https://www.pokecommunity.com/threads/420990/) was opened and identifies the project/story; the excerpt did not establish the exact base ROM. It is intentionally withheld rather than inferring FireRed from a third-party article.
- Fools Gold; Bronze; Bronze 2; Quarantine Crystal; Crystal Ultimate; Crystal Advance; Dark Energy; Coral; Orange Islands variants — exact creator release and native platform needed for each.
- Emerald Enhanced; Emerald Cross; Run & Bun; Emerald Eight; Emerald Double; Emerald Z; Emerald Trashlocke; Emerald Lucent; Emerald Imperium; Emerald Seaglass variants — locate first-party release documentation, avoiding similarly named forks.
- FireRed Omega; FireRed Throwback; Nameless FireRed; FireRed Team Rocket variants; Clover; Clover derivatives; Vega Minus; Altair; Sirius; Deneb; Procyon; Victory Fire; Flora Sky Rebirth — distinguish original projects, translations and derivatives.
- Blue Kaizo; Crystal Kaizo; Emerald Kaizo; Yellow Kaizo; Intense Indigo; Static Yellow; RGB Celebrations — creator repositories were discovered while auditing Red++ Kaizo, but project-specific verification for each is unfinished.
- Blaze Black 2 Redux; Volt White 2 (non-Redux); Vintage White; Garbage Gold; Garbage Green; Garbage Platinum; Platinum Redux; Following Renegade Platinum; Luminescent Platinum — distinguish NDS projects from Switch projects and auxiliary tools before any inclusion.
- Ruby Destiny: Broken Timeline and the Reign of Legends remake — creator series thread explicitly identifies canceled work; omitted from JSON rather than presenting them as the completed originals.
- Azoth/Mercury original Chinese release — translation repo is verified; original release needs its own creator provenance.
- Red++ v3/v4 — historical GB-compatible source is verified here; newer GBC-only versions require separately scoped records or a replacement after release review.

## Integration gate

1. Select a concrete version and establish a creator-provided **patch** or reproducible build route. Source-only candidates should not imply one-click installation.
2. Verify the exact required input ROM/hash and patch format, especially derivatives and paired games. Never infer them from a generic `baseGame` label.
3. Resolve source-only, demo, beta and unmaintained display states without manufacturing completion.
4. Recheck platform against the actual executable/header where the developer's naming is ambiguous. Do not classify by screenshot style or an output extension alone.
5. Use original text and permission-cleared artwork only. This research supplies no artwork license.
6. Keep backlog items out of production until their exact identity, native platform and creator source are verified.
