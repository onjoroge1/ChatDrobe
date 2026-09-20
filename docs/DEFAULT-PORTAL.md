# Default customer portal — one less environment setting

This change removes STRIPE_PORTAL_CONFIGURATION_ID from runtime use, not merely from the readiness checklist. Existing values are ignored and may be deleted from Vercel after deploying this change. No replacement portal-ID environment variable is introduced.

## What happens now

The backend lists portal configurations with active=true, is_default=true, limit=2. It requires a complete singleton response and checks the default is active, in test mode, with payment-method updates, invoice history and end-of-period cancellation enabled and plan/subscription updates disabled. Missing, multiple, live, inactive, malformed or unsuitable results block activation with PORTAL_SETUP_REQUIRED. There is no fallback to a random configuration.

Before each Manage billing session, the backend resolves and validates the current default again and pins its returned ID on that request. Customers and the website never choose a configuration. Internal use of Stripe's resource ID prevents silently opening a different unvalidated configuration; users no longer copy that ID into environment settings.

Configuration-presence checks in Admin no longer require the removed variable. They return portalSelection=stripe_default, not a claim that provider configuration has already been verified. Actual provider validation still occurs when an authorized administrator enables test checkout and during its existing bounded preflight checks. Portal management does not depend on the new-checkout switch, so pausing purchases does not disable cancellation.

## One-time Stripe setting remains

Save the default Customer Portal configuration in the same ChatDrobe sandbox: payment-method updates and invoice history on; cancellation at period end on; plan switching off. Removing the ID does not create a portal or remove the need to give subscribers billing-management controls. The service only reads provider configuration; it cannot create or edit portal settings through this code.

## Remaining path to a full test

1. Verified account login. The deployed login requires email-code delivery. Resend is deferred by request; a different verified login method would need an explicit implementation. No admin bypass or fake verification is added.
2. Complete/check private Vercel Stripe test settings, webhook endpoint/secret and P-256 signing key, using the same sandbox as the existing annual price; keep DATABASE_URL. Never put secrets in this repository.
3. Save the default portal, redeploy if environment settings changed, verify the owner account and enable test checkout from Admin.
4. Exercise an actual app checkout, signed webhook, account-level Test Plus, cancellation/failure/expiry and second-browser access recovery. Automated tests with simulated providers do not complete this gate.
5. Connect the extension to verified account access. The current private extension and tester gate are unchanged by this backend simplification.

This is still test-only billing, not a live-charge release. No provider settings, payment objects, user records, credentials, authentication permissions or schema definitions are changed here. Existing auth, cookie, CSRF, role and price/webhook checks remain in place.

## Validation

21 new pure portal-policy tests ran locally. CI additionally runs service-flow tests, the existing full billing suite, real PostgreSQL integration with the default-portal path, and isolated deployment-bundle checks. Resend and Stripe are simulated in automated tests. Read the exact PR/commit CI status for its actual result. Public API health checks confirm routing/state only, not successful payments.

Primary docs: https://docs.stripe.com/api/customer_portal/configurations/list and https://docs.stripe.com/api/customer_portal/sessions/create
