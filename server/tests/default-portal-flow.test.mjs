import test from 'node:test';
import assert from 'node:assert/strict';
import {accountPayments,paymentReadiness,resolveDefaultPortal,REQUIRED_EVENTS} from '../accounts-payments.mjs';
import {stripeClient} from '../stripe-client.mjs';
import {API_VERSION,hash} from '../security.mjs';
import {testConfig,memoryStore,fakeStripe} from './fakes.mjs';

function fixture(){
 const config=testConfig(),store=memoryStore(),provider=fakeStripe(),web={origin:config.origin,emailReady:true};
 const env={DATABASE_URL:config.databaseUrl,BILLING_MODE:'test',BILLING_ORIGIN:web.origin,STRIPE_SECRET_KEY:config.stripeSecret,STRIPE_WEBHOOK_SECRET:config.webhookSecret,STRIPE_PLUS_PRICE_ID:config.priceId,BILLING_SIGNING_PRIVATE_KEY:config.privateKey.export({format:'pem',type:'pkcs8'}),STRIPE_WEBHOOK_ENDPOINT_ID:'we_fixture'};
 // Regression trap: even an existing stale variable must never be read or used.
 Object.defineProperty(env,'STRIPE_PORTAL_CONFIGURATION_ID',{get(){throw Error('Removed environment variable was read');}});
 const portal={id:'bpc_default',object:'billing_portal.configuration',livemode:false,active:true,is_default:true,features:{subscription_cancel:{enabled:true,mode:'at_period_end'},payment_method_update:{enabled:true},invoice_history:{enabled:true},subscription_update:{enabled:false}}};
 const list={object:'list',data:[portal],has_more:false};
 provider.data.set('/billing_portal/configurations',list);
 provider.data.set('/webhook_endpoints/we_fixture',{id:'we_fixture',livemode:false,status:'enabled',url:web.origin+'/api/billing?action=webhook',api_version:API_VERSION,enabled_events:REQUIRED_EVENTS});
 let enabled=false;const writes=[];
 const accounts={enabled:async()=>enabled,activation:async(id,value)=>{writes.push({id,value});enabled=value;}};
 const payments=accountPayments({env,web,accounts,store,providerFactory:()=>provider.stripe});
 return {env,web,provider,portal,list,payments,writes,store,id:hash('verified-account')};
}

test('readiness drops the portal-ID setting entirely but preserves identity and mode gates',async()=>{
 const t=fixture(),r=paymentReadiness(t.env,t.web);assert.equal(r.ready,true);assert.equal(r.portalSelection,'stripe_default');assert.equal(Object.hasOwn(r.checks,'portal'),false);
 assert.equal(paymentReadiness(t.env,{...t.web,emailReady:false}).ready,false);
 const state=await t.payments.setup();assert.equal(state.enabled,false);assert.equal(t.provider.calls.length,0);
 await assert.rejects(t.payments.requireCheckout(),{code:'BILLING_DISABLED'});
});
test('activation discovers only the validated default and no provider settings are written',async()=>{
 const t=fixture();await t.payments.activate({id:'admin-fixture'},true);assert.deepEqual(t.writes,[{id:'admin-fixture',value:true}]);
 const call=t.provider.calls.find(c=>c.path==='/billing_portal/configurations');assert.deepEqual(call.options.values,{active:true,is_default:true,limit:2});
 assert.ok(t.provider.calls.every(c=>c.options.method!=='POST'));
 await t.payments.requireCheckout();assert.equal((await t.payments.status()).enabled,true);
});
test('no default means no activation and the error points to Stripe settings, not an env ID',async()=>{
 const t=fixture();t.list.data=[];
 await assert.rejects(t.payments.activate({id:'admin-fixture'},true),e=>e.code==='PORTAL_SETUP_REQUIRED'&&e.message.includes('default customer portal')&&!e.message.includes('bpc_'));
 assert.equal(t.writes.length,0);assert.equal((await t.payments.status()).enabled,false);
});
test('portal sessions bind the server customer and freshly validated default, even while checkout is paused',async()=>{
 const t=fixture();await t.store.mutate(t.id,s=>{s.customerId='cus_fixture';},{create:true});
 const {service}=await t.payments.dependencies();const result=await service.portal(t.id);
 assert.ok(result.url.startsWith('https://billing.stripe.com/'));
 let calls=t.provider.calls.filter(c=>c.path==='/billing_portal/sessions');assert.equal(calls.length,1);
 assert.deepEqual(calls[0].options.values,{customer:'cus_fixture',return_url:t.web.origin+'/account/',configuration:'bpc_default'});
 t.portal.id='bpc_newdefault';await service.portal(t.id);calls=t.provider.calls.filter(c=>c.path==='/billing_portal/sessions');assert.equal(calls[1].options.values.configuration,'bpc_newdefault');
 assert.equal((await t.payments.status()).enabled,false);
});
test('changed or unavailable portal blocks session creation without falling back to an unverified ID',async()=>{
 const t=fixture();await t.store.mutate(t.id,s=>{s.customerId='cus_fixture';},{create:true});
 const {service}=await t.payments.dependencies();await service.portal(t.id);t.portal.features.subscription_cancel.enabled=false;
 await assert.rejects(service.portal(t.id),{code:'PORTAL_SETUP_REQUIRED'});
 t.provider.data.delete('/billing_portal/configurations');await assert.rejects(service.portal(t.id));
 assert.equal(t.provider.calls.filter(c=>c.path==='/billing_portal/sessions').length,1);
});
test('a failed portal preflight remains retryable and does not replace the auth/price/webhook checks',async()=>{
 const t=fixture();t.list.data=[];await assert.rejects(t.payments.activate({id:'admin-fixture'},true),{code:'PORTAL_SETUP_REQUIRED'});
 t.list.data=[t.portal];t.provider.data.get('/prices/price_fixture').unit_amount=100;await assert.rejects(t.payments.activate({id:'admin-fixture'},true),{code:'PROVIDER_SETUP_REQUIRED'});assert.equal(t.writes.length,0);
 t.provider.data.get('/prices/price_fixture').unit_amount=2900;await t.payments.activate({id:'admin-fixture'},true);assert.equal((await t.payments.status()).enabled,true);
});
test('only GET collection discovery is allowed; the app cannot create/edit portal configuration',async()=>{
 let seen;const stripe=stripeClient('sk_test_fixture',async(url,options)=>{seen={url,options};return new Response(JSON.stringify(fixture().list),{status:200});});
 assert.equal(await resolveDefaultPortal(stripe),'bpc_default');const url=new URL(seen.url);
 assert.equal(url.pathname,'/v1/billing_portal/configurations');assert.equal(url.searchParams.get('is_default'),'true');assert.equal(url.searchParams.get('active'),'true');assert.equal(url.searchParams.get('limit'),'2');assert.equal(seen.options.headers['Stripe-Version'],API_VERSION);
 for(const method of ['POST','PATCH','PUT','DELETE'])await assert.rejects(stripe('/billing_portal/configurations',{method}),{code:'PROVIDER_PATH'});
 await assert.rejects(stripe('/billing_portal/configurations/../customers'),{code:'PROVIDER_PATH'});
});
