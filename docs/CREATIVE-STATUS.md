# Creative implementation and remaining work

Status checked 2026-09-27. PR26 and PR27 are merged into main. Version 0.9.1 contains the cat and world-art review changes; it is not a public launch certification. This inventory distinguishes delivered code, experiments and proposals so a library installation is not mistaken for finished product artwork. See [ACTIVATION-READINESS.md](ACTIVATION-READINESS.md) for the current sign-in and installation blockers.

## What the integrations actually supply

| Component | Implemented scope | Still needed |
| --- | --- | --- |
| DiceBear, `@dicebear/styles@10.6.0` | Authoring-only dependency in `tools/artwork/`. Sprouts supplies two Tokyo plants. PR27 also curates Landscape layers for Train and Planets surfaces/shading for Starship into local SVG geometry. Source/output hashes and notices ship. No production avatar API. | Human visual approval at compact size, cohesive prop/character art and a repeatable export/review process. It supplies neither the cat nor whole environments. |
| `lottie-web@5.13.0` | Locally vendored MIT SVG-light player; one original two-path Tokyo tea-steam animation. Lazy load, activity/reduced-motion pause, teardown and CSS fallback. | An actual exported-animation production workflow and evidence that it saves enough art-production work to justify the cost. Do not expand to more worlds by default. |
| Cat companion | Original SVG rig and finite Web Animations routines shared by Tokyo, Train and Natural Cat. Version 0.9.1 refines its illustration while retaining its articulated bones. Pose review exposed an existing intermediate curl-tail clipping bug; the review build corrects that trajectory. | Human art approval in context and native extension review at small sizes; consistent future character art. |
| Companion Studio | Developer-only environment/pose inspector with the canonical scene modules, deterministic scrubbing and explicit playback. | Use it for every new character/pose review. It is not a customer World Studio or uploaded-asset editor. |
| Website cards and no-JavaScript previews | Build-time serialization reuses the canonical resting cat and selected DiceBear geometry, with instance-scoped SVG references. | Static compositions still summarize a world; journey playback and extension placement are demonstrated by the interactive renderer and native acceptance. |

No runtime integration was found for Rive, PixiJS, GSAP, Lucide, Iconify, Open Peeps or Open Doodles. The installed DiceBear authoring package does contain additional definitions, including Open Peeps, Critters and Constellation; their presence does not mean the app uses them. MoneyPrinterTurbo, Motion Canvas and OpenShorts are not installed in this repository. Do not confuse the separate video project's integrations with ChatDrobe.

The Lottie pilot's passing PR26 CI recorded 387,358 bytes raw / 72,092 gzip, 11 animation DOM nodes, and one 1.2-second sample of 27.323 ms active task time versus 2.239 ms for the CSS baseline. Paused playback scheduled zero RAF callbacks. These are synthetic Chromium observations, not native CPU/battery guarantees. The sample does not justify a performance claim; retain or remove the pilot based on measured authoring benefit and real-device cost.

## Older PRs

| PR | Status at review | Action |
| --- | --- | --- |
| [26 — immediate controls, Tokyo art and Lottie pilot](https://github.com/onjoroge1/ChatDrobe/pull/26) | Merged | Verify the actual installed package; merging does not refresh an unpacked extension. |
| [27 — cat and curated world artwork](https://github.com/onjoroge1/ChatDrobe/pull/27) | Merged | Review the new cat, corrected curl trajectory and Train/Starship artwork; complete native acceptance before release. |
| [25 — premium repair](https://github.com/onjoroge1/ChatDrobe/pull/25) | Merged | Close the remaining acceptance gaps in `PREMIUM-REPAIR-ACCEPTANCE.md`. |
| [18 — quiet companions](https://github.com/onjoroge1/ChatDrobe/pull/18) | Open; renderer work largely incorporated by later changes | Check for unique test/documentation value, then reconcile or close as superseded. Do not restore old renderer copies. |
| [12 — Living engine roadmap](https://github.com/onjoroge1/ChatDrobe/pull/12) | Open; docs-only proposal with old package/account assumptions | Extract the still-useful roadmap into current documentation; no hidden runtime implementation waits in this PR. |

This change records their status; it does not close or merge those PRs.

## Priority order

1. **Prove the complete installed experience.** Exact-package Chrome tests on signed-in ChatGPT: Free/Plus, sidebars, short/long threads, zoom, typing/streaming, reduced motion, service-worker/browser restart and upgrade with existing local data. Fixtures establish their own scenarios, not current live-page compatibility.
2. **Complete public onboarding and payment delivery.** Production `GET /api/account?action=status` returned `signInAvailable:false`, `ownerLoginAvailable:true`, `livePayments:false` on 2026-09-27. Public email delivery/onboarding is unavailable. Test purchase, webhook replay/delay, cancellation, renewal, expiry and recovery with real Stripe sandbox objects. Current code deliberately rejects live billing; live launch requires reviewed implementation as well as configuration.
3. **Publish an approved install path.** Packaging and CI review ZIPs exist; `site.config.json` still has empty download/store URL and download checksum fields. Complete release asset verification, supported-browser policy, store/privacy review and the Store listing. See issues [5](https://github.com/onjoroge1/ChatDrobe/issues/5) and [6](https://github.com/onjoroge1/ChatDrobe/issues/6).
4. **Finish one visual standard.** Review the refined cat in Tokyo, Train and Natural Cat alongside the new Train/Starship art. Next refine original interior props and the drone to the same silhouette, palette and motion-quality bar, and review each journey chapter at day/dusk/night. More rendering libraries alone do not produce a cohesive collection.
5. **Resolve continuity and documentation debt.** Signed proofs last ten minutes and device links thirty days; real expiry/reconnection behavior needs acceptance. An offline grace or different renewal policy is a product change, not an implemented guarantee. Older subscriber/owner milestone docs describe prior states; use current code and live health checks to avoid repeating resolved blockers.

Production extension-signing health returned `ready:true` and `matchesExtension:true` on 2026-09-27. The old malformed-signing-key blocker is resolved at configuration level. This does not prove an installed account-link flow.

## How to use the installed creative tools next

| World / opportunity | Tool and next useful work | Boundary |
| --- | --- | --- |
| Tokyo | Expand the curated Sprouts prop palette only where it improves the composition; refine original lamp, mug and desk details. | Preserve the safe cat habitat and calm reading margins; do not add randomized clutter. |
| Train | Reuse the Landscape pipeline for deliberately authored route variations and seasonal palettes after the current five chapters pass native review. | A collection of routes needs product design; the installed shapes are not a route generator or weather service. |
| Starship | Use Planets for authored destination surfaces; Constellation could supply a few distant, low-contrast patterns. | Rings belong only to an explicitly designed destination; not every planet gets Saturn's silhouette. Constellation is not yet integrated. |
| Companions | Keep the original articulated cat/drone and improve their illustration and finite performances in Companion Studio. | Critters/Open Peeps are possible style references or separate static characters, not drop-in replacements for our 28-bone cat. |
| Exported motion | Evaluate one actual designer-exported Lottie asset against the small existing SVG/CSS implementation. | Keep the single pilot until an export workflow demonstrates value. Installing the player does not create animation artwork. |

## Ideas awaiting a product decision

Underwater Research Station, Wizard's Study, Robot Colony/progression, soundscapes, seasonal packs, real weather, customer World Studio/uploaded assets, creator marketplace and Gemini support remain concepts or deferred work. Saved workspace profiles combining a scene/layout/focus duration, curated route collections and quiet discoveries are documented product tests, not completed premium features or delivery promises.

Existing local notes and settings are not cloud-synced. Account sign-in restores access, not a backup of local workspace data.

## Review the cat without changing a customer account

Build the local Companion Studio with `python3 browser-extension/scripts/build-motion-preview.py`. Its output remains under ignored `browser-extension/preview/`; the builder prints its HTTP serving instructions. The review uses copied canonical ES modules rather than rewriting imports into a synthetic bundle.

`browser-extension/tests/motion-studio-browser.py` verifies actual browser animation, stopping, reduced motion and deterministic pose bounds, and produces review screenshots in CI. The normal extension geometry suite also retains the 320-node scene limit. Use the studio and current website preview for art approval, then perform the native acceptance matrix above.
