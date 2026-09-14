# Explorer collection — extension 0.4.0 companion update

This is the WEBSITE part of the collection. The extension runtime remains a separate private test package. This PR does not deploy or merge that package, enable checkout, change Vercel project settings, or implement a payment backend.

## Delivered in the extension test package

Three new Free starter worlds: Rally Garage (`rally`, Cars), Orbital Bridge (`bridge`, Spaceships), Solar Observatory (`observatory`, Space). Each has original light/dark artwork and a coordinated palette. Total: 15 worlds / 11 Free / four Premium worlds, 30 palette combinations. Fresh preferences default to Light for both workspace and side panel; existing explicit preferences are preserved.

Their opt-in Premium routines are distinct: a car cruise/park/headlight sequence, an undock/inspect/recharge drone, and a single miniature planetary orbit. The new routines use a small clear margin above the composer. They skip narrow/covered layouts and stop on interaction, reduced motion, visibility/focus changes. No transcript text is inspected by these three routines. Existing Word Bites remains a separate text-access permission.

Premium is an explicit private tester preview, not paid access. Static worlds and reading controls are Free. The checkout/backend remains a separate Issue #6 requirement.

## Website changes

15 catalog entries and appearance downloads; 25 pages plus the 404 page. Adds Cars/Spaceships/Space filters via catalog data, original SVGs, homepage collection, theme-specific routine instructions, new-ID import/export/favorites validation, updated Free/Premium copy and privacy disclosure. The website previews are static illustrations, not installed extension sessions. New-world imports require extension 0.4.0; older packages may fall back to Mooncat for an unknown ID.

## Validation

Local website Node checks: 27 passing, including retained Vercel root/output guards and the three new world contracts. Local website HTTP browser navigation is administratively blocked, so the GitHub runner must verify the real HTTP suite. Read the PR's current CI result rather than treating this document as a run result. Offline render screenshots are supplementary only.

Extension package: 77 Node tests, existing 20 offline browser scenario groups plus nine Explorer groups. Real Chromium rendering and Web Animations were exercised against synthetic page markup and mocked messaging, not a signed-in ChatGPT account. An installed service-worker probe did not start successfully in this environment; do not claim installed-extension compatibility from the fixture suite. End-user testing is required.

## Review / release

Targets main directly, not a stacked branch. Do not close hosting or commercial issues solely because this catalog update merges. Retain noindex defaults and blank public package/store URLs until the approved artifact and hosted behavior are verified. Existing source/build output path checks and Node 22 pin remain in place.
