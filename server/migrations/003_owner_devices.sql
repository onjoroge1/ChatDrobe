CREATE TABLE IF NOT EXISTS public.chatdrobe_owner_bindings (
 account_id UUID PRIMARY KEY REFERENCES public.chatdrobe_accounts(id),
 credential_version TEXT NOT NULL CHECK(credential_version ~ '^[a-f0-9]{64}$')
);
CREATE TABLE IF NOT EXISTS public.chatdrobe_owner_sessions (
 token_hash TEXT PRIMARY KEY REFERENCES public.chatdrobe_sessions(token_hash) ON DELETE CASCADE,
 credential_version TEXT NOT NULL CHECK(credential_version ~ '^[a-f0-9]{64}$')
);
CREATE TABLE IF NOT EXISTS public.chatdrobe_extension_devices (
 credential_hash TEXT PRIMARY KEY CHECK(credential_hash ~ '^[a-f0-9]{64}$'),
 code_hash TEXT NOT NULL UNIQUE CHECK(code_hash ~ '^[a-f0-9]{64}$'),
 extension_id TEXT NOT NULL CHECK(extension_id ~ '^[a-p]{32}$'),
 account_id UUID REFERENCES public.chatdrobe_accounts(id),
 owner_version TEXT CHECK(owner_version ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL,
 linked_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ,
 last_seen TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS chatdrobe_devices_account ON public.chatdrobe_extension_devices(account_id);
CREATE TABLE IF NOT EXISTS public.chatdrobe_access_audit (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id UUID REFERENCES public.chatdrobe_accounts(id),
 action TEXT NOT NULL CHECK(action IN('owner_login','device_linked','device_revoked')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON public.chatdrobe_owner_bindings,public.chatdrobe_owner_sessions,public.chatdrobe_extension_devices,public.chatdrobe_access_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.chatdrobe_access_audit_id_seq FROM PUBLIC;
