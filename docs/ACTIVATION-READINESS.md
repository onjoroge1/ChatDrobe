# Sign in → connect extension → apply world

Evidence checked 2026-09-27 against production and the build based on merged PR27. This is a readiness record, not a completed live-user acceptance claim.

## First live blocker

| Boundary | Observed evidence | Meaning |
| --- | --- | --- |
| Public sign-in | `GET /api/account?action=status` returned `signInAvailable:false`, `ownerLoginAvailable:true`, `livePayments:false` at 17:29 UTC. The sign-in page hides the email form and displays the setup message. | Email settings are missing or fail `webConfig()` validation. The public response does not identify which variable; the deployed secret values were not inspected. Owner login is separate. |
| Sending domain | Resend reported `chatdrobe.com` and its DKIM/SPF records as `failed`. A fresh verification was requested; the next read was `pending`. | Sending verification has not passed. A verification request does not change DNS or prove delivery. Direct DNS queries were unavailable in this workspace, so missing records versus incorrect records is not established. |
| Database | `GET /api/billing?action=database` returned configured, connected, schema ready at 17:29 UTC. | The read-only schema probe passed; this is not a successful sign-in transaction. |
| Extension signer | `GET /api/extension?action=health` returned ready and matching key `665a83c1cc892eab` at 17:29 UTC. | The earlier key-format blocker is resolved; an installed extension still must verify a device-bound proof. |

No email was sent, no production environment variables or DNS records were changed, and no payment or production deployment was performed during these checks. Available hosting connector operations did not expose environment editing; project-detail reads also returned a connector argument-validation error. No DNS-management connector is available.

## Complete the sending setup

1. In the authoritative DNS provider for `chatdrobe.com`, compare the sending records with the current Resend domain record set. The inspected set contains `resend._domainkey` TXT (copy the complete public key from Resend), `send` MX pointing to `feedback-smtp.us-east-1.amazonses.com` with priority 10, `send` TXT containing `v=spf1 include:amazonses.com ~all`, and `rsend` CNAME pointing to `send.forge.rmta.net`. Re-read Resend before editing in case its record set changes. Keep existing inbound mail routing; root-domain receiving MX is a separate feature and is not required for this outgoing login-code flow.
2. Wait for sending verification to pass. Resend's [verification guide](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying) covers exact hostnames, region mismatches, DNS-only CNAMEs and nameserver ownership. Do not replace unrelated mail records or use another project's verified domain to conceal the problem.
3. Configure server-only `AUTH_EMAIL_FROM="ChatDrobe <login@chatdrobe.com>"` and a valid `RESEND_API_KEY` authorized to send from this domain in the intended Vercel environment. `AUTH_ORIGIN` must match the actual account origin; production is `https://www.chatdrobe.com`. Use the hosting secret interface, not chat, source control, or a browser-visible prefix. These settings are independent of Stripe. A Resend connector installation does not configure the app.
4. Deploy the reviewed configuration through the normal release process, then check account status. `signInAvailable:true` proves syntax/configuration only; the provider may still reject delivery.
5. Use an authorized test recipient to request a real code, complete it in the same browser, and verify the remembered account. Check real delivery and resend/expired-code recovery. Do not certify this from mocked provider replies.

## What counts as activation

The selected world and motion choice stay in extension storage during website sign-in. A website approval authorizes the installation; it does not confirm that a proof was verified or that a scene is visible. An older linked installation is not evidence about the current browser.

The intended sequence is:

1. Select a world in the extension. If it needs Premium, keep that exact selection pending while connecting the account.
2. Sign in on ChatDrobe, compare the code displayed by the installed extension, and explicitly approve the connection. Preserve the validated link code and extension-flow marker across sign-in and account creation.
3. Return to the extension. Verify the server-issued, device-bound proof, then apply the pending selection. A Free account can connect successfully without receiving Premium or being told to buy again to fix a connection.
4. Open ChatGPT. Confirm that the content script acknowledges the current settings revision and selected experience, and distinguish visible output from loading, blocked, hidden or paused states. Honor reduced motion and available reading space.

The account website cannot grant Premium or acknowledge a page render. A failed installation-list refresh after successful approval must not undo the approval or make the user repeat it.

## Packaging failure found in the review

The old manifest omitted `living/art/svg-art.mjs`, `living/art/journey-art.mjs` and `living/art/world-art.mjs` from `web_accessible_resources`, although reachable Living World modules import them. Files existing in the ZIP and working in a same-origin preview do not establish that Chrome permits their use by the content-script import graph. The manifest now includes those dependencies and the new shared interior artwork module.

The source import-graph check and native unpacked-extension smoke cover that boundary. A browser fixture at a routed `chatgpt.com` URL is still not signed-in ChatGPT and does not test the live email service.

## Remaining acceptance

- Real public email sign-in followed by the current packaged extension's code approval, proof verification and visible selected world on signed-in ChatGPT.
- Free and eligible Premium accounts; server or network failure after approval; browser/service-worker restart; expired/revoked proof; reconnection with the pending world preserved.
- Short/long threads, sidebar states, typing/streaming, voice controls, 100/125/150% zoom, narrow windows and OS reduced motion.
- The supported install/update path and an approved package checksum. The website still has no published Store/download URL.
- Real Stripe sandbox lifecycle if paid access is to be offered. Live billing remains deliberately disabled in this implementation.

Automated regressions and fixture screenshots support their specific scenarios; they do not close these live acceptance items.
