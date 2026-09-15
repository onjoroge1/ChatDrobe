import {BillingError, hash} from './security.mjs';

/** A stable verified Auth user ID, not an email or browser fingerprint, owns billing. */
export function identityConfiguration(env = process.env) {
  const mode = env.BILLING_IDENTITY_MODE || 'installation';
  if (mode === 'installation') return {mode};
  if (mode !== 'account') throw new BillingError('AUTH_CONFIGURATION', 'Unsupported billing identity mode.', 503);
  let origin;
  try {
    const url = new URL(env.AUTH_SUPABASE_URL);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
        url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error();
    origin = url.origin;
  } catch { throw new BillingError('AUTH_CONFIGURATION', 'Configure the exact HTTPS Supabase project origin.', 503); }
  const publicKey = env.AUTH_SUPABASE_PUBLISHABLE_KEY || '';
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(publicKey))
    throw new BillingError('AUTH_CONFIGURATION', 'Configure a Supabase publishable key, not a service-role key.', 503);
  return {mode, origin, publicKey};
}
export function stableAccountId(origin, userId) {
  return hash(JSON.stringify(['chatdrobe-account-v1', origin, userId.toLowerCase()]));
}
export function accountAuthenticator(config, fetcher = fetch) {
  if (config.mode !== 'account') throw new BillingError('AUTH_CONFIGURATION', 'Account authentication is not configured.', 503);
  return async function authenticate(authorization) {
    if (typeof authorization !== 'string' || authorization.length > 8192 ||
        !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization))
      throw new BillingError('SIGN_IN_REQUIRED', 'Sign into your ChatDrobe account first.', 401);
    let response;
    try {
      response = await fetcher(config.origin + '/auth/v1/user', {
        method: 'GET', headers: {apikey: config.publicKey, Authorization: authorization},
        signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store'
      });
    } catch { throw new BillingError('AUTH_UNAVAILABLE', 'Sign-in verification is temporarily unavailable.', 503); }
    if (response.status === 401 || response.status === 403)
      throw new BillingError('SIGN_IN_REQUIRED', 'Your sign-in expired. Sign in again.', 401);
    if (!response.ok) throw new BillingError('AUTH_UNAVAILABLE', 'Sign-in verification is temporarily unavailable.', 503);
    let user;
    try {
      const text = await response.text();
      if (text.length > 65536) throw Error();
      user = JSON.parse(text);
    } catch { throw new BillingError('AUTH_UNAVAILABLE', 'Unexpected sign-in verification response.', 503); }
    const confirmed = Date.parse(user?.email_confirmed_at);
    if (!user || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(user.id || '') ||
        user.aud !== 'authenticated' || user.is_anonymous === true || user.deleted_at ||
        (Date.parse(user.banned_until) > Date.now()) || !Number.isFinite(confirmed) || confirmed > Date.now() ||
        typeof user.email !== 'string' || user.email.length > 320 || !user.email.includes('@'))
      throw new BillingError('VERIFIED_ACCOUNT_REQUIRED', 'Use a verified, non-anonymous email account.', 403);
    return Object.freeze({kind: 'account', id: stableAccountId(config.origin, user.id),
      issuer: config.origin, subject: user.id.toLowerCase(), email: user.email});
  };
}
export async function registerAccount(store, identity) {
  if (identity?.kind !== 'account') throw new BillingError('SIGN_IN_REQUIRED', 'A verified account is required.', 401);
  return store.mutate(identity.id, row => {
    const previous = row.identity;
    if (previous && (previous.kind !== 'account' || previous.issuer !== identity.issuer || previous.subject !== identity.subject))
      throw new BillingError('IDENTITY_CONFLICT', 'Account identity requires operator review.', 409);
    if (row.accountDisabled === true) throw new BillingError('ACCOUNT_DISABLED', 'Account access is disabled. Contact support.', 403);
    row.identity = {kind: 'account', issuer: identity.issuer, subject: identity.subject};
    return {id: identity.id, identityMode: 'account'};
  }, {create: true});
}
