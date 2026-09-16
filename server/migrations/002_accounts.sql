-- Additive account state. An admin is claimed only AFTER email ownership is verified.
CREATE TABLE IF NOT EXISTS public.chatdrobe_accounts (
 id UUID PRIMARY KEY,email TEXT NOT NULL UNIQUE CHECK(email=lower(email) AND length(email) BETWEEN 3 AND 254),
 billing_id TEXT NOT NULL UNIQUE CHECK(billing_id ~ '^[a-f0-9]{64}$'),role TEXT NOT NULL DEFAULT 'user' CHECK(role IN('user','admin')),
 verified_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),last_login_at TIMESTAMPTZ NOT NULL,disabled_at TIMESTAMPTZ,accepted_beta_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS public.chatdrobe_login_challenges (
 nonce_hash TEXT PRIMARY KEY CHECK(nonce_hash ~ '^[a-f0-9]{64}$'),code_hash TEXT NOT NULL CHECK(code_hash ~ '^[a-f0-9]{64}$'),email TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN('signup','signin')),attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),expires_at TIMESTAMPTZ NOT NULL,consumed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chatdrobe_login_expiry ON public.chatdrobe_login_challenges(expires_at);
CREATE TABLE IF NOT EXISTS public.chatdrobe_sessions (token_hash TEXT PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),account_id UUID NOT NULL REFERENCES public.chatdrobe_accounts(id),authenticated_at TIMESTAMPTZ NOT NULL,expires_at TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS chatdrobe_sessions_account ON public.chatdrobe_sessions(account_id);
CREATE TABLE IF NOT EXISTS public.chatdrobe_admin_invites (email_hash TEXT PRIMARY KEY CHECK(email_hash ~ '^[a-f0-9]{64}$'),claimed_by UUID UNIQUE REFERENCES public.chatdrobe_accounts(id),claimed_at TIMESTAMPTZ);
-- Digest of the owner email explicitly nominated for this repository. It is not a login credential.
INSERT INTO public.chatdrobe_admin_invites(email_hash) VALUES('43e81ed44741dc161c7b2e754de83c23410f6b13c345a40ef737b16b68aaa983') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.chatdrobe_account_audit (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor UUID REFERENCES public.chatdrobe_accounts(id),action TEXT NOT NULL CHECK(action IN('admin_claimed','admin_users_read','test_checkout_enabled','test_checkout_disabled','signed_out_all')),created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.chatdrobe_app_settings (key TEXT PRIMARY KEY,value JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO public.chatdrobe_app_settings(key,value) VALUES('test_checkout','false'::jsonb) ON CONFLICT DO NOTHING;
REVOKE ALL ON public.chatdrobe_accounts,public.chatdrobe_login_challenges,public.chatdrobe_sessions,public.chatdrobe_admin_invites,public.chatdrobe_account_audit,public.chatdrobe_app_settings FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.chatdrobe_account_audit_id_seq FROM PUBLIC;
