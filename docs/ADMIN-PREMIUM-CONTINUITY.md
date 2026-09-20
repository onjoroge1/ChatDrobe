# Admin Premium and remembered account continuity — v0.6.1

## Why v0.6.0 opened upgrade.html
The previous product policy deliberately required a Stripe subscription even for the owner. The user has explicitly changed that policy: current server-authorized admins receive complimentary Premium. The older extension also used a stale UI access snapshot when routing a locked theme click, creating an unnecessary upgrade-page stop before account refresh.

## Website/backend changes
The authenticated account profile now includes an access summary independently of its subscription record. Current admins show Admin Premium — complimentary. This creates no Stripe subscription, charge, paid-through balance or test-payment result. Admin listing labels distinguish complimentary access, and payment counts retain their actual subscription meaning.

The device entitlement endpoint reads the CURRENT account role and status from PostgreSQL. An active admin device receives a signed account/device-bound ES256 grant without calling Stripe or requiring billing activation. This still needs the existing BILLING_SIGNING_PRIVATE_KEY matching the extension's pinned public key. Missing or invalid signing configuration fails closed with an actionable message. No secret, email string or browser isAdmin flag can grant Premium.

Normal members retain the actual Stripe reconciliation path. Paid-period cancellation, failed payment and expiry behavior are unchanged. The returned proof identifies admin, stripe_test or free inside the signed claims. Both grant sources are capped at ten minutes and at device-connection expiry. Admin demotion, account disablement, owner-credential rotation and device revocation are checked again on subsequent refresh. A disconnected extension locks locally immediately.

Account sessions now last up to 30 days in protected server-side cookies; device connections retain their existing absolute 30-day expiry. This remembers identity, NOT a 30-day Premium boolean. Existing shorter sessions are not rewritten; sign in again once to receive the new duration. Administrative reads, setup and changes require authentication within the last 15 minutes. That step-up requirement does not disconnect the extension or prevent normal Premium theme use.

No new Vercel variable, migration, Stripe object, provider permission or pricing change is introduced. Public email signup remains unavailable while email delivery is deferred; owner authentication already configured is sufficient for the owner's complimentary-access test.

## Separate extension v0.6.1
The runtime package is supplied in the conversation, not committed to this website-only repository. It retains the original public signing key, all static themes, Quiet Living worlds and local data.

- Premium selection revalidates access before routing. A valid member's selection applies directly with no upgrade or payment tab.
- An unlinked user gets one account connection page instead of upgrade -> account. One-time matching-code confirmation still protects the first connection; merely being signed into a website cannot authorize an arbitrary extension silently.
- Returning from website login/approval refreshes access automatically; the originally requested theme is applied once verified. No motion is enabled implicitly.
- Device credentials survive panel closure and worker/browser restart. Five-minute refresh alarms and the maximum-ten-minute signed cache remain. A recently checked valid grant can be reused briefly; cached Free is refreshed on Premium selection so a new membership is not hidden.
- The active-member account page hides checkout/upgrade actions. Admin complimentary access is labeled separately from Test Plus. Ordinary account switch and disconnect remain explicit.
- Storage-driven UI updates do not rerender notes/prompts forms or discard unsaved text. Page-style runtime and permissions remain unchanged.

## Verification boundaries
Local extension Node tests, Chromium fixture tests and server pure-policy tests exercise the new cases. The revised CI integration uses real local HTTP, PostgreSQL and signature verification, with simulated email/Stripe providers: admin complimentary access is tested independently of an ordinary customer's signup -> checkout -> signed webhook -> Test Plus -> cancellation -> second-installation recovery. Never call an admin grant a successful payment test.

Check the PR's exact-head CI and delivered build report for executed counts. No owner password is used by this work to sign into the deployed account, and no real Stripe transaction, native extension IPC or signed-in ChatGPT browser run is implied by automated fixtures. A same-folder extension update preserves its stored link; an unlinked installation needs one approval. No launch date or completed paid release is claimed.
