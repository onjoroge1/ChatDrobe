import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PORTAL_QUERY, defaultPortalId} from '../portal-config.mjs';

function fixture() {
  return {object: 'list', has_more: false, data: [{
    id: 'bpc_default', object: 'billing_portal.configuration',
    active: true, is_default: true, livemode: false,
    features: {
      subscription_cancel: {enabled: true, mode: 'at_period_end'},
      payment_method_update: {enabled: true}, invoice_history: {enabled: true},
      subscription_update: {enabled: false}
    }
  }]};
}

test('default portal lookup is bounded and read-only, with a pinned validated result', () => {
  assert.deepEqual(DEFAULT_PORTAL_QUERY, {active: true, is_default: true, limit: 2});
  assert.ok(Object.isFrozen(DEFAULT_PORTAL_QUERY));
  const response = fixture(), before = structuredClone(response);
  assert.equal(defaultPortalId(response), 'bpc_default');
  assert.deepEqual(response, before);
});
for (const [name, mutate] of [
  ['missing default', r => {r.data = [];}],
  ['multiple defaults', r => {r.data.push(structuredClone(r.data[0]));}],
  ['incomplete list', r => {r.has_more = true;}],
  ['missing pagination status', r => {delete r.has_more;}],
  ['wrong list kind', r => {r.object = 'other';}],
  ['wrong resource kind', r => {r.data[0].object = 'customer';}],
  ['inactive portal', r => {r.data[0].active = false;}],
  ['non-default portal', r => {r.data[0].is_default = false;}],
  ['live portal', r => {r.data[0].livemode = true;}],
  ['unspecified environment', r => {delete r.data[0].livemode;}],
  ['malformed ID', r => {r.data[0].id = 'bpc_bad/path';}],
  ['cancellation off', r => {r.data[0].features.subscription_cancel.enabled = false;}],
  ['immediate cancellation', r => {r.data[0].features.subscription_cancel.mode = 'immediately';}],
  ['card updates off', r => {r.data[0].features.payment_method_update.enabled = false;}],
  ['invoice access off', r => {r.data[0].features.invoice_history.enabled = false;}],
  ['plan changes on', r => {r.data[0].features.subscription_update.enabled = true;}],
  ['missing plan change policy', r => {delete r.data[0].features.subscription_update;}],
  ['missing features', r => {delete r.data[0].features;}],
  ['empty record', r => {r.data = [null];}]
]) test(`rejects ${name} rather than silently opening unsafe billing management`, () => {
  const response = fixture(); mutate(response); assert.equal(defaultPortalId(response), null);
});
test('malformed responses fail closed without exposing provider contents', () => {
  for (const value of [null, undefined, {}, [], {object: 'list', has_more: false, data: {}}])
    assert.equal(defaultPortalId(value), null);
});
