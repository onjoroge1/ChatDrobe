# Living Worlds experience player

## What changed

The homepage, /living-worlds/ and /premium/ now offer an explicit **Watch a 30-second journey** action, chapter scrubbing, supported weather and lighting, Portal/full composition, and simulated session moments. A cat rests/wakes, the lamp responds, the spacecraft lights signal and Quiet Focus pauses motion. The timeline runs once, can pause/resume/reset, and does not advance while the preview is offscreen or the document is hidden/unfocused. Reduced motion disables playback while preserving manual chapter/atmosphere controls.

These are not new paid extension features. The player exposes functionality already present in the supplied v0.5.1 package. The website reuses its actual scene and model modules; it does not load the extension's page adapter, background worker, account/access code, browser APIs, or conversation observers.

## Fidelity and provenance

Source snapshot: chatdrobe-v0.5.1-load-unpacked.zip supplied in this conversation.
Archive SHA-256: cd9424d7157c12b1e09dbdaca44f8394b9f680385328edd91b35e7269e9b0450.

The two original files under src/living-runtime/ are byte-for-byte copies; tests pin their SHA-256 values. scripts/living-assets.mjs separates the existing scene CSS into a first-party external stylesheet and adjusts the model import path. No new world events, layers, paid access grants or remote executable rules are introduced.

Initial static illustrations remain available without JavaScript. The actual scene renderer, model and its stylesheet are loaded only after preview interaction. A 30-second tour compresses journey chapters from a longer focus session; it is not a focus timer and awards no saved minutes or progress. Session events are explicit website simulations, not real ChatGPT event detection. Portal placement is illustrative, not a certification of live ChatGPT geometry.

## Budgets and privacy

The common website script remains capped at 5 KB and non-Living scripts at 15 KB. Preview controls plus transport have an 11 KB budget on their three routes; the deferred renderer/model have an 18 KB budget, plus 7 KB deferred scene CSS. No per-frame JavaScript or interval. The tour has at most one boundary timer. Only first-party static assets are requested. No cookies, localStorage, analytics, transcript reads, credentials, sound or location requests are added. A failed asset load keeps the static illustration and presents an error.

The existing Content-Security-Policy remains unchanged; Shadow DOM styling uses a same-origin stylesheet, not a weakened inline-style policy. Billing API code, Stripe configuration, the $29/year display, deployment routing, server packages and the v0.5.1 extension ZIP are unchanged.

## Evidence

Nine targeted Node tests were run locally for transport behavior, exact source hashes, world capabilities and disclosures. Local Chromium rendered offline embedded-source fixtures and checked playback, actual chapter changes, weather, event responses, Portal separation, reduced motion and four viewport widths. Local HTTP browser navigation was blocked by the environment, so those local fixtures do not certify CSP or network loading.

The repository's real HTTP browser suite now additionally checks lazy loads, CSP violations, scene state, offscreen pause, renderer failure, layouts, keyboard use, price wording and no-JavaScript fallback. Read the PR's current CI result for that evidence. Existing billing/PostgreSQL/deployment tests remain independent. No installation or signed-in ChatGPT test is implied by website tests.

## More value after payment and launch hardening

Recommended next product tests—not currently included or sold: (1) saved workspace profiles combining scene, reading layout and focus duration; (2) art-directed route/atmosphere collections with several distinct destinations; (3) optional quiet discoveries, such as new window scenes or companion behavior, without punitive streaks or distraction rewards. Preserve the agreed release priority: payment integration, extension cleanup, launch; then new platform support.
