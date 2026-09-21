# Billing and extension access reliability

Updated 2026-09-21. These repairs leave live billing disabled. They do not complete a real Stripe integration test or a public launch gate.

## Signed access during temporary failures

The extension retains an already verified, device-bound proof on network failure, HTTP 408/425/429, and server errors. The proof's original expiry still applies; the client cannot create an offline grace period or renew access locally. The expiry alarm remains scheduled at the original timestamp.

HTTP 401 and 403 clear the device credential, proof and alarms, including when a proxy returns a non-JSON response. Other client errors invalidate the cached proof. A successful signed Free response still removes Premium immediately.

The connection credential still expires after 30 days. This change does not add rotating credentials or sliding renewal. Customer communication and a secure renewal design remain separate work.

## Device request limits

The HTTP boundary first applies a separate 120-per-minute client-IP admission budget. This bounds per-credential row creation and device lookups even when a caller rotates invented credentials. Direct/local hosting uses the socket peer; Vercel hosting uses its protected `x-vercel-forwarded-for` IP, with invalid headers falling back to the socket. User-supplied forwarding headers are not trusted outside Vercel.

Per-credential limits then execute before the shared limit. The service checks the current device/account record before admitting a request to the global entitlement/poll budget. Unknown, expired, disabled, revoked, unapproved entitlement requests and rotated owner credentials cannot consume that shared budget. Valid pending pairing polls remain limited and supported.

Pairing starts check the caller IP's limit before the global start budget. A caller already over its individual limit cannot keep spending shared capacity.

This ordering repairs shared-quota starvation and bounds device-lookup work per client; it is not DDoS protection. The IP admission meter itself uses the database. Distributed clients can still create work, users behind the same NAT share the IP budget, and fixed windows permit bursts across their boundary. Edge limits, alerting, capacity checks and retention remain necessary before public scale.

## Checkout retries and durable intent versions

New intents record `requestVersion: 2` before contacting Stripe. Their request omits `expires_at`, so Stripe applies its default 24-hour lifetime from actual session creation. Retry parameters and idempotency keys remain identical whether a request or its response was lost. New sessions use payment methods configured in the Stripe Dashboard; they do not send a hardcoded `payment_method_types` list.

Unknown outcomes stop before 23 hours from intent creation. The code never rotates an uncertain attempt to a fresh idempotency key. A verified known open session can still be reused directly.

Existing intents without `requestVersion` retain their previously sent request contract, including their absolute one-hour expiry and card method. An unknown legacy outcome at or beyond 30 minutes requires operator review instead of changing parameters or creating another session. A second deadline check after customer creation prevents delayed work from crossing that boundary unnoticed.

The existing Stripe API pin remains `2025-02-24.acacia`. Updating it requires changing and verifying the subscription/invoice contracts together. This repair does not silently migrate API shapes.

## Evidence and remaining gates

Run:

```sh
node --test browser-extension/tests/billing.test.cjs
npm --prefix server test
```

The regressions execute the real client, verifier and service code with signed fixture tokens, an in-memory store and simulated provider responses. They cover original hard expiry under throttling, malformed authorization-error responses, invalid-credential quota starvation, shared-cap enforcement, loss before Stripe execution, loss after session creation, legacy compatibility and bounded uncertain outcomes. Real localhost HTTP checks rotate credentials and spoof forwarding headers, then verify bounded device lookups and isolation between clients.

PostgreSQL integration checks run separately with a disposable database through `server/integration/*.test.mjs`. Neither suite proves real Stripe Checkout, webhook delivery, Dashboard payment-method configuration, customer-email delivery, production renewal or tax configuration. Before charging, complete real sandbox journeys, decide supported methods and retry/recovery operations, and settle tax registration/configuration. No automatic tax or provider settings are enabled by this repair.

Verified against primary documentation on 2026-09-21:

- [Pinned-version Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create?api-version=2025-02-24.acacia): optional expiry, 30-minute to 24-hour creation window, and 24-hour default.
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests): identical parameters are required; retained results can be pruned after at least 24 hours; validation failures do not save an executed result.
- [Dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods): Dashboard-controlled method availability.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for): platform-provided client IP and forwarding-header behavior.
