import {randomUUID} from 'node:crypto';
import {BillingError, approvedStripeUrl, clock, lease} from './security.mjs';

const objectId = value => typeof value === 'string' ? value : value?.id;
const validInstall = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const terminal = ['canceled', 'incomplete_expired'];
const worlds = new Set(['mooncat','circuit','comic','aurora','paper','midnight','forest','ocean','starlit','reactor','sentinel','arcade','rally','bridge','observatory']);
const supportedEvents = new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired',
  'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed',
  'charge.refunded','charge.dispute.created','charge.dispute.closed']);

/** Server authority only: the client never supplies a price, customer, subscription, or grant. */
export function billingService({config, store, stripe, now = clock}) {
  function matches(object, id, state) {
    return object?.livemode === false && object?.metadata?.chatdrobe_install === id &&
      object?.metadata?.chatdrobe_attempt === state.intent?.id && objectId(object.customer) === state.customerId;
  }
  async function synchronize(state, id) {
    if (state.sessionId) {
      const session = await stripe('/checkout/sessions/' + state.sessionId);
      if (!matches(session, id, state) || session.mode !== 'subscription') throw new BillingError('BINDING', 'Checkout ownership could not be verified.', 409);
      state.sessionStatus = session.status;
      if (session.status === 'complete' && objectId(session.subscription)) state.subscriptionId = objectId(session.subscription);
    }
    if (!state.subscriptionId) { state.status = 'free'; state.paidUntil = 0; return state; }
    // Fetch canonical provider state inside the row lock. Old events cannot overwrite it with old payloads.
    const sub = await stripe('/subscriptions/' + state.subscriptionId, {values: {'expand[]': ['latest_invoice.charge']}});
    if (!matches(sub, id, state)) throw new BillingError('BINDING', 'Subscription ownership could not be verified.', 409);
    const items = sub.items?.data || [];
    const invoice = sub.latest_invoice;
    const charge = invoice && typeof invoice === 'object' ? invoice.charge : null;
    state.status = sub.status;
    state.cancelAtPeriodEnd = sub.cancel_at_period_end === true;
    state.paidUntil = 0;
    const eligible = sub.status === 'active' && !sub.pause_collection && !sub.pending_update &&
      items.length === 1 && !sub.items.has_more && items[0].quantity === 1 && objectId(items[0].price) === config.priceId &&
      items[0].price?.livemode === false && invoice?.livemode === false && invoice.status === 'paid' && invoice.paid === true &&
      invoice.paid_out_of_band !== true && invoice.amount_paid > 0 && objectId(invoice.customer) === state.customerId;
    if (charge && typeof charge === 'object') {
      if (charge.disputed === true || charge.refunded === true) state.hold = 'refund_or_dispute';
    } else if (eligible) {
      // A paid flag without a verifiable card charge is not enough for this card-only pilot.
      state.status = 'payment_unverified';
    }
    if (eligible && charge && typeof charge === 'object' && charge.livemode === false && charge.paid === true &&
      charge.status === 'succeeded' && objectId(charge.customer) === state.customerId && !state.hold) {
      const end = Math.min(sub.current_period_end, sub.cancel_at || Infinity);
      if (Number.isSafeInteger(end) && end > now()) state.paidUntil = end;
    }
    state.verifiedAt = now();
    return state;
  }
  async function refresh(id) {
    const state = await store.mutate(id, async row => structuredClone(await synchronize(row, id)));
    return lease(config, id, state || {status: 'free'}, now());
  }
  async function checkout(id, requestedWorld = '') {
    if (typeof requestedWorld !== 'string' || (requestedWorld && !worlds.has(requestedWorld))) throw new BillingError('WORLD', 'Unknown world.');
    await store.limit('checkout:' + id, 10, 300, now());
    await store.limit('new-checkout-global', 100, 86400, now());
    const existing = await store.read(id);
    if (existing) await refresh(id);
    const price = await stripe('/prices/' + config.priceId);
    if (price.id !== config.priceId || price.livemode !== false || price.active !== true || price.type !== 'recurring' || price.recurring?.interval !== 'year' ||
      price.recurring?.interval_count !== 1 || price.unit_amount !== config.expectedAmount || price.currency !== config.expectedCurrency)
      throw new BillingError('PRICE_CONFIGURATION', 'Expected the USD 29 annual test price. Billing is not ready.', 503);
    // Commit an intent BEFORE contacting Stripe so a timeout/restart retries the identical purchase.
    const prepared = await store.mutate(id, async state => {
      if (state.hold) throw new BillingError('REVIEW_REQUIRED', 'Billing requires operator review before another checkout.', 409);
      if (state.subscriptionId && !terminal.includes(state.status))
        throw new BillingError('SUBSCRIPTION_EXISTS', 'A subscription already exists. Refresh access or open Manage billing.', 409);
      if (!state.intent || state.sessionStatus === 'expired' || (state.sessionStatus === 'complete' && terminal.includes(state.status))) {
        state.intent = {id: randomUUID(), created: now(), world: requestedWorld, priceId: config.priceId, origin: config.origin};
        state.sessionId = null; state.sessionStatus = null; state.subscriptionId = null; state.status = 'free'; state.paidUntil = 0;
      }
      if (now() - state.intent.created > 23 * 3600 && !state.sessionId)
        throw new BillingError('UNCERTAIN_CHECKOUT', 'An old checkout has an unknown outcome. Operator review is required; no new charge was created.', 409);
      if (state.intent.priceId !== config.priceId || state.intent.origin !== config.origin)
        throw new BillingError('CHECKOUT_CONFIGURATION_CHANGED', 'An existing checkout must be resolved before changing billing configuration.', 409);
      return structuredClone(state);
    }, {create: true});
    if (prepared.sessionId && prepared.sessionStatus === 'open') {
      const old = await stripe('/checkout/sessions/' + prepared.sessionId);
      if (old.status !== 'open' || !matches(old, id, prepared)) throw new BillingError('CHECKOUT_CHANGED', 'Checkout changed. Refresh access before retrying.', 409);
      return {url: approvedStripeUrl(old.url), environment: 'test', reused: true};
    }
    if (!prepared.customerId) {
      const customer = await stripe('/customers', {method: 'POST', idempotencyKey: `cd-test-customer-${id}`,
        values: {'metadata[chatdrobe_install]': id, description: 'ChatDrobe test installation'}});
      if (!/^cus_[A-Za-z0-9]+$/.test(customer.id || '') || customer.livemode !== false || customer.metadata?.chatdrobe_install !== id)
        throw new BillingError('BINDING', 'Test customer could not be verified.', 502);
      await store.mutate(id, state => {
        if (state.customerId && state.customerId !== customer.id) throw new BillingError('BINDING', 'Conflicting customer mapping.', 409);
        state.customerId = customer.id;
      });
      prepared.customerId = customer.id;
    }
    const intent = prepared.intent;
    const session = await stripe('/checkout/sessions', {method: 'POST', idempotencyKey: `cd-test-checkout-${id}-${intent.id}`,
      values: {mode: 'subscription', customer: prepared.customerId, 'payment_method_types[0]': 'card',
        'line_items[0][price]': intent.priceId, 'line_items[0][quantity]': 1,
        client_reference_id: id, expires_at: intent.created + 3600,
        'metadata[chatdrobe_install]': id, 'metadata[chatdrobe_attempt]': intent.id,
        'subscription_data[metadata][chatdrobe_install]': id, 'subscription_data[metadata][chatdrobe_attempt]': intent.id,
        success_url: intent.origin + '/api/billing?action=return', cancel_url: intent.origin + '/api/billing?action=return&cancelled=1'}});
    if (!/^cs_test_[A-Za-z0-9]+$/.test(session.id || '') || session.mode !== 'subscription' || !matches(session, id, prepared))
      throw new BillingError('BINDING', 'Test checkout could not be verified.', 502);
    await store.mutate(id, state => {
      if (state.intent.id !== intent.id || (state.sessionId && state.sessionId !== session.id)) throw new BillingError('CHECKOUT_CONFLICT', 'Checkout changed. Refresh before continuing.', 409);
      state.sessionId = session.id; state.sessionStatus = session.status;
    });
    if (session.status !== 'open') throw new BillingError('CHECKOUT_FINISHED', 'Checkout is already complete. Refresh access.', 409);
    return {url: approvedStripeUrl(session.url), environment: 'test', reused: false};
  }
  async function portal(id) {
    const state = await store.read(id);
    if (!state?.customerId) throw new BillingError('NO_CUSTOMER', 'This installation has no billing customer.', 409);
    const session = await stripe('/billing_portal/sessions', {method: 'POST', values: {customer: state.customerId, return_url: config.origin + '/api/billing?action=return'}});
    return {url: approvedStripeUrl(session.url, 'portal'), environment: 'test'};
  }
  async function webhook(event) {
    if (!supportedEvents.has(event.type)) return {ignored: true};
    let resource, id, charge;
    const obj = event.data.object;
    if (event.type.startsWith('checkout.')) {
      if (!/^cs_test_[A-Za-z0-9]+$/.test(obj.id || '')) throw new BillingError('RESOURCE', 'Invalid checkout resource.');
      resource = await stripe('/checkout/sessions/' + obj.id); id = resource.metadata?.chatdrobe_install;
    } else if (event.type.startsWith('customer.subscription.')) {
      if (!/^sub_[A-Za-z0-9]+$/.test(obj.id || '')) throw new BillingError('RESOURCE', 'Invalid subscription resource.');
      resource = await stripe('/subscriptions/' + obj.id); id = resource.metadata?.chatdrobe_install;
    } else if (event.type.startsWith('invoice.')) {
      if (!/^in_[A-Za-z0-9]+$/.test(obj.id || '')) throw new BillingError('RESOURCE', 'Invalid invoice resource.');
      const invoice = await stripe('/invoices/' + obj.id);
      const subId = objectId(invoice.subscription);
      if (!/^sub_[A-Za-z0-9]+$/.test(subId || '')) return {ignored: true};
      resource = await stripe('/subscriptions/' + subId); id = resource.metadata?.chatdrobe_install;
    } else {
      const chargeId = event.type.startsWith('charge.dispute.') ? objectId(obj.charge) : obj.id;
      if (!/^ch_[A-Za-z0-9]+$/.test(chargeId || '')) throw new BillingError('RESOURCE', 'Invalid charge resource.');
      charge = await stripe('/charges/' + chargeId);
      if (charge.livemode !== false) throw new BillingError('EVENT_MODE', 'Live payment rejected.');
      id = await store.findCustomer(objectId(charge.customer));
    }
    if (!validInstall(id)) return {ignored: true};
    const processed = await store.mutate(id, async state => {
      if (charge) {
        if (charge.refunded === true || charge.disputed === true) state.hold = 'refund_or_dispute';
        // Holds require review. A delayed dispute event must not silently clear a previous hold.
      } else {
        if (!matches(resource, id, state)) return {ignored: true}; // e.g. obsolete checkout attempt
        if (event.type.startsWith('checkout.')) { state.sessionId = resource.id; state.sessionStatus = resource.status; }
        else if (!state.subscriptionId) state.subscriptionId = resource.id;
      }
      await synchronize(state, id);
      return {processed: true};
    }, {eventId: event.id});
    return processed || {ignored: true};
  }
  return {checkout, refresh, portal, webhook};
}
