# Owner sign-in and extension subscription test — v0.6.0 sandbox

This milestone connects the existing website account/billing flow to a device-bound extension entitlement. It does not claim a live-money launch or a successful real-provider transaction.

## Owner credentials in Vercel

The only new owner settings are ADMIN_EMAIL and ADMIN_PASSWORD_HASH. The owner must match the reserved admin invitation already in the database. Run `node scripts/create-owner-login.mjs /private/folder/outside-repo` to create a random password plus its fixed-parameter scrypt hash. Save the password in a password manager; put only the two settings from vercel-owner.env in Vercel Production, then redeploy. Do not commit either file or paste the password into a public issue. Missing settings disable this login. No plaintext ADMIN_PASSWORD, default password or admin credit balance is supported.

Use /signin/ → Owner login. This is explicit operator-provisioned authorization, not email inbox verification. It does not enable public password sign-up and does not grant Plus. The legacy account verified_at column records identity assurance; the API explicitly reports emailVerified:false and identitySource:operator_credentials for this login. Owner sessions expire after one hour. Password-hash/email changes invalidate owner sessions and owner-linked devices. Disabled/demoted administrators cannot regrant their role with the password. Rate limits precede the memory-hard password calculation. CSRF checks and server session/role gates remain.

Email delivery may stay deferred for the owner-only sandbox. Public signup still requires a working verified email method before general onboarding. Payment readiness accepts email verification OR configured owner login, and reports publicSignupAvailable separately. It does not pretend Resend is configured.

## Website to extension connection

The separate v0.6.0 extension generates a 256-bit device credential locally. A pairing request returns an 80-bit one-time code valid for ten minutes. The user signs in on the canonical website, compares the code, and confirms that they started it in their installed extension. Only this deliberate account action binds a device. The code may travel in a URL fragment; the device credential never appears in a URL or website page. Credentials are hashed on the server and kept in trusted extension storage locally.

The extension API has no administrator capabilities. It can start/poll its own connection, refresh its own signed entitlement, and disconnect. Devices expire after 30 days and are capped at ten per account. Account pages list/revoke the user's own devices. Sign out all browsers also revokes devices. A new installation requires a new code but recovers the same account/subscription; local notes do not cloud-sync.

The backend reconciles Stripe via the existing service, then signs a maximum-ten-minute ES256 entitlement with issuer, audience, test environment, billing account and device hash. The extension verifies it against the pinned public key. It never trusts a return URL, local isPro flag, admin role or appearance import. This sandbox build disables the tester bypass. Signed Test Plus can unlock the selected static/Living world; cancellation/expiry returns to Free without deleting notes. Optional motion is never silently enabled by the purchase.

Refresh runs every five minutes for linked accounts, on explicit refresh, worker restart and return to the account website. Offline access cannot outlive signed expiry. Remote disconnect/revocation has a maximum ten-minute cached-access window; local disconnect clears access immediately. In-flight request generation checks prevent an old refresh from relinking a disconnected account. The optional host permission is only https://www.chatdrobe.com/* and requested when connecting.

## Migrations and scope

Reviewed additive migration 003_owner_devices follows 001/002 on production main. It adds owner bindings/session versions, devices and access audit, with no deletion or reclassification of previous purchases. It does not activate checkout, manufacture subscription credit, or copy owner secrets into the deployment.

The website still uses the validated Stripe default portal; no STRIPE_PORTAL_CONFIGURATION_ID has returned. Stripe account settings, Vercel private keys and database credentials are unchanged. The extension requires a server private key matching its pinned public verification key; do not overwrite an existing key just to match a build. Rebuild with the correct public key when necessary.

## Acceptance tests before a paid launch

1. Configure owner credentials and remaining Stripe test settings; create/configure the default portal with authorized access. Confirm the owner can sign in without Resend and starts Free.
2. Install v0.6.0, approve a device connection, and confirm that an owner role alone leaves Premium locked.
3. Select a Premium world, complete actual Stripe test Checkout, inspect signed webhook success, refresh and verify Test Plus. Apply the originally selected world with motion off.
4. Cancel at period end and confirm access through the paid period. Exercise failed payment/expiry, duplicate webhook delivery, local and remote disconnect, worker restart and a second-browser/new-install recovery. Test an offline expired lease.
5. Finish public verified signup, admin MFA/passkey hardening, live-mode billing review, terms/tax/refund/account-deletion requirements, installed ChatGPT compatibility, performance measurements and store submission. Store approval timing is outside application control.

## Evidence boundaries

Automated server integration uses actual PostgreSQL and HTTP plus simulated Stripe; it does not prove real webhook delivery. Browser account UI tests simulate API replies. Local extension tests use real cryptographic signatures and simulated Chrome messaging/network; local managed Chrome blocks extension installation, so no native installed-worker pass is claimed. The final report/PR checks list actual run results. No real sandbox payment has been represented as successful until its provider response and application state are observed.

Stripe portal creation was attempted with the connected sandbox during this milestone and denied for missing customer-portal write permission. That authorization must be resolved by the user or through dashboard configuration; this code is not a workaround around the connector denial.
