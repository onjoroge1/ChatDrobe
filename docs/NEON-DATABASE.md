# Neon database integration

The owner selected Neon and already saved DATABASE_URL in Vercel. This change uses that server-side variable; no real connection string, hostname, password or customer record is copied into this repository. Rotate credentials exposed outside the secret settings. Redeploy after replacing a Vercel variable.

## Configuration

- DATABASE_URL: primary PostgreSQL connection string, supplied through server environment settings.
- BILLING_DATABASE_URL: supported only as a legacy fallback. If both are set to different values, configuration fails closed instead of silently using an old password or another database. Prefer keeping only DATABASE_URL.
- DATABASE_URL_UNPOOLED: optional direct endpoint for the same database when runtime uses Neon's pooled URL. The code checks matching database/endpoint before migration. Do not add it unless needed.
- BILLING_MODE remains off. A working database is not authorization to start charging or a completed login system.

The existing pg 8.16.3 driver is retained. Remote connections verify TLS certificates/hostnames, require TLS 1.2+, use a three-connection pool and bounded connect/query timeouts. URL sslmode does not override those verification settings. The driver is explicitly configured with enableChannelBinding so it negotiates SCRAM-SHA-256-PLUS when offered. Its boolean is *not* strict libpq channel_binding=require enforcement; we do not claim otherwise. No driver downgrade to insecure TLS is used.

The user's direct Neon URL is supported. Before a high-traffic release, use Neon's generated pooled runtime URL and retain a direct migration URL only when necessary. No hostname is silently rewritten and no second database provider is required. User authentication is separate: the existing Auth helper remains unwired. Neon storage does not itself implement sign-in, verified account recovery or Premium entitlement integration.

## Initial schema release

The requested database setup is a dedicated release job **after** static/function packaging, not an HTTP endpoint and not normal request startup.

It runs only when all of these match: VERCEL=1/true, VERCEL_ENV=production, Git branch main, owner onjoroge1, repository ChatDrobe. Preview, fork and local builds skip it even if DATABASE_URL is present. Production with a missing or conflicting URL fails the new deployment instead of replacing the working site with a broken billing schema.

Only the previously reviewed migration server/migrations/001_billing.sql is enabled. The runner does not discover or apply arbitrary future migrations. A transaction-scoped advisory lock serializes concurrent deployments. A history checksum prevents reinterpreting an already-applied migration; schema checks verify columns, types, primary keys, the foreign key and customer uniqueness. Existing compatible pilot rows are preserved. An incompatible schema fails and rolls back; it is never dropped or automatically repaired.

Tables:
- public.chatdrobe_billing_installs — existing pilot billing identity, Stripe identifiers, checkout/subscription/access state; future verified account metadata can be attached by the account integration.
- public.chatdrobe_billing_events — atomic webhook deduplication records.
- public.chatdrobe_billing_limits — rate-limit counters.
- public.chatdrobe_billing_schema_migrations — version/checksum/applied timestamp.

Only these four tables have PUBLIC privileges revoked. No unrelated schema, role, database or user record is changed. Use a least-privilege application role for a commercial release; the owner connection can bootstrap the pilot. Login/account mapping, recovery, data-retention jobs and production billing remain separate work. No passwords, auth tokens, payment card details or conversations belong in billing state.

Manual commands, with secrets supplied only through a trusted server environment:

```
npm run install:billing
npm run db:migrate
npm run db:status
```

## Read-only deployed verification

```
GET /api/billing?action=database
```

A ready schema returns HTTP 200:

```
{"configured":true,"connected":true,"schemaReady":true,"status":"ready"}
```

Missing configuration, connection errors and pending schema return 503 with booleans/a short status only. No host, connection string, SQL, user list or billing record is returned. Queries run inside a READ ONLY transaction. Concurrent probes are coalesced, and results cached for 60 seconds per function instance; public HTTP responses remain no-store. Add edge health-route rate protection as traffic grows. The existing action=health response and all payment gates are unchanged.

Readiness works while billing is off and does not require Stripe keys. It never applies migrations. Runtime packaging includes only the new config/schema/probe modules; migration scripts and SQL remain outside the deployed function and all server source remains outside static output.

## Tests / acceptance

Unit tests cover alias compatibility, conflicting secrets, safe errors, TLS options, optional direct URL checks, release gates, read-only probes, concurrent probe coalescing and existing HTTP payment behavior. The existing PostgreSQL CI integration glob runs additional isolated-database tests: first migration, concurrent application, repeated deploy, legacy-record preservation, checksum mismatch, rollback on schema drift, PUBLIC ACL and readiness. Those tests refuse remote databases.

Local tests exercise mocked database responses, not a real Neon connection. Final evidence must be the production release log plus a fresh JSON readiness response on www.chatdrobe.com. Neither an environment variable nor HTTP liveness alone proves a database is configured. This milestone does not create a Stripe payment, Auth user, paid subscriber or a new extension ZIP.

Primary references:
- https://node-postgres.com/features/ssl
- https://node-postgres.com/features/transactions
- https://neon.com/docs/connect/connection-pooling
- https://vercel.com/docs/environment-variables
