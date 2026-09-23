# ChatDrobe

ChatDrobe's desktop Chrome extension, companion website and test billing/account server are versioned together. The private review build is **0.9.1**; `release.json` is the version authority. This repository does not represent a live-payment or Chrome Web Store release.

- `browser-extension/extension/` — the Manifest V3 runtime loaded by Chrome.
- `browser-extension/tests/` — state, worker, renderer and offline browser fixtures.
- `src/` — website pages and scripts; scene previews use the extension's local modules.
- `server/`, `api/` — account linking, short-lived signed access and test billing.
- `docs/PREMIUM-REPAIR-ACCEPTANCE.md` — audit repairs and remaining release checks.
- `docs/CREATIVE-STATUS.md` — actual artwork integrations, older PR status and prioritized remaining work.

## Product behavior

Worlds is the primary extension gallery: select a theme, Living World or natural cat with a Still, Subtle or Playful motion choice. Selection clears conflicting effects. Reading controls and local workspace tools remain available separately. Page status distinguishes saved preferences, displayed content, paused motion and blocked placement. A website demonstration is explicitly a simulation.

There are 15 static themes (11 Free and four Plus), three Plus Living Worlds and a Plus natural companion. Account approval on the website is not proof that the current extension installation has received valid access. The extension verifies signed entitlements; live payments remain disabled.

## Development

Use Node 22 and Python 3 for release packaging.

```sh
npm run check                  # website build and contracts
npm run check:extension        # extension build and tests
npm run install:billing        # locked, server-only database driver
npm run test:billing           # server/HTTP checks with simulated providers
npm run check:all              # all three local suites
npm run package:extension      # checked review ZIP plus SHA-256
```

The extension ZIP is written under `artifacts/extension/` with `manifest.json` at its root. The Extension quality workflow publishes the ZIP and checksum in `chatdrobe-extension-review`. See [extension setup](browser-extension/README.md). CI runs Node 22, website/offline Chromium fixtures and isolated PostgreSQL tests. Provider responses are simulated; these checks do not certify native installed Chrome, the changing signed-in ChatGPT DOM or real Stripe recovery.

The static website and extension require no installed production JavaScript dependencies. The locked PostgreSQL driver is server-only. Only a disposable localhost database may run `node --test server/integration/*.test.mjs`.

## Hosting and billing

The Vercel Build Output configuration packages the static `dist/` site and isolated API functions. Server source, migration SQL, extension worker/account code and credentials are not public static assets. Current renderer modules are intentionally included only for the labeled site preview.

`npm run db:status` checks readiness without returning credentials. `db:deploy` applies only reviewed additive schema migrations on production `main` builds of this repository, under a transaction lock. Preview/local builds never migrate automatically. See [database integration](docs/NEON-DATABASE.md).

Billing remains off by default and live mode/keys are rejected. Public email sign-in requires configured delivery. Keep credentials and signing private keys in server configuration. Merging a repair does not enable these services, publish a store listing or satisfy the release checks. Website indexing and downloads require explicit release configuration; an empty download/store URL must not be presented as an available install.
