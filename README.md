# ChatDrobe website, database and test billing

Companion website for the ChatDrobe desktop Chrome extension, plus a Node billing API and Neon PostgreSQL integration. The extension runtime remains a separate package. Launch priorities remain payments, extension cleanup, release, then Gemini.

## Product routes

- `/` — Living Worlds-first landing page
- `/themes/` — 15 static themes plus separate Living environments
- `/features/`, `/premium/`, `/pricing/` — Free/Plus features and $29/year display
- `/living-worlds/` — interactive demonstration of existing environments
- `/how-it-works/`, `/install/`, `/help/` — behavior, beta installation and support

The static catalog contains 11 Free themes and four Plus themes. Rainy Tokyo Loft, Starship Journey and Cozy Train Journey are additional Living environments. Appearance JSON downloads select static preferences, not Living environments.

## Database status

PR #19 connected the existing Vercel `DATABASE_URL` to Neon. Production deployment of merge `09f4e26386637f9d508cc0714832dd222c2b0757` applied migration `001_billing`; the live custom-domain readiness endpoint returned HTTP 200 with configured/connected/schemaReady all true on September 16, 2026. This is a point-in-time verification, not an uptime guarantee.

- `/api/billing?action=database` — SELECT-only, cached/coalesced database readiness with no connection strings, schema details or user records in the response.
- `/api/billing?action=health` — billing configuration status. It continues to report billing off.

The database uses the existing billing state, webhook-deduplication and rate-limit tables plus migration history. It does not hold card details, conversation text or browser drafts. Subscriber login/account mapping is still unfinished; a working database does not grant Premium access.

Read [Neon integration and release behavior](docs/NEON-DATABASE.md) for current setup. Its DATABASE_URL and production-migration instructions supersede the earlier installation-only pilot setup notes. No real credentials belong in this repository or the extension. Rotate exposed secrets in the provider, update Vercel and redeploy.

## Payment implementation status

`api/billing.js` and `server/` implement test Checkout creation/reuse, subscription reconciliation, billing-portal sessions, signed raw-body webhooks, PostgreSQL persistence and short-lived access tokens. `contracts/license.mjs` is the browser-safe verification contract for the future extension integration.

**Billing remains off; live mode/keys are rejected.** The displayed price is $29/year, but checkout is not activated. Real Stripe sandbox checkout/webhook tests, verified sign-in, account-based recovery, extension integration and release-build removal of the tester bypass remain launch gates under Issue #6. The extension ZIP was not changed by the database milestone.

## Development and tests

```sh
npm run check                  # static website build and contracts
npm run install:billing        # locked server-only dependencies
npm run test:billing           # unit/security/HTTP tests; simulated Stripe
npm run db:status              # real SELECT-only check using server environment
npm run db:migrate             # explicit initial-schema migration
# Only a disposable localhost PostgreSQL service may run the integration suite:
node --test server/integration/*.test.mjs
```

The static website remains dependency-free; the server dependency is isolated and locked. PostgreSQL integration tests exercise real SQL, including migration, concurrency, rollback and legacy-row preservation. Payment providers remain simulated in CI.

## Deployment and schema changes

Build Output API v3 explicitly packages the static site and `/api/billing` function, including the legacy nested-root hosting layout. Repository root / Other / Node 22 remains the preferred dashboard configuration. Server source, migration SQL and secrets are never served as static files; migration code is not present in the HTTP function bundle.

After packaging succeeds, `db:deploy` runs only for production `main` builds of this repository. It applies **only the reviewed additive initial billing schema**, protected by a transaction lock, migration checksum and schema validation. Already-applied migrations are not replayed; existing rows are retained. Incompatibility or missing database configuration fails the new release. Preview and local builds never migrate automatically. Future migration files require an explicit reviewed change; they are not discovered automatically.

No deployment step changes payment mode, creates Stripe subscriptions or configures authentication. The website remains noindex by default. Database reachability is not a completed payment launch, store publication or installed-extension integration test.
