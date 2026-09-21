# Bounded Lottie pilot: Tokyo tea steam

The Tokyo desk has one locally packaged animation. It trials an importable keyframe asset workflow alongside the existing SVG world and articulated cat. It does not replace the scene engine, prove a performance advantage, or supply a finished artwork collection.

## Runtime and artwork provenance

- Player: [airbnb/lottie-web](https://github.com/airbnb/lottie-web), npm `lottie-web@5.13.0`, `build/player/lottie_light.js`, MIT. The complete upstream notice ships at `browser-extension/extension/living/vendor/lottie-LICENSE.txt`.
- Exact upstream/output hashes, npm integrity and source URL: `living/vendor/lottie-provenance.json`.
- Animation: `living/art/tokyo-steam.mjs`, original ChatDrobe vector paths and authored keyframes, CC0-1.0. It contains two paths, eight seconds at 30 authored frames/second, no fonts, images, audio, expressions or asset URLs. The Lottie player is third party; this animation is not claimed to be a downloaded third-party artwork.
- Renderer source is 387,358 bytes before compression. It is dynamically imported only when Tokyo motion is allowed, never for an initial Still scene. This is a material size cost for a small visual effect. Continue the experiment only if authored animations justify the cost and simplify subsequent art production.

## Reproduce the vendored module

Use a temporary directory outside the repository:

```sh
npm pack lottie-web@5.13.0 --ignore-scripts
tar -xzf lottie-web-5.13.0.tgz
node /path/to/ChatDrobe/browser-extension/scripts/vendor-lottie.mjs /path/to/package
```

The adapter checks both upstream source and license SHA-256 before writing anything. It removes the UMD wrapper in favor of a private ESM export, disables standalone mode, and removes automatic document discovery/polling and the legacy global. These behaviors matter in a content script: the player must never discover animations on the host page. The runtime remains otherwise upstream SVG light code, with no expression engine or dynamic evaluation. Updates require reviewing a new version and hashes, not relaxing the guard.

## Runtime contract

`createLottiePilot(document, {container, fallback})` returns `update(state)`, `diagnostics()` and `destroy()`. The container lives in a small SVG `foreignObject` so it follows the world's crop and coordinate system. The original steam path stays visible until the player reports `DOMLoaded`. A failed import or player error restores it and prevents a repeated load loop.

The pilot uses cloned in-memory shape data, `autoplay: false`, SVG renderer, no subframes, `runExpressions: false`, and explicitly disabled web workers. There is no animation URL, JSON fetch, CDN, remote asset, WebAssembly or CSP relaxation. Upstream contains unused asset/worker support, but this adapter supplies no paths or assets and never enables workers. Do not add arbitrary user animation imports without a separate trust/schema review.

Motion requires an active visible scene and explicit motion selection. Busy input, streaming, Quiet Focus, sleep, Still, hidden document, and OS reduced motion pause playback. Updates resume the existing instance. Teardown removes listeners and destroys the instance; a late module import cannot recreate a disposed scene. The engine remains responsible for window focus and actual layout visibility, conveyed by `active`.

## Verification and limits

- `node --test tests/lottie-pilot.test.cjs` from `browser-extension/` covers lazy loading, state gates, lifecycle races, failure fallback and pinned-source constraints. These use a player double; they do not establish browser rendering.
- `python browser-extension/tests/lottie_browser.py` is the real Chromium fixture. It imports the packaged module under `script-src 'self'` and `connect-src 'none'`, verifies rendered paths/frame movement, pause/resume, no automatic page discovery or remote request, zero continuing RAF callbacks while paused/after disposal, and graceful blocked-import fallback.
- The browser fixture writes `browser-extension/preview/lottie-browser-results.json` with raw/gzipped size, scene node count, active/paused task time over 1.2-second samples, RAF callbacks and heap delta. These are fixture measurements, not production CPU/memory claims. Do not quote numbers until that run has passed.
- The fixture screenshot is `lottie-tokyo-steam.png`; the direct local review page is `/browser-extension/tests/lottie-fixture.html` when serving the repository root.
- Real signed-in ChatGPT, browser restart/update, and long-duration lower-end-device costs remain release checks. This experiment must not be presented as those checks passing.

Keep one pilot. If a coherent collection of exported animations does not materialize, remove the player and retain the small static/CSS fallback. Do not add a second general animation engine to solve the same problem.
