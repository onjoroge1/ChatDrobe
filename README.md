# ChatDrobe website

The companion website for ChatDrobe, migrated from the 0.2.0 prototype. **Website-only repository:** it never rebuilds or modifies the extension being tested separately. Theme IDs, palettes, original SVG artwork and appearance format are preserved from that prototype.

## Develop

Node.js 22 or newer. There are no runtime or build dependencies.

```sh
npm run dev       # build, then http://127.0.0.1:4173
npm run check     # build plus Node tests
npm run build     # output: dist/
```

Run the build again after source changes; the preview server does not watch files.

## Structure

- `src/themes.json`: shared website catalog, preserving extension 0.2.0 identifiers.
- `src/art.json`: original SVG illustrations from the prototype; no franchise assets.
- `src/render.mjs`: pre-rendered pages and reusable layout.
- `src/styles.css`, `src/client.js`: small, first-party browser assets.
- `scripts/`: dependency-free build and local server.
- `site.config.json`: public release configuration, not secrets.
- `dist/`: generated output; intentionally not committed.

## Release boundaries

The private beta package is shared with testers independently. No public ZIP or Chrome Web Store URL is invented. Installation instructions remain useful with the ZIP already provided. Appearance JSON downloads are real and do not install an extension.

All 12 worlds are unlocked. Free/Plus pricing describes proposed packaging; no checkout, paid entitlements, cloud sync or live ChatGPT compatibility certification is implied. No personal information or fabricated support email is collected.

## Hosting

Import this repository into Vercel with framework **Other**, root directory `.`, build `npm run build`, output `dist`. `vercel.json` supplies these settings. Preview builds are noindex by default. Connecting and deploying the project is a separate authorized action; the presence of this configuration is not a deployment.

## Source ownership

Original ChatDrobe theme artwork and website source. No open-source license is granted by this repository. ChatDrobe is independent of OpenAI; ChatGPT is OpenAI's trademark. Brand/domain clearance remains a launch gate.
