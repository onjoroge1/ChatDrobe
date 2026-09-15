# Subscriber access and setup status

## Exact implementation boundary

Added to the payment branch:
- `server/account-identity.mjs`: an opt-in helper that validates a session against a pinned Supabase Auth project and derives a stable account billing ID from the verified user UUID, never a typed email or browser fingerprint.
- `server/setup-test.mjs`: read-only test-price lookup by default; explicit `--create-price` creates/reuses the USD 29/year test fixture. It rejects live credentials and prints no keys.
- Twelve automated tests for these two helpers.

**The account helper is not yet wired into `/api/billing`.** A complete account-aware HTTP/lease patch was prepared and tested locally, but the repository write for the existing security/integration code was blocked by tooling. The current branch's payment API still uses the original installation-scoped pilot. Do not claim that account recovery or sign-in is active. The patch is supplied separately for review, not as an extension installer.

No pasted Stripe key was installed in Vercel or used against Stripe. No Stripe test product, webhook, Auth project, database or account was provisioned. No payment occurred. Available Vercel actions cannot save environment secrets; direct Stripe network access was unavailable. Billing stays disabled unless the operator configures it.

## Recommended subscription model

Email one-time-code sign-in → verified Auth user UUID → stable ChatDrobe account billing ID → stored Stripe customer/subscription IDs → paid-through/status/hold state → signed, expiring Plus access.

One customer should recover the same subscription by signing into the same account after reinstalling or changing computers. An email is the login/recovery channel, not the billing database primary key. Changing email without changing the Auth UUID preserves ownership. Different UUIDs must not be auto-merged based only on matching email strings.

The prepared helper uses Supabase Auth. Auth returns the verified UUID/email; the billing record stores the non-secret issuer/subject identity and Stripe IDs/state, not email, Auth tokens, passwords, card numbers or chat contents. Existing SQL table/Stripe metadata names contain `install` for historical reasons; the completed account patch would use a distinct account-derived hash in those ID fields. Legacy pilot records are not automatically migrated or claimed by email.

The current v0.5.0 ZIP still lacks a sign-in/session-refresh screen and a wired payment client. A future billing build must obtain the authenticated account ID, validate signed access leases, clear access on sign-out/account switch, handle expiry offline, and retain Free settings and local notes. Device limits, account deletion/recovery support, SMTP delivery and production policies remain launch decisions.

## Configuration sequence

1. Rotate the exposed Stripe test secret. Save the replacement directly in Vercel Preview server settings as `STRIPE_SECRET_KEY`. Never paste the replacement into chat, commit it, or use a browser-visible environment prefix.
2. Keep `BILLING_MODE=off` while configuring. The supplied publishable Stripe key is not a license/signing key and is unnecessary for the existing hosted-Checkout-URL flow.
3. Deploy from repository root, Framework Other, Node 22, output dist. Verify the actual API route; a READY static `tests/dist` deployment does not establish API availability.
4. In a trusted terminal, with the rotated key already in the environment, run `node server/setup-test.mjs`. This performs reads only. Add `--create-price` only to provision the USD 29/year test fixture; save the returned `STRIPE_PLUS_PRICE_ID` in Vercel. The script does not set Vercel variables or create webhooks.
5. Configure an isolated PostgreSQL database and apply the explicit billing migration. Keep tables private/server-only; do not grant browser or anonymous database access.
6. Create the test webhook for the verified endpoint, using the pinned Stripe API version, and save its endpoint-specific `STRIPE_WEBHOOK_SECRET` in Vercel. This is separate from the API key.
7. Generate the existing server P-256 signing key privately and pin only its public counterpart in the future extension build. Set `BILLING_ORIGIN`, `BILLING_DATABASE_URL`, `BILLING_SIGNING_PRIVATE_KEY` and the actual `BILLING_EXTENSION_IDS`.
8. Before testing account mode, review/apply the prepared integration patch and configure the chosen Auth project. Its additional settings are `BILLING_IDENTITY_MODE=account`, `AUTH_SUPABASE_URL` and `AUTH_SUPABASE_PUBLISHABLE_KEY`. A Supabase service-role key is not needed by this helper.
9. Connect the extension sign-in/billing client and then enable `BILLING_MODE=test` in the isolated environment. Test real login, checkout, webhook delivery, access restoration, cancellation, account switching and offline expiry. No live keys or real charging in this pilot.

## Evidence

Sixteen local tests passed for the prepared full patch using real localhost HTTP/WebCrypto with simulated Auth/Stripe/storage. The branch adds twelve helper-level tests; check the current GitHub workflow result separately. No hosted Auth, email delivery, Stripe checkout or installed-extension integration is certified by those tests.

## References
- https://docs.stripe.com/keys-best-practices
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/auth/auth-email-passwordless
