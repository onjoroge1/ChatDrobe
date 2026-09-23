# Creative implementation and remaining work

Status checked 2026-09-22. PR26 is merged into main. Version 0.9.1 is the cat-art review build; it is not a public launch certification. This inventory distinguishes delivered code, experiments and proposals so a library installation is not mistaken for finished product artwork.

## What the integrations actually supply

| Component | Implemented scope | Still needed |
| --- | --- | --- |
| DiceBear Sprouts, `@dicebear/styles@10.6.0` | Authoring-only dependency in `tools/artwork/`; two selected CC0 Tokyo plant/pot compositions become local SVG geometry. Source/output hashes and notices ship. No production avatar API. | Curated compositions for other worlds, consistent palettes and visual review at compact size. It supplies neither the cat nor whole environments. |
| `lottie-web@5.13.0` | Locally vendored MIT SVG-light player; one original two-path Tokyo tea-steam animation. Lazy load, activity/reduced-motion pause, teardown and CSS fallback. | An actual exported-animation production workflow and evidence that it saves enough art-production work to justify the cost. Do not expand to more worlds by default. |
| Cat companion | Original SVG rig and finite Web Animations routines shared by Tokyo, Train and Natural Cat. Version 0.9.1 refines its illustration while retaining its articulated bones. | Human art approval in context and native extension review at small sizes; consistent future character art. |
| Companion Studio | Developer-only environment/pose inspector with the canonical scene modules, deterministic scrubbing and explicit playback. | Use it for every new character/pose review. It is not a customer World Studio or uploaded-asset editor. |

No implementation or dependency evidence was found for Rive, PixiJS, GSAP, Lucide, Iconify, OpenPeeps or OpenDoodles. They must not be listed as installed or as agreed delivery obligations merely because a repository was discussed.

The Lottie pilot's passing PR26 CI recorded 387,358 bytes raw / 72,092 gzip, 11 animation DOM nodes, and one 1.2-second sample of 27.323 ms active task time versus 2.239 ms for the CSS baseline. Paused playback scheduled zero RAF callbacks. These are synthetic Chromium observations, not native CPU/battery guarantees. The sample does not justify a performance claim; retain or remove the pilot based on measured authoring benefit and real-device cost.

## Older PRs

| PR | Status at review | Action |
| --- | --- | --- |
| [26 — immediate controls, Tokyo art and Lottie pilot](https://github.com/onjoroge1/ChatDrobe/pull/26) | Merged | Verify the actual installed package; merging does not refresh an unpacked extension. |
| [25 — premium repair](https://github.com/onjoroge1/ChatDrobe/pull/25) | Merged | Close the remaining acceptance gaps in `PREMIUM-REPAIR-ACCEPTANCE.md`. |
| [18 — quiet companions](https://github.com/onjoroge1/ChatDrobe/pull/18) | Open; renderer work largely incorporated by later changes | Check for unique test/documentation value, then reconcile or close as superseded. Do not restore old renderer copies. |
| [12 — Living engine roadmap](https://github.com/onjoroge1/ChatDrobe/pull/12) | Open; docs-only proposal with old package/account assumptions | Extract the still-useful roadmap into current documentation; no hidden runtime implementation waits in this PR. |

This change records their status; it does not close or merge those PRs.

## Priority order

1. **Prove the complete installed experience.** Exact-package Chrome tests on signed-in ChatGPT: Free/Plus, sidebars, short/long threads, zoom, typing/streaming, reduced motion, service-worker/browser restart and upgrade with existing local data. Fixtures establish their own scenarios, not current live-page compatibility.
2. **Complete public onboarding and payment delivery.** Production `GET /api/account?action=status` returned `signInAvailable:false`, `ownerLoginAvailable:true`, `livePayments:false` on 2026-09-22. Public email delivery/onboarding is unavailable. Test purchase, webhook replay/delay, cancellation, renewal, expiry and recovery with real Stripe sandbox objects. Current code deliberately rejects live billing; live launch requires reviewed implementation as well as configuration.
3. **Publish an approved install path.** Packaging and CI review ZIPs exist; `site.config.json` still has empty download/store URL and download checksum fields. Complete release asset verification, supported-browser policy, store/privacy review and the Store listing. See issues [5](https://github.com/onjoroge1/ChatDrobe/issues/5) and [6](https://github.com/onjoroge1/ChatDrobe/issues/6).
4. **Finish one visual standard.** Review the refined cat in Tokyo, Train and Natural Cat; use the same silhouette, palette and motion-quality bar for future props and companions. Then curate Train/Starship art. More rendering libraries alone do not produce a cohesive collection.
5. **Resolve continuity and documentation debt.** Signed proofs last ten minutes and device links thirty days; real expiry/reconnection behavior needs acceptance. An offline grace or different renewal policy is a product change, not an implemented guarantee. Older subscriber/owner milestone docs describe prior states; use current code and live health checks to avoid repeating resolved blockers.

Production extension-signing health returned `ready:true` and `matchesExtension:true` on 2026-09-22. The old malformed-signing-key blocker is resolved at configuration level. This does not prove an installed account-link flow.

## Ideas awaiting a product decision

Underwater Research Station, Wizard's Study, Robot Colony/progression, soundscapes, seasonal packs, real weather, customer World Studio/uploaded assets, creator marketplace and Gemini support remain concepts or deferred work. Saved workspace profiles combining a scene/layout/focus duration, curated route collections and quiet discoveries are documented product tests, not completed premium features or delivery promises.

Existing local notes and settings are not cloud-synced. Account sign-in restores access, not a backup of local workspace data.

## Review the cat without changing a customer account

Build the local Companion Studio with `python3 browser-extension/scripts/build-motion-preview.py`. Its output remains under ignored `browser-extension/preview/`; the builder prints its HTTP serving instructions. The review uses copied canonical ES modules rather than rewriting imports into a synthetic bundle.

`browser-extension/tests/motion-studio-browser.py` verifies actual browser animation, stopping, reduced motion and deterministic pose bounds, and produces review screenshots in CI. The normal extension geometry suite also retains the 320-node scene limit. Use the studio and current website preview for art approval, then perform the native acceptance matrix above.
