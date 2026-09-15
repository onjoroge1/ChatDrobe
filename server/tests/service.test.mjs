import test from 'node:test';
import assert from 'node:assert/strict';
import {billingService} from '../billing-service.mjs';
import {hash,API_VERSION} from '../security.mjs';
import {testConfig,memoryStore,fakeStripe} from './fakes.mjs';
export function setup(store=memoryStore()){
 const config=testConfig(),provider=fakeStripe(),id=hash('installation-secret'),now=1700000000;
 const service=billingService({config,store,stripe:provider.stripe,now:()=>now});
 return {config,provider,id,now,store,service};
}
function event(type,id,resource){return{id,api_version:API_VERSION,livemode:false,type,data:{object:resource}};}
async function subscribed(){const t=setup();await t.service.checkout(t.id,'starlit');const state=await t.store.read(t.id);t.sub=t.provider.pay(state.sessionId,t.now);return t;}
test('checkout uses fixed server-side recurring price and exact installation metadata',async()=>{
 const t=setup();await t.service.checkout(t.id,'starlit');
 const call=t.provider.calls.find(c=>c.path==='/checkout/sessions');
 assert.equal(call.options.values['line_items[0][price]'],'price_fixture');assert.equal(call.options.values['line_items[0][quantity]'],1);
 assert.equal(call.options.values['metadata[chatdrobe_install]'],t.id);assert.equal(call.options.values.mode,'subscription');
 assert.ok(!call.options.values.success_url.includes('secret'));assert.equal((await t.service.refresh(t.id)).plan,'free');
});
test('two concurrent checkout clicks create one provider session using a durable intent',async()=>{
 const t=setup();await Promise.all([t.service.checkout(t.id,'starlit'),t.service.checkout(t.id,'reactor')]);
 assert.equal([...t.provider.data.keys()].filter(k=>k.startsWith('/checkout/sessions/')).length,1);
 assert.equal([...t.provider.data.keys()].filter(k=>k.startsWith('/customers/')).length,1);
});
test('provider timeout after creating checkout is retried with the identical idempotency key',async()=>{
 const t=setup();let failed=false;
 const unreliable=async(path,options)=>{const result=await t.provider.stripe(path,options);if(path==='/checkout/sessions'&&!failed){failed=true;throw Error('lost response');}return result;};
 const first=billingService({config:t.config,store:t.store,stripe:unreliable,now:()=>t.now});
 await assert.rejects(first.checkout(t.id,'starlit'));
 const intent=(await t.store.read(t.id)).intent.id;await t.service.checkout(t.id,'reactor');
 assert.equal((await t.store.read(t.id)).intent.id,intent);assert.equal([...t.provider.data.keys()].filter(k=>k.startsWith('/checkout/sessions/')).length,1);
});
test('server verification unlocks a completed paid subscription without trusting a return URL',async()=>{
 const t=await subscribed();const result=await t.service.refresh(t.id);assert.equal(result.plan,'plus');
 await assert.rejects(t.service.checkout(t.id),{code:'SUBSCRIPTION_EXISTS'});
 assert.equal((await t.service.refresh(hash('another-install'))).plan,'free');
});
test('payment failures, cancellations, pause collection and void invoices revoke access',async()=>{
 const t=await subscribed();assert.equal((await t.service.refresh(t.id)).plan,'plus');
 const canonical=t.provider.data.get('/subscriptions/'+t.sub.id);
 for(const status of ['past_due','unpaid','canceled','incomplete','trialing','paused']){canonical.status=status;assert.equal((await t.service.refresh(t.id)).plan,'free',status);}
 canonical.status='active';canonical.pause_collection={behavior:'void'};assert.equal((await t.service.refresh(t.id)).plan,'free');
 canonical.pause_collection=null;canonical.latest_invoice.status='void';assert.equal((await t.service.refresh(t.id)).plan,'free');
});
test('cancel-at-period-end retains paid access only up to the period boundary',async()=>{
 const t=await subscribed();t.provider.data.get('/subscriptions/'+t.sub.id).cancel_at_period_end=true;
 const result=await t.service.refresh(t.id);assert.equal(result.plan,'plus');assert.equal(result.cancelAtPeriodEnd,true);
 t.provider.data.get('/subscriptions/'+t.sub.id).current_period_end=t.now;assert.equal((await t.service.refresh(t.id)).plan,'free');
});
test('wrong product, wrong quantity and customer mismatches fail closed',async()=>{
 const t=await subscribed();const s=t.provider.data.get('/subscriptions/'+t.sub.id);
 s.items.data[0].price.id='price_other';assert.equal((await t.service.refresh(t.id)).plan,'free');
 s.items.data[0].price.id='price_fixture';s.items.data[0].quantity=2;assert.equal((await t.service.refresh(t.id)).plan,'free');
 s.items.data[0].quantity=1;s.customer='cus_other';await assert.rejects(t.service.refresh(t.id),{code:'BINDING'});
});
test('duplicate webhook events settle once, and out-of-order payloads use canonical Stripe state',async()=>{
 const t=await subscribed();const e=event('customer.subscription.updated','evt_dup',{id:t.sub.id,status:'past_due'});
 const results=await Promise.all([t.service.webhook(e),t.service.webhook(e)]);
 assert.equal(results.filter(x=>x.processed).length,1);assert.equal(results.filter(x=>x.duplicate).length,1);
 assert.equal((await t.service.refresh(t.id)).plan,'plus');
 t.provider.data.get('/subscriptions/'+t.sub.id).status='canceled';
 await t.service.webhook(event('customer.subscription.updated','evt_late',{id:t.sub.id,status:'active'}));
 assert.equal((await t.service.refresh(t.id)).plan,'free');
});
test('failed webhook transactions remain retryable rather than poisoning idempotency',async()=>{
 const t=await subscribed();const e=event('customer.subscription.updated','evt_retry',{id:t.sub.id});
 let lookups=0;const broken=async(...args)=>{if(++lookups===3)throw Error('transient');return t.provider.stripe(...args);};
 const first=billingService({config:t.config,store:t.store,stripe:broken,now:()=>t.now});
 await assert.rejects(first.webhook(e));assert.ok(!t.store.events.has(e.id));assert.equal((await t.service.webhook(e)).processed,true);
});
test('full refunds and disputes create review holds that cannot be bypassed with checkout',async()=>{
 const t=await subscribed();const charge=t.provider.data.get('/charges/'+t.sub.latest_invoice.charge.id);charge.refunded=true;
 await t.service.webhook(event('charge.refunded','evt_refund',{id:charge.id}));assert.equal((await t.service.refresh(t.id)).plan,'free');
 await assert.rejects(t.service.checkout(t.id),{code:'REVIEW_REQUIRED'});
});
test('billing portal uses authenticated customer mapping, not a client-supplied customer ID',async()=>{
 const t=await subscribed();assert.match((await t.service.portal(t.id)).url,/billing.stripe.com/);
 const call=t.provider.calls.find(c=>c.path==='/billing_portal/sessions');assert.equal(call.options.values.customer,t.sub.customer);
 await assert.rejects(t.service.portal(hash('other')),{code:'NO_CUSTOMER'});
});
test('unknown old checkout outcome older than idempotency retention cannot create another charge',async()=>{
 const t=setup();await t.store.mutate(t.id,state=>{state.intent={id:'old',created:t.now-86400,origin:t.config.origin,priceId:t.config.priceId};},{create:true});
 await assert.rejects(t.service.checkout(t.id),{code:'UNCERTAIN_CHECKOUT'});
});
