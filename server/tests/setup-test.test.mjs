import test from 'node:test';
import assert from 'node:assert/strict';
import {setupTestPrice,TEST_LOOKUP_KEY} from '../setup-test.mjs';
const price={id:'price_test',livemode:false,active:true,type:'recurring',currency:'usd',unit_amount:2900,recurring:{interval:'year',interval_count:1,usage_type:'licensed'},billing_scheme:'per_unit',product:'prod_test',lookup_key:TEST_LOOKUP_KEY};
function fake(found=[]) {const calls=[];return{calls,fetcher:async(url,options)=>{
 calls.push({url,options});const path=new URL(url).pathname;
 return new Response(JSON.stringify(options.method==='GET'?{data:found,has_more:false}:path==='/v1/products'?{id:'prod_test',livemode:false,metadata:{chatdrobe_environment:'test'}}:price));
}};}
test('setup rejects live credentials without issuing a request',async()=>{
 const api=fake();for(const secret of ['','sk_live_rejected','pk_test_public','rk_live_rejected'])await assert.rejects(setupTestPrice({secret,fetcher:api.fetcher}));assert.equal(api.calls.length,0);
});
test('default setup reads the catalog but creates nothing',async()=>{
 const api=fake(),result=await setupTestPrice({secret:'sk_test_fixture',fetcher:api.fetcher});assert.equal(result.priceConfigured,false);assert.equal(api.calls.length,1);assert.equal(api.calls[0].options.method,'GET');assert.ok(!JSON.stringify(result).includes('sk_test_fixture'));
});
test('existing valid test price is reused without a write',async()=>{
 const api=fake([price]),result=await setupTestPrice({secret:'rk_test_fixture',create:true,fetcher:api.fetcher});assert.equal(result.STRIPE_PLUS_PRICE_ID,'price_test');assert.equal(api.calls.length,1);
});
test('explicit creation pins the annual USD29 fixture and idempotency keys',async()=>{
 const api=fake(),result=await setupTestPrice({secret:'sk_test_fixture',create:true,fetcher:api.fetcher});assert.equal(result.livePayments,false);assert.equal(api.calls.length,3);
 const form=new URLSearchParams(api.calls[2].options.body);assert.equal(form.get('unit_amount'),'2900');assert.equal(form.get('recurring[interval]'),'year');
 for(const call of api.calls.slice(1))assert.ok(call.options.headers['Idempotency-Key'].startsWith('chatdrobe-test-'));
 assert.ok(!JSON.stringify(result).includes('sk_test'));assert.ok(api.calls.every(c=>new URL(c.url).origin==='https://api.stripe.com'));
});
test('mismatched or inactive prices are not silently replaced',async()=>{
 for(const patch of [{currency:'eur'},{active:false},{livemode:true},{unit_amount:1}]){const api=fake([{...price,...patch}]);await assert.rejects(setupTestPrice({secret:'sk_test_fixture',create:true,fetcher:api.fetcher}));assert.equal(api.calls.length,1);}
 const api=fake([price,price]);await assert.rejects(setupTestPrice({secret:'sk_test_fixture',create:true,fetcher:api.fetcher}));
});
test('provider failures do not print keys or private bodies',async()=>{
 await assert.rejects(setupTestPrice({secret:'sk_test_fixture',fetcher:async()=>new Response('PRIVATE_BODY',{status:401})}),e=>!e.message.includes('PRIVATE_BODY')&&!e.message.includes('sk_test_fixture'));
});
