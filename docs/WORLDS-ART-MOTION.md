# Worlds, artwork and motion: 0.9.0

This private-beta change implements the three recommendations following the
premium audit: immediate controls and safer visibility, one curated world, and
one bounded animation-library trial. It does not enable live billing.

## What changes for a tester

- Select a world once. Still/Subtle/Playful immediately changes that selected
  experience through the existing trusted worker operation. Rapid selections are
  serialized; a later motion click applies to the newly selected world. Locked
  choices retain the complete intended selection for account verification.
- Worlds checks the active page automatically every three seconds while the
  gallery is visible. Check display refreshes it immediately. Closing, hiding or
  leaving the gallery stops those checks; delayed replies cannot replace newer
  status or action feedback.
- Where side margins are unavailable, a compact portal can occupy measured empty
  space below the final message and above the composer. Native controls and
  unknown geometry exclude this fallback. Scroll and layout changes revoke a
  stale placement before it is measured again. A crowded conversation may still
  have no safe scene location, and the panel reports that explicitly.
- Tokyo has a coordinated botanical palette and two curated plant props. The
  original cat and its finite routines remain. Day, dusk and night use the same
  assets in the extension and website's current renderer. Website previews load
  that renderer when visible, initially Still; no-JavaScript illustrations remain.
- Tokyo's optional tea steam trials a locally packaged Lottie SVG light player.
  Other worlds, Still mode and Natural Cat do not load that player. Reading,
  typing, streaming, Quiet Focus, reduced motion, hidden/inactive state and sleep
  pause it. Teardown removes its SVG and animation state. Load failures preserve
  the existing steam artwork.

Motion is permission to run, not continuous animation: existing activity and
accessibility policies still apply. Static themes currently use the same gentle
movement for Subtle and Playful; the controls state this explicitly. The cat's
first idle routine still waits for its quiet interval.

## Reuse and provenance

| Component | Source | Shipped scope |
| --- | --- | --- |
| Plant artwork | DiceBear Sprouts, `@dicebear/styles@10.6.0`, CC0 | Two selected SVG plant/pot compositions, palette substitutions and unique IDs. No avatar API or generator in production. |
| Companion | Existing original ChatDrobe rig | Existing cat and finite Web Animations performances. |
| Animation player | `lottie-web@5.13.0`, MIT | SVG light build adapted deterministically to ESM, without automatic host-page discovery or globals. |
| Steam animation | Original ChatDrobe keyframes | Two vector paths, no expressions, fonts, raster media or external assets. |

Reproduce artwork using `tools/artwork/README.md`. The source and output hashes,
selections and license record live in `living/art/art-sources.json`; its license
notice is packaged with the runtime. Lottie reproduction and performance evidence
are recorded in `docs/LOTTIE-PILOT.md`. Retain the upstream MIT notice when
redistributing the player. Chrome's permissions and script policy are unchanged;
the added web-accessible modules are restricted to the existing ChatGPT match.

This is a production-pipeline trial, not a new world catalog. Reusing components
does not establish a premium visual style for future worlds. Review each new
collection's composition, license, responsive behavior and cost before adding it.

## Verification

Run with Node 22:

```sh
npm run check:all
npm run package:extension
```

The extension CI also executes three Chromium fixtures:

- `tests/browser.py`: page compatibility and side-panel controls, including
  immediate motion and automatic status updates.
- `tests/quiet_browser.py`: actual shared ESM renderer and Web Animations against
  synthetic conversation geometry, lifecycle and reduced-motion controls.
- `tests/lottie_browser.py`: actual vendored player under a no-eval CSP, real frame
  progression and pause/resume, lazy loading, disposal, failure recovery and no
  external requests. It writes bundle/node measurements alongside screenshots.

Node regression tests exercise protected placement, unknown and growing layouts,
selection ordering, premium gating, stale status responses, quiet timers and
artwork integrity. Browser fixture results are evidence about those fixtures;
they are not signed-in ChatGPT or Chrome Store certification.

## Remaining release gates

Load the exact 0.9.0 package, refresh ChatGPT, and test the current signed-in page
with Chrome and ChatGPT sidebars, short and long threads, and 100/125/150% zoom.
Confirm drafts and native controls are preserved. Native CPU, heap, memory and
battery measurements are still required before making performance claims. The
larger Lottie player is justified only if measured visual quality and production
savings outweigh its cost; do not extend it to every world by default.

Public sign-in, real payment lifecycle, device/entitlement expiry, migration,
distribution and support gates in `PREMIUM-REPAIR-ACCEPTANCE.md` remain separate.
Merging this PR does not update an already loaded unpacked extension.
