import {pathToFileURL} from 'node:url';
import {API_VERSION, BillingError} from './security.mjs';

export const TEST_LOOKUP_KEY = 'chatdrobe_plus_annual_usd_2900_v1';
function validPrice(price) {
  return price?.livemode === false && /^price_[A-Za-z0-9]+$/.test(price.id || '') && price.active === true &&
    price.type === 'recurring' && price.currency === 'usd' && price.unit_amount === 2900 &&
    price.recurring?.interval === 'year' && price.recurring?.interval_count === 1 &&
    price.recurring?.usage_type === 'licensed' && price.billing_scheme === 'per_unit' &&
    /^prod_[A-Za-z0-9]+$/.test(typeof price.product === 'string' ? price.product : price.product?.id);
}
export async function setupTestPrice({secret, create = false, fetcher = fetch}) {
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(secret || ''))
    throw new BillingError('TEST_KEY_REQUIRED', 'Set a rotated Stripe test key in STRIPE_SECRET_KEY. Live keys are rejected.');
  const request = async (path, {method = 'GET', values = {}, idempotencyKey} = {}) => {
    const query = new URLSearchParams(values);
    const headers = {Authorization: 'Bearer ' + secret, 'Stripe-Version': API_VERSION};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';
    let response;
    try {
      response = await fetcher('https://api.stripe.com/v1' + path + (method === 'GET' ? '?' + query : ''),
        {method, headers, body: method === 'POST' ? query.toString() : undefined, redirect: 'error', signal: AbortSignal.timeout(10000)});
    } catch { throw new BillingError('STRIPE_UNREACHABLE', 'Stripe could not be reached. No credentials were printed.', 503); }
    if (!response.ok) throw new BillingError('STRIPE_REQUEST_FAILED', `Stripe returned HTTP ${response.status}. Check the test key permissions in Stripe.`, 502);
    let data;
    try { const text = await response.text(); if (text.length > 262144) throw Error(); data = JSON.parse(text); }
    catch { throw new BillingError('STRIPE_RESPONSE', 'Unexpected Stripe response.', 502); }
    if (data.livemode === true) throw new BillingError('LIVE_MODE_REJECTED', 'Live objects are forbidden.');
    return data;
  };
  const found = await request('/prices', {values: {'lookup_keys[]': TEST_LOOKUP_KEY, limit: '2'}});
  if (!Array.isArray(found.data) || found.has_more || found.data.length > 1)
    throw new BillingError('PRICE_AMBIGUOUS', 'Review the existing test price before continuing.');
  let price = found.data[0];
  if (price && (!validPrice(price) || price.lookup_key !== TEST_LOOKUP_KEY))
    throw new BillingError('PRICE_MISMATCH', 'The existing lookup key has different or inactive pricing. No replacement was created.');
  if (!price && !create) return {mode: 'test', keyAccepted: true, priceConfigured: false, next: 'Run with --create-price to create the USD 29/year test fixture.'};
  if (!price) {
    const product = await request('/products', {method: 'POST', idempotencyKey: 'chatdrobe-test-product-v1',
      values: {name: 'ChatDrobe Plus — TEST', 'metadata[chatdrobe_environment]': 'test', 'metadata[chatdrobe_catalog]': 'plus-v1'}});
    if (product.livemode !== false || !/^prod_[A-Za-z0-9]+$/.test(product.id || '') || product.metadata?.chatdrobe_environment !== 'test')
      throw new BillingError('PRODUCT_MISMATCH', 'The test product could not be verified.');
    price = await request('/prices', {method: 'POST', idempotencyKey: 'chatdrobe-test-price-' + TEST_LOOKUP_KEY,
      values: {product: product.id, currency: 'usd', unit_amount: '2900', 'recurring[interval]': 'year',
        'recurring[interval_count]': '1', 'recurring[usage_type]': 'licensed', lookup_key: TEST_LOOKUP_KEY}});
    if (!validPrice(price) || price.lookup_key !== TEST_LOOKUP_KEY) throw new BillingError('PRICE_MISMATCH', 'Created price did not match the test contract.');
  }
  return {mode: 'test', keyAccepted: true, priceConfigured: true,
    STRIPE_PLUS_PRICE_ID: price.id, productId: typeof price.product === 'string' ? price.product : price.product.id,
    amountUsd: 29, interval: 'year', livePayments: false};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--create-price')) { console.error('Usage: node server/setup-test.mjs [--create-price]. Supply credentials through environment settings only.'); process.exitCode = 1; }
  else try {
    console.log(JSON.stringify(await setupTestPrice({secret: process.env.STRIPE_SECRET_KEY, create: args.includes('--create-price')}), null, 2));
  } catch (error) { console.error(error instanceof BillingError ? error.message : 'Test setup failed. No credentials were printed.'); process.exitCode = 1; }
}
