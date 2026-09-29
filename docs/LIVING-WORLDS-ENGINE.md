# Living Worlds engine — v0.5.0 private extension build

Recorded September 14, 2026. The engine is a first working slice of the environment-platform proposal, not the completed platform. **This repository change is documentation only.** It does not add the engine runtime or lab to the deployed website, modify the existing product-marketing pages, publish an extension, or enable checkout. The runtime, source/tests and self-contained interactive lab are supplied separately in the conversation, preserving the website-only repository boundary.

## Delivered in the separate extension package

The existing 15 themes remain; these are **three additional Living environments**, not a relabeling of the theme count:

| Environment | Layers and behavior | Journey chapters |
| --- | --- | --- |
| Rainy Tokyo Loft | Illustrated city, windows, passing car, desk, lamp and cat; supported rain/snow/fog or clear weather | Morning coffee, afternoon, golden hour, windows after dark |
| Starship Journey | Viewport, stars, original planet shapes, craft, console and drone; clear or aurora | Earth orbit, Moon, asteroids, Jupiter, deep space |
| Cozy Train Journey | Carriage, window, landscape, city/mountains, lamp and cat; clear/rain/snow/fog | City, farmland, mountains, snow, sunset |

A shared vector scene renderer builds the layers from versioned content definitions. The schema limits layer names, events, actions and stage counts. Rules are allowlisted configuration; there is no remote executable rule, arbitrary CSS injection, uploaded SVG or creator publishing system.

Full World renders a panorama around the reading column with the central band masked out. Portal renders a smaller window in a clear side margin. Both remain above the native composer, have no pointer interaction, and suppress rendering when the known layout lacks safe space. They do not rewrite messages, drafts, attachments or the ChatGPT disclaimer. Actual ChatGPT layouts still require installed testing.

Day, golden hour, night, local-clock and focus-journey lighting are available. Local clock means the browser's hour, not astronomical sunrise, geolocation, real weather or seasons. Weather choices are world-specific. Storm/lightning is not implemented.

## Module contract and event boundary

- `living/model.mjs`: validated world data, state transitions, weather/time choices, safe-margin geometry, journey progress and next boundary calculations.
- `living/scene.mjs`: shared original SVG layer vocabulary and bounded transform/opacity animations.
- `living/engine.mjs`: one inert Shadow DOM host, placement, lifecycle cleanup, input/control events, opt-ins, reduced-motion handling and chapter scheduling.
- `focus-state.js` / existing background worker: one local timer session per browser profile, deadline settlement, alarm recreation and aggregate completed-session/minute totals.
- Existing side panel: a Living tab for worlds, presentation, atmosphere, activity reactions and 5/25/45/90-minute focus journeys.

Events: `CHAT_STARTED`, `RESPONSE_STREAMING`, `RESPONSE_FINISHED`, `FOCUS_STARTED`, `FOCUS_COMPLETE`, `FOCUS_CANCELLED`, `USER_IDLE`, `USER_RETURNED`.

Native chat/streaming reactions are optional and derived only from supported composer send/stop controls. No transcript text or keystroke values are sampled. A small observer is confined to composer controls; unknown selectors may miss a reaction rather than trigger a broad message scan. Existing Word Bites remains a different feature with its separate local-text opt-in.

Ambient motion and activity reactions default off. Quiet Focus suppresses decorative motion during focus while chapter progress continues. Reduced motion and hidden/unfocused tabs pause motion. The 1.2-second entrance, when motion is enabled, affects only the scene; it does not darken the chat. Existing idle companions and Living scenes do not run together. Appearance imports and saved presets cannot silently enable Living motion or reactions.

## Persistence and privacy

The new `alarms` permission supports a local focus deadline; no new network, location, history, audio, notification or payment permission is added. Alarms may run late after suspension/sleep, so the worker reconciles persisted deadlines and handles duplicates once. An interrupted session earns no completed-session credit. Reset is explicit.

Counters measure completed **wall-clock timer duration**, including time away/asleep, not productive work. They are aggregate counts, not detailed conversation history. Page adapters receive appearance and focus state only, never notes/prompts or aggregate-history reset authority. Local profile storage is not encrypted or isolated by ChatGPT account.

There is no rendered Robot Colony, reward currency, daily streak or achievement system yet. The counters are a foundation for future progression, not a claim that those features exist.

## Packaging and evidence

Runtime: `chatdrobe-v0.5.0-load-unpacked.zip`, manifest directly at ZIP root, 29 runtime files, 80,102 archive bytes.

SHA-256: `7f8d47f7d63e3501d0b82a1ea33691b2aef039b3bef720acdce8caae28740109`.

Separate source ZIP includes runtime, model tests, Chrome-worker mocks, Chromium fixtures, original artwork and the interactive lab. The self-contained HTML lab demonstrates the same renderer with simulated events/progress; it neither installs an extension nor connects to ChatGPT.

Actually executed for the extension package:
- 101 Node tests passed: inherited contracts plus schema/rules, geometry, focus idempotency/restart/cancellation, opt-in/access boundaries and package references.
- 40 offline Chromium scenario groups passed: 20 baseline, nine Explorer, eight Living, three panel. Uses real Chromium rendering with synthetic ChatGPT markup and mocked extension messaging. Includes six world/view combinations, protected content, 100 transcript updates with no engine repaint, chapter changes, dialog/narrow-layout suppression and cleanup.
- A native unpacked probe did not start its service worker in this environment; browser HTTP navigation is administratively blocked. **No installed-extension or signed-in ChatGPT integration pass is claimed.** Website CI is not an extension integration test.

Measured uncompressed sizes: eager page JavaScript 16,186 bytes; optional engine modules together 33,155 bytes; inherited page CSS 59,813 bytes. At most 240 internal scene elements are asserted in fixtures. No per-frame JavaScript loop; at most two one-shot page timers for boundaries/optional idle behavior plus coalesced layout frames. All three environments' renderer code loads together on opt-in, not independently per world. These are size/DOM properties, not CPU/RAM/battery benchmarks.

## Testing this package

Back up notes and the working folder, replace runtime files inside the same folder already loaded in Chrome, reload the existing extension card and refresh ChatGPT tabs. Accept the alarms permission change if prompted. Fresh preferences remain Light; existing explicit choices remain intact.

About → Enable private tester preview → Living → Enter world. Start with Portal, then use Full World on a wider desktop. Adjust reading width to provide clear margin. Enable motion/reactions explicitly. Start a five-minute focus journey and return focus to ChatGPT. Test light/dark, sidebar changes, drafts, attachments, native dialogs, stop/send controls, hidden tabs, cancelling and finishing a timer.

## Platform roadmap and acceptance gates

| Stage | Deliverable | Gate before claiming completion |
| --- | --- | --- |
| 1 — current private build | Shared engine, three worlds, local time/weather, Portal/Full, focus events and aggregate counts | Installed ChatGPT integration, multi-tab/sleep/reload testing and measured overhead still pending |
| 2 — engine hardening | Live selector adapters, geometry fallback, capability flags, performance/reliability budgets | Browser/zoom/layout matrix; no blocked composer or unexpected content reads |
| 3 — content expansion | Underwater Research Station and Wizard's Study; apply reusable weather/time packs to older worlds | Distinct compositions on the shared layer model; readable normal/minimal views |
| 4 — progression | Robot Colony structures from completed timer totals, gentle achievements and explicit reset/export | No rewards for cancelled timers or duplicate alarms; no punitive streak or transcript dependence |
| 5 — atmosphere services | Original licensed/commissioned soundscapes, seasonal packs, optional local-time/real-weather integration | Sound starts only after consent; separate mute; explicit location/network opt-in and disclosures |
| 6 — Studio | Validated data-only editor, asset limits/sanitization, reusable layers/rules and local imports | No remote code or arbitrary HTML/CSS; safe asset types, budgets, migration and provenance checks |
| 7 — sharing/community | World URLs, creator profiles/gallery, moderation and ultimately marketplace | Accounts, abuse controls, rights management, safe rendering and commercial/revenue-sharing terms |

Future Free / Plus / Studio positioning: Free keeps static worlds, readability and basic local tools; Plus adds Living environments/behaviors; Studio adds authoring and sharing. **Only the existing private tester gate exists today. Studio is not implemented or sold.**

Payment backend, Stripe verification, commercial licensing, cancellation and refund flows remain separate Issue #6 work. Do not enable payment collection, sell Studio, or represent tester access as paid verification. A merge of this document must not close Issue #4, #5 or #6 or be interpreted as deployment of v0.5.0.
