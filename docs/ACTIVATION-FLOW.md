# Clear connection and activation — v0.6.2

## Reported blocker
The user successfully approved an installation, then saw ACCESS_SIGNING_NOT_READY and a Free label. Production logs showed repeated /api/extension 503 requests. That specific error originates while loading BILLING_SIGNING_PRIVATE_KEY, before a Premium proof is issued. The user should not be asked to reconnect or purchase to repair server configuration.

## Server changes
A shared P-256 loader supports complete PEM, CRLF/literal-newline PEM, enclosing quotes and base64 PKCS#8 using the same existing variable. It does not generate a replacement key, infer keys from owner credentials or accept public/Stripe keys. Billing and complimentary admin use the same parser. Invalid keys remain fail-closed.

GET /api/extension?action=health reports only configured/ready/status and public key fingerprints. It does not access the database, provider, owner session, private material or user records. The expected release key ID is 665a83c1cc892eab, already pinned in v0.6.0–v0.6.2. Validity and compatibility are separate: a valid different key is explicitly key_mismatch. Runtime bundles include the new server-only module; no private material is copied to static files.

No environment write is performed by this PR. If the deployed variable is missing, the operator must put the existing matching private key in Vercel Production and redeploy. The key supplied earlier in this conversation was locally confirmed to match the extension's public fingerprint; it is not included in this public repository. Do not paste private values into issues or chat.

## Website flow
Code links retain #link=... through sign-in and fill the approval field automatically. The matching-code consent remains required. After approval, the form is hidden and activation status includes a one-click Open ChatGPT link when the current account has eligible access, a connection and matching signing configuration. Unknown/failed signing is displayed as setup required, not payment needed.

A Stripe checkout return initiates bounded server-side reconciliation (initial attempt plus at most three timed retries). The success state depends on server account access and registered devices, not the return flag. A Free result is payment-pending, not a successful purchase. Already-approved connections are reused after payment; a second code is not required. A website-only purchase with no linked installation prompts the user to connect the installed extension. The extension still verifies the actual device-bound signed proof before applying anything; the website UI is not an entitlement grant.

No automatic navigation away from user work. Open ChatGPT is an explicit action. Ordinary account visits without a link/checkout/extension flow do not start the success checker. No new cookies, local storage, transcript reads or third-party requests.

## Separate extension artifact
v0.6.2 is a conversation download, not remotely installed by the website merge. The code screen gives three visible steps, an Approve connection on ChatDrobe button with the current code already in its destination, expiry information and warning before replacing a code. The current link is reconstructed after worker restart from the existing credential state. Approval does not send the device credential in a URL.

Signing errors retain the paired account and display Connected — Premium setup required instead of an upsell. Network errors explain that the connection is saved. The success button verifies access, applies the pending world and focuses an existing ChatGPT tab or opens the homepage. No new permission, host, signing key or theme/scene change.

## Verification boundaries
Nine new pure Node signing/state tests ran locally. Extension regression tests and Chromium fixture evidence are recorded with the separate artifact. Repository CI must pass on the exact head before deployment. External provider responses in existing CI remain simulated; actual installed-user Premium verification and real Stripe checkout/webhook delivery are not implied. Billing remains off unless separately enabled by the authenticated operator.
