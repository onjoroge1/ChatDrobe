# ChatDrobe extension

The versioned Manifest V3 runtime is in `extension/`. This source was imported from the audited 0.7.0 source archive; 0.8.0 repaired selection, saved appearance, account handoff and access refresh. 0.9.0 adds immediate motion selection, automatic display checks, a measured empty-space fallback, curated Tokyo artwork and a bundled Lottie light pilot. See `../docs/WORLDS-ART-MOTION.md` for verification and remaining launch gates. `../release.json` is the release version authority. The package and Chrome manifest must match it or the build fails.

Run from the repository root with Node 22 and Python 3:

```sh
npm run check:extension
npm run package:extension
```

The second command checks the build and writes a reproducible ZIP and SHA-256 file to `artifacts/extension/`. The ZIP contains `manifest.json` at its root. CI also publishes it as the `chatdrobe-extension-review` artifact. This is a private sandbox review build; it does not enable live payments or publish to the Chrome Web Store.

For a new installation, extract the runtime, open `chrome://extensions`, turn on Developer mode, and use Load unpacked on that folder. For an existing installation, back up your workspace, replace files in the same loaded folder, reload its existing Chrome card, and refresh ChatGPT. Changing the folder or uninstalling can create a separate extension identity and lose access to the previous local workspace.

See `extension/INSTALL.txt` for the selection flow. `tests/` contains reducer, worker, entitlement and layout unit tests plus offline Chromium fixtures. These fixtures simulate the page and Chrome APIs; they do not prove compatibility with the current signed-in ChatGPT DOM. Native Chrome, real account recovery and real Stripe sandbox lifecycle checks remain release gates in `../docs/PREMIUM-REPAIR-ACCEPTANCE.md`.

The website imports the same local scene modules for its labeled preview. The static deployment never publishes the entire extension source tree. Keep credentials and private keys out of both runtime and preview assets.
