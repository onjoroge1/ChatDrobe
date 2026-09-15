/* Browser-safe verifier shared with the future extension billing adapter.
 * Public keys must be pinned in a reviewed extension build, never accepted from a return URL.
 */
function bytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid token encoding.');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4-value.length%4)%4)), c=>c.charCodeAt(0));
}
export async function verifyLicense(token, {publicJwk, keyId, installationId, now = Math.floor(Date.now()/1000), environment = 'test'}) {
  if (typeof token !== 'string' || token.length > 4096 || environment !== 'test') throw new Error('Invalid test entitlement.');
  const parts = token.split('.'); if (parts.length !== 3) throw new Error('Invalid test entitlement.');
  const [h,p,s] = parts;
  const header = JSON.parse(new TextDecoder().decode(bytes(h))), payload = JSON.parse(new TextDecoder().decode(bytes(p)));
  if (header.alg !== 'ES256' || header.typ !== 'JWT' || header.kid !== keyId) throw new Error('Unknown signing key or algorithm.');
  if (publicJwk?.kty !== 'EC' || publicJwk.crv !== 'P-256' || publicJwk.d) throw new Error('Use a pinned public verification key.');
  const key = await crypto.subtle.importKey('jwk', publicJwk, {name:'ECDSA',namedCurve:'P-256'}, false, ['verify']);
  if (!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'}, key, bytes(s), new TextEncoder().encode(h+'.'+p))) throw new Error('Invalid entitlement signature.');
  if (payload.iss !== 'chatdrobe-billing-test' || payload.aud !== 'chatdrobe-extension' || payload.sub !== installationId || payload.environment !== environment ||
    !['free','plus'].includes(payload.plan) || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.iat > now+30 ||
    payload.exp <= now || payload.exp > payload.iat+600 || payload.exp <= payload.iat)
    throw new Error('Expired or mismatched entitlement.');
  return Object.freeze({premium:payload.plan==='plus',environment:payload.environment,expiresAt:payload.exp,installationId:payload.sub});
}
