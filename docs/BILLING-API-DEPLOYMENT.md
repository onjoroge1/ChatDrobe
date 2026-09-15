# Billing API reachability milestone

The production deployment at the start of this change returned Vercel's NOT_FOUND for `/api/billing?action=health`, even though PR #14 had merged. Its build was invoked from `/vercel/path0/tests` and emitted only the static `tests/dist` site. Installing the PostgreSQL driver did not cause the root-level API to be included.

## Explicit deployment output

`npm run build:vercel` first builds the existing website, then emits Build Output API v3 under the actual invocation root:

```
.vercel/output/
  config.json
  static/                        # Generated website only
  functions/api/billing.func/
    .vc-config.json              # nodejs22.x; helpers/body parsing off
    package.json
    api/billing.js
    server/                      # Allowlisted runtime modules only
    node_modules/                # Lockfile-selected server packages
```

Both repository-root and legacy nested-root invocation are tested. The preferred dashboard setting remains repository root / Other / Node 22, but route delivery no longer relies on automatic API discovery from the wrong directory. No duplicate `tests/api` implementation is introduced.

The API route is internal and accepts both `/api/billing` and `/api/billing/`; it does not redirect webhook POSTs. Static page routes retain trailing-slash redirects, security headers, original file contents and real 404 behavior. Billing responses remain non-cacheable. No runtime environment values are copied into artifacts. Source files, private keys, environment files, tests and migrations are excluded from public static output. Server tests/setup scripts are excluded from the function too.

## Validation

Three route-compiler tests check exact API dispatch, static routes, redirects, budgets and invalid route rejection. The billing CI's existing integration glob additionally builds two isolated deployments (root/nested), removes access to source server files, and calls the packaged handler over localhost HTTP. It checks health JSON, disabled checkout/webhook/portal/entitlement responses, return-page non-authority, dependency resolution, and absence of external calls.

These artifact tests complement—not replace—the existing billing/PostgreSQL and website/Chromium suites. A Vercel preview must build before production promotion. The final acceptance check is a fresh response from the public custom domain, not a static JSON file standing in for the API.

Expected when billing remains off:

```
GET https://www.chatdrobe.com/api/billing?action=health
200 application/json
{"enabled":false,"mode":"off","livePayments":false}
```

Also check the bare domain, API trailing-slash form, homepage, Premium page, a real appearance download, a missing page, and rejection of direct server-source requests. Health only proves runtime routing/configuration mode, not a configured database, real Stripe payment, account login or extension entitlement integration.

No secrets are needed to reach health in off mode. This change does not configure Stripe, change billing mode, migrate a database, activate checkout, change accounts, or remove deployment protection. Subscriber auth wiring and sandbox testing remain separate milestones.

Primary platform specification: https://vercel.com/docs/build-output-api and https://vercel.com/docs/build-output-api/primitives
