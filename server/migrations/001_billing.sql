BEGIN;
CREATE TABLE IF NOT EXISTS chatdrobe_billing_installs (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS chatdrobe_customer_unique
  ON chatdrobe_billing_installs ((state->>'customerId')) WHERE state->>'customerId' IS NOT NULL;
CREATE TABLE IF NOT EXISTS chatdrobe_billing_events (
  id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL REFERENCES chatdrobe_billing_installs(id),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chatdrobe_billing_limits (
  name TEXT NOT NULL, bucket BIGINT NOT NULL, count INTEGER NOT NULL,
  PRIMARY KEY (name, bucket)
);
COMMIT;
