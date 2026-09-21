# Payments first: test-mode backend pilot

Date: 2026-09-14. New-world and Gemini development are paused until checkout, extension cleanup and launch gates are complete.

Historical pilot design. For the integrated extension's current retry, expiry and request-limit repairs, see [Billing and extension access reliability](BILLING-RELIABILITY.md). The original extension-integration and card-only statements below describe the earlier milestone.

## What this code adds

A disabled-by-default Vercel Node endpoint at `/api/billing`, a PostgreSQL store/migration, a version-pinned Stripe REST client, signed short-lived access leases and a browser-safe verification contract. This is backend and contract code, **not yet an updated extension runtime**. The website engine, marketing/showcase and existing ZIP are unchanged. No live payment can be created by this implementation.

All server calls use Stripe API `2025-02-24.acacia`. Configure the webhook endpoint to this exact API version. This deliberately stable version has `subscription.current_period_end` and `invoice.charge`; upgrading requires contract tests, not just a version-string change.

| Action | Method | Authentication / effect |
| --- | --- | --- |
| `?action=health` | GET | Configuration status only; does not certify database or Stripe connectivity |
| `?action=checkout` | POST | Installation bearer; body may contain only `world`; creates/reuses one test Checkout Session |
| `?action=entitlement` | POST | Installation bearer; re-fetches canonical Stripe state and returns signed `plus` or `free` lease |
| `?action=portal` | POST | Installation bearer; creates a portal URL for its server-mapped customer only |
| `?action=webhook` | POST | Exact raw-body Stripe signature and timestamp; no installation bearer |
| `?action=return` | GET | Informational page only; cannot grant access from any query flag or session ID |

The price is server-selected and verified as an active, annual USD 29 test price. This is the previously proposed amount used as a **test fixture**, not final approval to charge it. No client price/customer/subscription/return URL is accepted. No trials, promotions, tax configuration or non-card methods are enabled by this pilot.

## Test identity and access model

A test extension installation will generate a random 32-byte secret, encode it as unpadded base64url and send it only in Authorization headers to the pinned HTTPS billing origin. Its public ID is SHA-256 of that string. The server stores only that ID, Stripe resource identifiers, checkout intent/status and access state. It never stores the secret, a conversation, notes, prompts, draft text or card data.

This is **installation-scoped pilot identity**, not a production account system. Reinstall recovery, verified customer identity, multiple-device access, credential rotation/revocation and secure account deletion still need implementation before selling subscriptions. Do not ship a paid product that strands access when an unpacked folder is replaced.

`contracts/license.mjs` verifies ES256 tokens against a **public key pinned in the extension build**; it rejects wrong installations, algorithms, environments, signatures and expiry. The server private key never goes in the extension. The current extension still uses its existing beta access system: importing this PR does not connect or change it.

Leases last at most 10 minutes and never beyond the verified paid period. The later extension adapter must recheck cached signatures on worker restart and enforce expiry even offline. A subscription marked past_due, unpaid, canceled, paused, or unverified receives Free access. A paid cancel-at-period-end subscription retains access until its paid period ends. This strict pilot policy is a starting point, not a finalized customer grace policy.

## Reliability/security behavior

- Persist the checkout intent before calling Stripe. Network timeout/retry uses stable provider idempotency keys and identical parameters.
- Reuse open checkout sessions. Incomplete/existing subscriptions direct users to billing management rather than creating another subscription.
- Unknown old checkout outcomes outside the provider idempotency-retention window stop for review rather than creating a potential duplicate charge.
- Verify the raw webhook body, timestamp tolerance, test mode and API version. No deserialize/reserialize step before signature verification.
- PostgreSQL row locks serialize installation updates. Event ID insertion and state mutation share a transaction. Failure rolls back both, so delivery can retry.
- Fetch current Stripe state rather than applying out-of-order event payloads as current truth. Obsolete checkout-attempt metadata is ignored.
- Full-refund/dispute signals create a conservative operator-review hold. Holds do not automatically clear on a later event. A reviewed appeal/refund policy and operator workflow remain launch gates.
- Exact checkout/portal hosts are allowlisted. No tokens appear in return URLs. Billing responses are non-cacheable; provider errors and SQL/auth payloads are not logged.
- Exact extension-origin allowlist plus bearer authentication. No cookie authentication or wildcard CORS. No API credential is embedded in public page JavaScript.
- Durable per-install and global request/checkout caps bound the private pilot. Add edge abuse controls, operational alerts and retention jobs before public launch.

## Configure a sandbox — not live mode

1. Use an isolated PostgreSQL database. Install server dependencies and run `BILLING_DATABASE_URL`-configured `npm --prefix server run migrate`. Migrations are explicit; deployment/build does not mutate a database.
2. Generate P-256 signing keys with `node server/keygen.mjs /private/path/outside-repo`. Place the private PEM only in server secret settings; keep the public JSON for the extension build. The utility refuses to overwrite existing key files and does not print secrets.
3. Set `BILLING_MODE=test`, `BILLING_ORIGIN` to the actual HTTPS host, `BILLING_DATABASE_URL`, `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `STRIPE_PLUS_PRICE_ID`, `BILLING_SIGNING_PRIVATE_KEY`, and `BILLING_EXTENSION_IDS` in the test deployment environment. Never paste secret values into GitHub issues, public files or screenshots.
4. Create the annual USD 29 Price in Stripe test mode. Configure a test customer portal with cancellation/payment-method management; no plan swaps are supported yet.
5. Register `/api/billing?action=webhook` with the pinned API version and events listed in `billing-service.mjs`. Configure webhook delivery access without disabling an entire project's protection. Do not share a protection bypass token in the repository or extension.
6. Verify hosted health, raw-body signatures, no-cache headers, real test Checkout and portal behavior. No Stripe account integration has been run by the local mock tests.

### Vercel root matters again

The API must be deployed from the **repository root**, Framework Other, Node 22, output `dist`. The existing static builder's `tests/dist` compatibility behavior does not make a root-level `/api/billing.js` deploy from a tests-only project. Keep BILLING_MODE off until the root and hosted API are verified. The companion install command installs server dependencies separately; no server package is bundled into the static website.

The normal website CSP remains intact. These are server-to-server Stripe/DB requests. The later extension update needs a narrowly scoped billing-origin host permission and connect-src entry; it does not need access to all websites.

## Tests and evidence boundaries

`npm --prefix server test` executes unit/security tests and a real localhost HTTP flow using simulated Stripe and an in-memory repository. No external Stripe request is made. The browser-compatible WebCrypto verifier validates the token returned by the HTTP endpoint.

`node --test server/integration/*.test.mjs` requires an isolated PostgreSQL database. CI provisions PostgreSQL 16 and tests real SQL migration, row locks, checkout concurrency, event deduplication, rollback, a new connection after restart, rate caps and revocation. Stripe remains simulated in these tests. Read the PR's actual CI outcome before merging.

Existing website CI must remain green independently. This PR does not close Issue #6 or claim the payment feature works in an installed extension.

## Next launch gates, in order

1. **Payment connection:** configure the sandbox and run real Stripe test-card/webhook/portal flows; then integrate checkout + Refresh access + verified leases into the background worker. Apply the originally selected Premium world only after a verified grant. Handle errors and expired leases without losing drafts or Free settings.
2. **Extension cleanup:** remove tester bypass from a separate release build; retain a clearly marked private test build. Verify key/host pinning, refresh/expiry alarms, service-worker restart, data export/update safety, layout/accessibility/performance and every requested permission. Keep Free tools and light defaults.
3. **Launch:** account/reinstall recovery, operator contact, final price/tax/refund/cancellation terms, privacy update, production-mode implementation and security review, store assets/listing, approved ZIP hashes, closed beta, then public rollout. Real charging and store publication need explicit release approval.
4. **Gemini:** a separate adapter after the ChatGPT release is stable. No Gemini host permissions or new worlds are added in this milestone.

References (primary documentation):
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/api/subscriptions/object?api-version=2025-02-24.acacia
- https://docs.stripe.com/api/customer_portal/sessions/create
- https://node-postgres.com/features/transactions
- https://vercel.com/docs/functions/runtimes/node-js
