# Google Play publishing readiness

**Checked: 2026-10-13.** Scope: an Android Pokémon ROM-hack discovery app; a narrow review of `app.json`, `package.json`, and `.gitlab-ci.yml`, not a source-code, network, asset-rights, or legal audit. Official public requirements below were checked on this date. Recheck linked policies and the account's Play Console before submission; account-specific deadlines and eligibility can differ.

**Publication is blocked pending legal/IP clearance and technical/privacy evidence.** A working signed APK, patch-only distribution, or a disclaimer does not establish permission or Play eligibility. Obtain qualified counsel's review for intended distribution countries and written permissions covering the content and branding before publication. This document is practical policy research, not legal advice, and guarantees neither legality nor acceptance by Google.

## 1. Developer account and testing

### Google requirements

- The account owner must be at least 18, accept the Developer Distribution Agreement, and pay the **US$25 one-time registration fee**. Google may request government ID and a payment card under the owner's legal name. The fee is not payment for approval. [1]
- Choose **Personal** for personal/hobbyist use or **Organization** for a real organization/business. Both can monetize. Organization onboarding normally requires a **D-U-N-S number** (free to obtain), verified organization information and contact details; do not invent an organization to bypass testing. Follow Google's verification flow and any supported exceptions. [2][3]
- Supply and verify legal identity/address and required email/phone details. Some information is public: for personal accounts Google lists legal name, country and developer email; monetizing exposes the full address, and regional rules can require additional public details. Review the actual profile disclosure before proceeding. [3]
- **Personal accounts created after November 13, 2023:** run a **closed test with at least 12 testers opted in continuously for the preceding 14 days**, including when applying for production access. Internal testing does not satisfy this requirement. Testers opting out and back in restart their consecutive period. After meeting the minimum, apply for production access and explain engagement, feedback, changes and readiness; approval is not automatic and Google can require further testing. Open testing is available after production access is granted. [4]
- New personal accounts must also complete Android-device verification through the Play Console mobile app, signed in as account owner, using a non-rooted physical Android mobile device running Android 10 or later. Follow the Console's eligibility instructions. [1][5]

### Owner manual actions

Create/select the correct account; pay the fee; complete identity, contact and device checks; obtain D-U-N-S/organization evidence if applicable; review public identity disclosure. Recruit real testers, distribute the Play closed-test opt-in link, maintain the continuous cohort and collect meaningful feedback. Keep dated feedback/fix evidence and personally submit the production-access application.

## 2. Android artifact requirements

| Requirement | Verified current rule and release action |
| --- | --- |
| Android App Bundle | Since **August 2021**, new Google Play apps must publish an **AAB**, not just an APK. Build and sign the release bundle and test Play-generated APKs. [6] |
| Play App Signing | Accept its terms and configure it for the new app. Distinguish the developer-held **upload key** from the key(s) Google uses to sign installs. Protect/back up the upload key, limit CI access, and verify certificate fingerprints in Console. Decide signing compatibility with existing sideloaded installs before releasing; an upload-key-signed local APK is not necessarily update-compatible with a Google-signed install. Follow the current signing setup rather than assuming one key serves every channel. [7][8] |
| Target API | For this ordinary mobile app, **new apps and updates must target Android 16 / API 36 or higher from August 31, 2026**. The API 35 rule from August 31, 2025 is no longer sufficient for a new mobile submission. Existing apps' availability rule is separate (API 35 in 2026). Google documents an extension to **November 1, 2026** where available; do not assume this new app qualifies or has approval. Check the Console, and plan to meet API 36 without an extension. Form-factor exceptions are not applicable to this mobile publishing plan. [9] |
| 16 KB memory pages | The live Android guide says apps targeting **API 35+** must support **16 KB pages on 64-bit devices** on Play and currently states **February 1, 2027** as the date incompatible **updates** cannot be released. This is the current wording checked here, not an inferred universal grace period for new submissions. Do not rely on older summaries of the November 1, 2025 deadline or assume exemption; confirm the new-app gate in Console and require compatibility before this project's release. [10] |
| Versioning | Confirm the permanent application/package ID before first upload; increment Android `versionCode` on every update. A display version string alone does not prove a valid incrementing code. [8] |

React Native brings native libraries even if application logic is JavaScript. Inspect the final bundle and generated APKs, including every shipped `.so`; updating `targetSdkVersion` alone does not fix incompatible native libraries. Google's 16 KB guide recommends AGP 8.5.1+ and NDK r28+ with compatible prebuilts, but actual binaries and runtime tests are the evidence. Check bundle alignment (`bundletool dump config --bundle=<file.aab>`), ELF load-segment/RELRO alignment, and APK ZIP alignment (`zipalign -c -P 16 -v 4 <file.apk>`). Test on a 16 KB device/emulator and confirm `adb shell getconf PAGE_SIZE` returns `16384`, without relying on compatibility mode. [10]

Owner manual actions: establish the Play signing configuration and key custody; confirm package ID and certificate strategy for sideload users; upload the signed AAB to an internal track; inspect Console compatibility warnings, delivered APKs and pre-launch results. Do not upload the Metro-dependent debug APK as a store release.

## 3. Privacy policy and Data safety

### Google requirements

- Provide an accurate privacy policy and complete Data safety for closed/open testing and production, **even if claiming no data collection**. Exclusively internal-testing apps are exempt from the Data safety section, not automatically from other policies. [11][12]
- The User Data policy requires a privacy-policy link in Console and a link or policy text within the app. Host it at a public, active, non-geofenced, non-editable URL, not a PDF. Identify the app/developer and privacy contact, explain data access/collection/use/sharing, security, retention and deletion. If account creation is later introduced, review the associated in-app and outside-app account-deletion requirements. [13]
- Include third-party SDK/library behavior in declarations. Data safety's definition of collection includes transmitting user data off-device, even to a third party rather than to the developer. Local-only processing is not collection under this definition. Ephemeral processing has strict memory-only/real-time limits and still needs form responses; server logs are not automatically ephemeral. Sharing exceptions do not necessarily eliminate collection disclosures. [11]

### Required evidence for this app (not a completed declaration)

Do **not** select “no collection” based only on the lack of login, ads or an analytics SDK. Inventory all release-build requests and third-party image hosts/CDNs. Loading an image can expose an IP address, request time, requested image/path, and client headers; the host may retain logs or infer location. Determine what actually happens, what the host is contractually allowed to do, retention, purposes, deletion options and whether it is a service provider or independent third party. Classify data using Google's taxonomy: for example, **location inferred from IP addresses must be disclosed as location** if that inference occurs; do not assert that every bare IP is automatically every listed data type. [11][13]

Separately inventory catalog requests, external-link navigation, browser versus controlled WebView behavior, crash/diagnostic services, user-selected files, file names and sharing/export flows. Google distinguishes open-web navigation from developer-controlled WebViews and permits certain reasonably expected user-initiated sharing exceptions; evaluate the actual implementation rather than applying an exception to all third-party requests. Avoid sending ROMs, patch files, local paths or unnecessary identifiers to remote services. [11]

Owner manual actions: obtain host/SDK privacy information, record the data-flow inventory, publish the policy, ensure accessible in-app policy access, and complete the Data safety form from evidence. Obtain counsel's privacy review, including any consent requirements and child-user implications. Repeat the inventory after changing hosts, SDKs or network features.

## 4. App content, audience and store listing

Complete every applicable declaration shown by Console before release: privacy/Data safety, **contains ads (yes or no)**, target audience and content, IARC content-rating questionnaire, and reviewer/app-access instructions. Supply working credentials if access is restricted. Accurately describe the **discovery** functionality actually shipped; do not promise installation, patching or gameplay that the submitted build does not deliver. Assess linked/catalog content, not merely the interface, when answering rating questions. [12]

Choose the actual audience, not a convenient age threshold. Pokémon-like imagery and terminology can affect Google's assessment of child targeting even if an older audience is declared. If children are included, satisfy Families requirements, appropriate content/data practices and applicable children's privacy law; serving ads to children or unknown-age users requires the applicable Families self-certified SDK and ad restrictions. An “18+” label alone is not a compliance workaround. Counsel must evaluate COPPA/GDPR and relevant local laws. [14]

Required ordinary mobile listing preparation: [8][15]

- App title: maximum **30 characters**; short description **80**; full description **4,000**. Select truthful app category/tags and free/paid status; provide a support email.
- Store icon: **512 × 512**, 32-bit PNG with alpha, maximum **1,024 KB**, following Play icon specifications. Launcher/adaptive icons are separate assets.
- Feature graphic: **1,024 × 500**, JPEG or 24-bit PNG without alpha.
- At least **two screenshots** across supported device types, JPEG or 24-bit PNG without alpha; ordinary screenshot dimensions **320–3,840 px**, with the largest dimension no more than twice the smallest. Capture the actual submitted experience. Special form-factor requirements apply if distribution is enabled for them.
- Promotional video is optional for this mobile listing; follow video requirements if supplied. Google's recommendations for extra screenshots/promotional eligibility are not the same as minimum publishing requirements.
- Use original or licensed artwork throughout the app and screenshots. Do not imply official authorization or use ranking/price/irrelevant-keyword claims contrary to metadata/asset rules. Permissions must cover Google's promotional use of supplied assets, not just display within the app. [8][15][16]

Owner manual actions: approve the actual audience and rating answers, review every linked content destination, supply reviewer instructions and support contacts, commission cleared store artwork, and complete Console declarations. Keep support and privacy URLs operational after launch.

## 5. Copyright, trademark and ROM-hack risk

### Google Play policy (platform requirements)

Google prohibits both infringement and apps that **encourage or induce infringement**. Its IP policy explicitly says modifying copyrighted content can still violate policy and lists game cover art, marketing imagery and indistinguishable fan art as common unauthorized-content problems. Where permission exists, retain written evidence and contact Play with that documentation before submission as instructed. [16]

Not hosting ROMs is not sufficient: buttons, catalog text, search results or external links that direct users to unauthorized copyrighted downloads can create policy risk. Review all destinations, redirects and linked repositories/sites; exclude unauthorized base-ROM or prepatched-ROM downloads and instructions encouraging their acquisition. “Discovery only,” “free,” “fan project,” “educational,” attribution and third-party hosting are not automatic exemptions. A destination claiming to offer patches is not proof its files contain no protected material or that its distribution is authorized. [16]

Google also prohibits misleading affiliation through title, icon, description, developer identity and in-app elements. The name **RGX PokeHack**, Pokémon terminology, character artwork, Poké Ball-like branding and screenshots need an independent clearance assessment. A non-affiliation disclaimer can clarify identity but **cannot grant a license, cure infringement or override a confusing overall presentation**. [16][17]

### Rights-holder position and legal questions (not a ruling)

Nintendo's official IP page identifies protection for names, logos, characters, game graphics/software/music and Pokémon trademarks. It says specific permission is required and **silence is not consent**. Its Australian FAQ explicitly rejects downloading a Nintendo ROM from the Internet even when the downloader owns the authentic game. This is a primary rights-holder position in an Australian context, not a substitute for independent legal advice in every jurisdiction. [18]

**Owning a cartridge does not by itself guarantee that any downloaded, copied, modified or redistributed ROM is lawful.** Counsel must evaluate acquisition method, applicable exceptions, copying, derivative works, circumvention and distribution in intended countries. Do not present “own the game first” as a legal safe harbor. A user confirmation or disclaimer is not evidence of lawful sourcing. [18]

Patch-only and local user-supplied-file designs can avoid distributing a complete base ROM, but do not automatically make a Pokémon hack lawful: a patch can contain protected material or create an unauthorized derivative work, and linked artwork/branding remain separate issues. A hack author's permission only covers rights that author actually controls, not underlying Nintendo/Pokémon/game-publisher rights. Determine the relevant rights holders rather than assuming Nintendo alone can license every asset. Nintendo's page also acknowledges third-party rights. [16][18]

### Required owner legal gate

Before any public distribution, retain qualified IP counsel and obtain the necessary written permissions from the relevant rights holders for the intended branding, images, catalog descriptions, screenshots, linked/distributed patches and promotional use. Maintain a rights ledger (asset/content, owner, permission/license, allowed uses, territory, duration and evidence). Remove or replace material whose rights cannot be established; if the necessary permissions cannot be obtained, do not publish this Pokémon-content offering. Establish a takedown/reporting contact and ongoing destination-review process. Passing Google review is neither an IP license nor a legal opinion.

## 6. Narrow repository audit

These are observations of configuration only; no generated manifest, final AAB/APK, Console account, artwork or runtime traffic was inspected. No code or CI changes were made for this document.

| File | Observation | Evidence needed before publishing |
| --- | --- | --- |
| `app.json` | Name `RGX PokeHack`, Android package `cloud.dicematrix.pokehackinstaller`, Expo display version `1.1.0`; references icon/splash/adaptive-icon files. | Owner approves permanent ID; counsel clears naming and actual artwork. Referenced files are not evidence of license or Play listing specifications. |
| `app.json` | No explicit Android `versionCode` or target-SDK override is present; native project is generated during CI prebuild. Broad `file`/`*/*` intent filter is configured. | Inspect generated manifest for actual versionCode, target API, permissions/exported components and file handling. Establish repeatable incrementing versioning and least-privilege permissions. Absence of an override is not proof of the built target value. |
| `package.json` | Expo `~50.0.0`, React Native `0.73.4`; package version `1.0.0` differs from Expo `1.1.0`. Native-capable document/file/browser/sharing modules are present. | Plan and verify a supported dependency/toolchain upgrade for API 36 and 16 KB binaries; do not claim compliance from these versions. Reconcile release metadata. Modules alone do not prove how data is handled. |
| `package.json` | No obvious dedicated advertising or analytics dependency in the direct list. | Still audit transitive/native dependencies and release traffic before “no ads” or “no collection” declarations. |
| `.gitlab-ci.yml` | Tests and web export exist; debug APK is Metro-dependent with separate application ID. Release job uses protected signing inputs and `assembleRelease`, retaining only `outputs/apk/release/*.apk`. | Existing signing effort is useful, but **no release AAB job/artifact** is defined. Add a separately reviewed signed `bundleRelease` path with the correct upload key and AAB retention. Keep debug artifacts out of store releases. |
| `.gitlab-ci.yml` | Uses `npm install`, a mutable `latest` build image and generated-Gradle text replacements. No visible target-API assertion, versionCode gate, 16 KB checks or Play deployment configuration. | Make build inputs reproducible, verify signing/prebuild compatibility after upgrades, inspect artifact SDK/permissions and native alignment, and test Play-delivered APKs. Automated deployment is optional; manual Console upload is valid. |

Privacy policy, store listing, account verification and rights clearance are **not established by these three files**. They may exist elsewhere or outside Git; the owner must provide evidence. This audit does not assert their global absence.

## 7. Concrete release checklist

### Owner-only decisions and manual actions

- [ ] Counsel reviews ROM/patch/link distribution and trademark/artwork use in each launch country; obtain required permissions and complete the rights ledger **before publication**.
- [ ] Remove uncleared assets/destinations; approve truthful independent branding and support/takedown process.
- [ ] Choose actual developer-account type; pay $25 and finish all identity/contact/device verification and any organization evidence.
- [ ] Approve permanent package ID, signing-key strategy and supported distribution channels; configure Play App Signing and protected upload-key custody.
- [ ] Approve audience, rating questionnaire, ads status, reviewer instructions, launch countries and free/paid status.
- [ ] Publish and approve a privacy policy; provide host/SDK processing/retention evidence and accurate Data safety answers.
- [ ] Upload cleared title/descriptions/icon/feature graphic/real screenshots and required declarations to Console.
- [ ] If subject to the new-personal-account rule, retain at least 12 continuously opted-in closed testers for 14 consecutive days, document meaningful engagement and fixes, then apply for production access.
- [ ] Review policy/compatibility warnings, approval and release status in Console; authorize production submission only after every gate below passes.

### Engineering evidence to prepare (follow-up implementation, not performed here)

- [ ] Produce a reproducible, signed **release AAB** with the approved ID, incremented versionCode, embedded production JS/resources and upload certificate.
- [ ] Verify **targetSdkVersion >= 36** in the final artifact; recheck current policy rather than inferring from Expo settings.
- [ ] Verify all native libraries and delivered APKs support **16 KB** pages; save alignment and actual 16 KB runtime results.
- [ ] Inspect generated permissions/exported components and file flows; remove unnecessary access and complete any applicable sensitive-permission declarations.
- [ ] Inventory release-build network requests, image/CDN hosts, SDKs, diagnostics, browser/file/sharing flows; reconcile behavior with privacy/Data safety and ads answers.
- [ ] Test install/update, launch without Metro, navigation/search, external links, offline/failing hosts, accessibility, and behavior on relevant Android versions and device sizes.
- [ ] Upload internal test AAB, review pre-launch reports and Console warnings, then perform closed testing as required.
- [ ] Recheck all linked official sources and account-specific deadlines at submission; record artifact hash, versionCode, certificate, test evidence and permissions for the release.

**Go/no-go:** unresolved IP permission, misleading branding, unauthorized download destinations, unverified privacy disclosures, incompatible binaries or unmet Console requirements mean **no publication**. Even a completed checklist cannot guarantee Google approval or immunity from rights-holder action.

## Official sources

All sources below are official Google/Android or Nintendo pages checked **2026-10-13**. Policy requirements are distinct from this document's project release recommendations.

1. Google Play, [Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435).
2. Google Play, [Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885).
3. Google Play, [Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312).
4. Google Play, [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465).
5. Google Play, [Device verification requirements for new developer accounts](https://support.google.com/googleplay/android-developer/answer/14316361).
6. Android Developers, [About Android App Bundles](https://developer.android.com/guide/app-bundle).
7. Google Play, [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756).
8. Google Play, [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152).
9. Google Play, [Target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878).
10. Android Developers, [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes) (page states last updated 2026-09-16 UTC).
11. Google Play, [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469).
12. Google Play, [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455).
13. Google Play, [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).
14. Google Play, [Families policies](https://support.google.com/googleplay/android-developer/answer/9893335).
15. Google Play, [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/1078870).
16. Google Play, [Intellectual Property policy](https://support.google.com/googleplay/android-developer/answer/9888072).
17. Google Play, [Impersonation policy](https://support.google.com/googleplay/android-developer/answer/9888374).
18. Nintendo Australia, [Nintendo Intellectual Property and ROM FAQs](https://www.nintendo.com/au/legal/nintendo-intellectual-property/) (rights-holder guidance, including Australian-law context; not independent legal counsel).
