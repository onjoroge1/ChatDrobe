import test from 'node:test';
import assert from 'node:assert/strict';
import {stripeClient} from '../stripe-client.mjs';
import {API_VERSION} from '../security.mjs';
test('Stripe adapter pins API version, encodes form data and reuses supplied idempotency keys',async()=>{
 let seen;const stripe=stripeClient('sk_test_fixture',async(url,options)=>{seen={url,options};return new Response(JSON.stringify({livemode:false,id:'cs_test_1'}),{status:200});});
 await stripe('/checkout/sessions',{method:'POST',idempotencyKey:'stable-key',values:{'line_items[0][price]':'price_1'}});
 assert.equal(seen.options.headers['Stripe-Version'],API_VERSION);assert.equal(seen.options.headers['Idempotency-Key'],'stable-key');
 assert.equal(new URLSearchParams(seen.options.body).get('line_items[0][price]'),'price_1');
 assert.equal(seen.options.redirect,'error');
});
test('provider errors do not disclose credentials, request bodies or Stripe response details',async()=>{
 const stripe=stripeClient('sk_test_fixture',async()=>new Response(JSON.stringify({error:{message:'private billing details'}}),{status:500}));
 await assert.rejects(stripe('/prices/price_1'),error=>!error.message.includes('private billing details'));
 const live=stripeClient('sk_test_fixture',async()=>new Response(JSON.stringify({livemode:true}),{status:200}));await assert.rejects(live('/prices/price_1'),{code:'LIVE_MODE_REJECTED'});
 await assert.rejects(stripe('/../../evil'));
});
