import {createHash, createHmac, createPrivateKey, createPublicKey, sign, timingSafeEqual, randomUUID} from 'node:crypto';

export class BillingError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
export const API_VERSION = '2025-02-24.acacia';
export const ISSUER = 'chatdrobe-billing-test';
export const AUDIENCE = 'chatdrobe-extension';
export const LEASE_SECONDS = 600;
export const clock = () => Math.floor(Date.now() / 1000);
export const hash = value => createHash('sha256').update(value).digest('hex');

export function configuration(env = process.env) {
  if (!env.BILLING_MODE || env.BILLING_MODE === 'off') return {enabled: false};
  // Deliberately NO live-mode escape hatch in the first payment-testing milestone.
  if (env.BILLING_MODE !== 'test') throw new BillingError('TEST_ONLY', 'This release supports test billing only.', 503);
  if (!/^sk_test_[a-zA-Z0-9]+$/.test(env.STRIPE_SECRET_KEY || '')) throw new BillingError('CONFIGURATION', 'A Stripe test secret is required.', 503);
  if (!/^whsec_[a-zA-Z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET || '')) throw new BillingError('CONFIGURATION', 'A webhook signing secret is required.', 503);
  if (!/^price_[a-zA-Z0-9]+$/.test(env.STRIPE_PLUS_PRICE_ID || '')) throw new BillingError('CONFIGURATION', 'A test recurring Price ID is required.', 503);
  let origin, privateKey;
  try {
    const u = new URL(env.BILLING_ORIGIN);
    const local = !env.VERCEL && env.BILLING_ALLOW_LOCALHOST === 'true' && ['localhost', '127.0.0.1'].includes(u.hostname);
    if ((u.protocol !== 'https:' && !(local && u.protocol === 'http:')) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw Error();
    origin = u.origin;
    privateKey = createPrivateKey((env.BILLING_SIGNING_PRIVATE_KEY || '').replaceAll('\\n', '\n'));
    if (privateKey.asymmetricKeyType !== 'ec' || privateKey.asymmetricKeyDetails.namedCurve !== 'prime256v1') throw Error();
    if (!/^postgres(ql)?:\/\//.test(env.BILLING_DATABASE_URL || '')) throw Error();
  } catch { throw new BillingError('CONFIGURATION', 'Billing origin, database or P-256 signing key is not configured correctly.', 503); }
  const extensionIds = (env.BILLING_EXTENSION_IDS || '').split(',').filter(Boolean);
  if (!extensionIds.length || extensionIds.some(id => !/^[a-p]{32}$/.test(id))) throw new BillingError('CONFIGURATION', 'Allowlist the test extension ID before enabling billing.', 503);
  const publicJwk = createPublicKey(privateKey).export({format: 'jwk'});
  return {enabled: true, mode: 'test', origin, privateKey, publicJwk, keyId: hash(JSON.stringify(publicJwk)).slice(0, 16),
    stripeSecret: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, priceId: env.STRIPE_PLUS_PRICE_ID,
    databaseUrl: env.BILLING_DATABASE_URL, extensionIds, expectedAmount: 2900, expectedCurrency: 'usd'};
}

export function installationId(authorization) {
  // Each test installation generates its own 256-bit bearer secret. Never accept an ID as a credential.
  const secret = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization || '')?.[1];
  if (!secret || Buffer.from(secret, 'base64url').length !== 32 || Buffer.from(secret, 'base64url').toString('base64url') !== secret)
    throw new BillingError('UNAUTHORIZED', 'A valid installation credential is required.', 401);
  return hash(secret);
}

export function verifyWebhook(raw, header, secret, now = clock()) {
  if (!Buffer.isBuffer(raw) || raw.length > 262144 || typeof header !== 'string' || header.length > 2048)
    throw new BillingError('SIGNATURE', 'Invalid webhook payload or signature.');
  const pieces = header.split(',').map(s => s.split('='));
  const stamps = pieces.filter(([key]) => key === 't');
  const timestamp = Number(stamps[0]?.[1]);
  if (stamps.length !== 1 || !Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300)
    throw new BillingError('SIGNATURE', 'Invalid webhook payload or signature.');
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest();
  if (!pieces.some(([k, v]) => k === 'v1' && /^[a-f0-9]{64}$/.test(v || '') && timingSafeEqual(Buffer.from(v, 'hex'), expected)))
    throw new BillingError('SIGNATURE', 'Invalid webhook payload or signature.');
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { throw new BillingError('PAYLOAD', 'Invalid webhook JSON.'); }
  if (event.livemode !== false || event.api_version !== API_VERSION || !/^evt_[A-Za-z0-9]+$/.test(event.id || '') || !event.data?.object)
    throw new BillingError('EVENT_MODE', 'Only test events using the configured API version are accepted.');
  return event;
}

export function lease(config, id, state, now = clock()) {
  const plus = state.status === 'active' && state.paidUntil > now && !state.hold;
  const payload = {iss: ISSUER, aud: AUDIENCE, sub: id, environment: 'test', plan: plus ? 'plus' : 'free',
    iat: now, exp: plus ? Math.min(now + LEASE_SECONDS, state.paidUntil) : now + LEASE_SECONDS, jti: randomUUID()};
  const header = {alg: 'ES256', typ: 'JWT', kid: config.keyId};
  const encoded = [header, payload].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  const signature = sign('sha256', Buffer.from(encoded), {key: config.privateKey, dsaEncoding: 'ieee-p1363'}).toString('base64url');
  return {token: `${encoded}.${signature}`, environment: 'test', plan: payload.plan, expiresAt: payload.exp,
    status: state.hold ? 'review_required' : state.status || 'free', cancelAtPeriodEnd: state.cancelAtPeriodEnd === true};
}

export function approvedStripeUrl(value, kind = 'checkout') {
  let u; try { u = new URL(value); } catch { throw new BillingError('PROVIDER_RESPONSE', 'Invalid provider URL.', 502); }
  const host = kind === 'portal' ? 'billing.stripe.com' : 'checkout.stripe.com';
  if (u.protocol !== 'https:' || u.hostname !== host || u.port || u.username || u.password)
    throw new BillingError('PROVIDER_RESPONSE', 'Invalid provider URL.', 502);
  return u.href;
}
