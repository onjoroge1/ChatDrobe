# ChatDrobe website and test billing

Static companion website for the ChatDrobe desktop Chrome extension, plus an isolated, disabled-by-default test billing API. The extension runtime remains a separate package.

The release sequence is **payments → extension cleanup → launch → Gemini**. New-world development and Gemini support are paused during this launch work.

## Product routes

- `/` — product landing page
- `/themes/` — world catalog
- `/features/`, `/premium/`, `/pricing/` — Free/Plus features and proposed plans
- `/living-worlds/` — interactive concept showcase
- `/how-it-works/`, `/install/`, `/help/` — behavior, beta installation and support
- `/go-to-market/` — launch-positioning page for beta review

The Explorer catalog contains 15 worlds: 11 Free and four Plus-preview worlds. Appearance downloads contain display preferences only.

## Payment implementation status

`api/billing.js` and `server/` implement test Checkout creation/reuse, subscription reconciliation, billing-portal sessions, signed raw-body webhooks, PostgreSQL persistence and short-lived Premium access tokens. `contracts/license.mjs` is the browser-safe verification contract for the next extension integration.

**Billing defaults off. This release rejects live mode and live Stripe keys.** USD 29 annually is a test-price fixture, not approval to charge customers. No card data or conversation content is stored. The static website retains its existing pricing disclaimers and does not start checkout.

The current extension has NOT yet been connected to this backend. Stripe sandbox verification, authenticated account/reinstall recovery, extension integration, release-build removal of tester bypass, operator disclosures and production billing remain launch gates under Issue #6.

See [test-pilot architecture, configuration and launch gates](docs/PAYMENTS-TEST-PILOT.md). Do not put secrets into this public repository, browser code or issue reports.

## Development and tests

```sh
npm run check                  # static website build and contracts
npm run install:billing        # locked server-only database dependency
npm run test:billing           # unit/security/HTTP tests; simulated Stripe
# An isolated PostgreSQL database is required for the integration suite:
node --test server/integration/*.test.mjs
```

The static website itself remains dependency-free. Server dependencies are isolated in `server/package.json` and its committed lockfile. Migrations are explicit; deployment/build does not modify a database.

## Deployment

Use the repository root, Framework **Other**, Node **22.x**, output **dist**. The previous nested `tests/dist` static-build workaround is NOT sufficient for a root-level `/api` function. Confirm hosted API routing and webhook access before setting `BILLING_MODE=test`; do not disable project-wide protection merely to test a webhook.

The website remains noindex by default. A GitHub merge, Vercel READY status, or green simulated-provider test is not a verified Stripe sandbox transaction, a production payment launch or a Chrome Web Store publication.
