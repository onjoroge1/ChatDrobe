# Accounts, admin and test-payment activation

## Delivery scope

Four public, data-free page shells: /signup/, /signin/, /account/, /admin/. The /api/account function provides verified email-code login, opaque server-side sessions, registered-account listing and protected payment activation. The existing /api/billing handler authenticates these website sessions; it no longer accepts an arbitrary installation bearer in the deployed account flow. Its factory still supports the old pilot in isolated regression tests only.

The initial owner email nominated by the user is represented by SHA-256 in migration 002_accounts. This is an invitation, **not a pre-verified account or default password**. The exact email must successfully verify its code through /signup/. Only then is the admin role granted, atomically, once. A subsequently demoted user is not re-promoted merely by signing in with that email. There is no public role-grant API and no client isAdmin flag is trusted.

The public /admin/ HTML is a sign-in shell, not an exposure of administrative data. Every data read and activation action verifies the server-side session and role. Activation requires authentication within 15 minutes; sessions expire after 8 hours for admins and 7 days for users. Session cookies use __Host-, Secure, HttpOnly and SameSite=Strict. Mutations require an exact Origin plus a custom same-origin request header. No session/OTP token is placed in localStorage, query strings, console output, or response JSON.

## Neon records and migration

Reviewed additive migration 002_accounts follows the existing 001 release job only on production main deployments. It creates accounts, hashed login challenges, hashed sessions, admin invitations, audit events and app settings. Locking/checksum/schema checks guard repeated builds. Existing billing rows are neither deleted nor reinterpreted by email. New verified accounts get a stable UUID and a namespace-derived billing ID; signing in on a second browser keeps that relationship.

Accounts are created only after email verification. The dashboard counts registered verified accounts, Free accounts and **Test Plus** separately. Live-paid count is zero in this test-only implementation. Anonymous extension installations and old installation-only pilot rows are not falsely counted as registered users. Subscription columns are last-verified database snapshots, not a fresh Stripe census. Searches are parameterized and use POST bodies, not user-email query URLs. Admin reads and activation changes are audited.

Codes are eight random digits, one use, ten-minute expiry and five verification attempts. The digest is bound to a high-entropy HttpOnly browser challenge. Global/email/IP rate limits bound requests; no raw IP is stored by this application. Failed delivery invalidates its challenge. Unknown-account sign-in is distinguished only after email ownership is verified. Expired challenge rows are cleaned during subsequent code requests; session rows are bounded to ten per account. A broader retention/account-deletion workflow remains a launch task.

## Email setup required before user verification

The implementation uses Resend for delivery; Neon remains the only application database. No second Supabase database or auth project is required. Configure in Vercel server settings:

- RESEND_API_KEY: a sending key scoped to the verified sender domain.
- AUTH_EMAIL_FROM: e.g. ChatDrobe <login@chatdrobe.com>, after verifying that domain/sender in Resend.
- AUTH_ORIGIN: https://www.chatdrobe.com (also the default).

These must be real, configured server values, not values pasted into GitHub or the extension. Connecting a ChatGPT plugin does not automatically set the deployed application's environment. /api/account?action=status reports whether email settings are configured; it does not claim an email was delivered. Without configuration the form stays unavailable rather than accepting unverifiable admin access. No real email is sent by tests. Deferring Resend leaves this login flow unavailable until delivery is configured or another verified authentication method is deliberately implemented; there is no temporary authentication bypass.

## Stripe configuration and explicit activation

Only test mode exists. No live key, live object or real charge can be enabled through Admin. $29/year is the displayed annual plan and the test price amount.

Server environment requirements: BILLING_MODE=test, BILLING_ORIGIN=https://www.chatdrobe.com, STRIPE_SECRET_KEY (rotated test key), STRIPE_PLUS_PRICE_ID, STRIPE_WEBHOOK_SECRET, STRIPE_WEBHOOK_ENDPOINT_ID, BILLING_SIGNING_PRIVATE_KEY (P-256), and the existing DATABASE_URL. Optional legacy extension IDs do not substitute for website identity. Keep BILLING_MODE off until the required settings are complete.

STRIPE_PORTAL_CONFIGURATION_ID is no longer used. Old values may be deleted after the default-portal change deploys. Save the default Customer Portal configuration once in the same Stripe sandbox: payment-method management, invoice history and cancellation at period end enabled, with plan updates disabled. ChatDrobe discovers that default automatically, validates it, and uses the resolved ID internally for the session. It does not create provider configuration or choose an arbitrary non-default portal. See [Default portal behavior](DEFAULT-PORTAL.md).

Use the existing server/setup-test.mjs to provision/check the test price, and server/keygen.mjs to generate the signing keys in a private folder outside the repository. Do not print private keys. Register the endpoint https://www.chatdrobe.com/api/billing?action=webhook with API version 2025-02-24.acacia and the events in accounts-payments.mjs.

After the owner verifies their email, /admin/ shows configuration booleans without secret values. These report configuration presence, not a completed provider transaction. Enable test checkout rechecks the actual Stripe price, webhook URL/API version/events and the discovered default portal before setting a server-controlled DB flag. This validates provider setup, **not actual signed webhook delivery**. The secret must be verified with a real sandbox checkout/webhook test. The flag starts false; deployment never toggles it on.

The account page opens provider-hosted checkout and portal URLs selected on the server. A return URL does not grant access. Refresh subscription reconciles Stripe state through the existing service. Pausing new checkouts does not disable existing webhook processing, portal access or cancellation/revocation verification. Every portal session freshly validates the current default. Full-refund/dispute holds remain operator-reviewed.

## Unfinished items / honest boundaries

Email/Stripe sandbox operations must be exercised against configured providers. The test suite uses simulated Resend/Stripe with real local HTTP and PostgreSQL transactions. The existing extension ZIP and private tester switch are unchanged: **this change does not yet sign the installed extension into the website account or replace its access gate**. Extension linking/lease refresh/reinstall recovery must be tested in a subsequent package before advertising paid installed access.

A live launch additionally needs MFA/passkey hardening for administration, final support/deletion/retention controls, final commercial/refund/tax disclosures, production-mode security review, and the integrated extension/store release. Do not call test subscriptions paying customers or treat the existence of /admin/ as proof that the owner has completed verification.

Primary references: https://resend.com/docs/api-reference/emails/send-email ; https://docs.stripe.com/webhooks ; https://docs.stripe.com/api/customer_portal/configurations/list ; https://docs.stripe.com/api/customer_portal/sessions/create ; https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
