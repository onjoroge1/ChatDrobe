import {randomUUID} from 'node:crypto';
import {BillingError, clock, installationId, verifyWebhook} from './security.mjs';

async function rawBody(req, max) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > max) throw new BillingError('BODY_TOO_LARGE', 'Request body is too large.', 413);
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > max) throw new BillingError('BODY_TOO_LARGE', 'Request body is too large.', 413); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function json(res, status, value) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); }

export function createHandler(dependencies) {
  return async function handler(req, res) {
    const requestId = randomUUID();
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      const action = new URL(req.url, 'https://billing.invalid').searchParams.get('action');
      if (action === 'return' && req.method === 'GET') {
        // Pure informational page: no credentials, session IDs or URL flags can grant a license.
        res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to ChatDrobe</title><h1>Return to ChatDrobe</h1><p>This is a test billing flow. No live subscription was purchased.</p><p>Open the ChatDrobe extension and choose <strong>Refresh access</strong>. Only verified payment status can unlock Premium; visiting this page cannot.</p><p>After leaving checkout without paying, your Free workspace stays available.</p></html>'); return;
      }
      const {config, service, store} = await dependencies();
      if (action === 'health' && req.method === 'GET') {
        json(res, 200, {enabled: config.enabled, mode: config.enabled ? 'test' : 'off', livePayments: false}); return;
      }
      if (!config.enabled) throw new BillingError('BILLING_DISABLED', 'Test billing is not configured. No payment will be collected.', 503);
      const origin = req.headers.origin;
      if (origin && !config.extensionIds.some(id => origin === `chrome-extension://${id}`)) throw new BillingError('ORIGIN', 'Origin not permitted.', 403);
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.statusCode = 204; res.end(); return;
      }
      if (req.method !== 'POST') throw new BillingError('METHOD', 'Use POST for billing actions.', 405);
      if (action === 'webhook') {
        const event = verifyWebhook(await rawBody(req, 262144), req.headers['stripe-signature'], config.webhookSecret);
        json(res, 200, await service.webhook(event)); return;
      }
      if (!['checkout','entitlement','portal'].includes(action)) throw new BillingError('NOT_FOUND', 'Unknown billing action.', 404);
      const id = installationId(req.headers.authorization);
      // Durable global cap prevents unbounded state creation by rotating installation secrets.
      await store.limit('api-global', 600, 60, clock());
      await store.limit('api:' + id, 30, 60, clock());
      if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new BillingError('CONTENT_TYPE', 'Send application/json.', 415);
      const raw = await rawBody(req, 2048);
      let input;
      try { input = raw.length ? JSON.parse(raw.toString('utf8')) : {}; } catch { throw new BillingError('JSON', 'Invalid JSON.'); }
      if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(k => action !== 'checkout' || k !== 'world'))
        throw new BillingError('INPUT', 'Only the selected world may be supplied for checkout.');
      const result = action === 'checkout' ? await service.checkout(id, input.world) : action === 'portal' ? await service.portal(id) : await service.refresh(id);
      json(res, 200, result);
    } catch (error) {
      const known = error instanceof BillingError;
      if (!known) console.error('billing request failed', requestId); // Do not log payloads, auth headers, SQL, URLs or provider errors.
      json(res, known ? error.status : 503, {error: {code: known ? error.code : 'UNAVAILABLE', message: known ? error.message : 'Billing is temporarily unavailable. Please retry.', requestId}});
    }
  };
}
