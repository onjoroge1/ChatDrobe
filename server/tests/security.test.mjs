import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac, randomBytes, verify} from 'node:crypto';
import {configuration, installationId, verifyWebhook, lease, API_VERSION, approvedStripeUrl, hash} from '../security.mjs';
import {testConfig} from './fakes.mjs';

test('billing defaults off and rejects live mode or live keys',()=>{
 assert.deepEqual(configuration({}),{enabled:false});
 assert.throws(()=>configuration({BILLING_MODE:'live'}),/test billing only/);
 assert.throws(()=>configuration({BILLING_MODE:'test',STRIPE_SECRET_KEY:'sk_live_FORBIDDEN'}),/test secret/);
});
test('installation credentials are 256-bit canonical secrets, never public installation IDs',()=>{
 const secret=randomBytes(32).toString('base64url');
 assert.equal(installationId('Bearer '+secret),hash(secret));
 for(const value of ['',secret,'Bearer '+hash(secret),'Bearer undefined','Basic '+secret,'Bearer '+secret+'='])assert.throws(()=>installationId(value));
});
function signedEvent(now=1700000000){
 const body=Buffer.from(JSON.stringify({id:'evt_test1',api_version:API_VERSION,livemode:false,type:'invoice.paid',data:{object:{id:'in_123'}}}));
 const mac=createHmac('sha256','whsec_fixture').update(`${now}.`).update(body).digest('hex');
 return {body,header:`t=${now},v1=${mac}`,now};
}
test('webhook verifies exact raw bytes and bounded timestamp',()=>{
 const {body,header,now}=signedEvent();assert.equal(verifyWebhook(body,header,'whsec_fixture',now).id,'evt_test1');
 assert.throws(()=>verifyWebhook(Buffer.from(body+' '),header,'whsec_fixture',now));
 assert.throws(()=>verifyWebhook(body,header,'whsec_wrong',now));
 assert.throws(()=>verifyWebhook(body,header,'whsec_fixture',now+301));
 assert.throws(()=>verifyWebhook(body,header,'whsec_fixture',now-301));
 assert.throws(()=>verifyWebhook(body,header+`,t=${now}`,'whsec_fixture',now));
});
test('webhooks accept rotated v1 signatures but reject wrong mode and API version',()=>{
 const {body,header,now}=signedEvent();assert.equal(verifyWebhook(body,header+',v1='+'a'.repeat(64),'whsec_fixture',now).id,'evt_test1');
 for(const patch of [{livemode:true},{api_version:'2026-unexpected'},{id:'not-an-event'}]){
  const bytes=Buffer.from(JSON.stringify({...JSON.parse(body),...patch}));
  const mac=createHmac('sha256','whsec_fixture').update(`${now}.`).update(bytes).digest('hex');
  assert.throws(()=>verifyWebhook(bytes,`t=${now},v1=${mac}`,'whsec_fixture',now));
 }
});
test('leases are real ES256 signatures, installation-bound and expire within ten minutes',()=>{
 const config=testConfig(),now=1700000000,id=hash('installation');
 const result=lease(config,id,{status:'active',paidUntil:now+2000},now);
 const [h,p,sig]=result.token.split('.'),payload=JSON.parse(Buffer.from(p,'base64url'));
 assert.equal(payload.sub,id);assert.equal(payload.plan,'plus');assert.equal(payload.environment,'test');assert.equal(payload.exp,now+600);
 assert.ok(verify('sha256',Buffer.from(h+'.'+p),{key:config.privateKey,dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url')));
 assert.ok(!verify('sha256',Buffer.from(h+'.'+p+'a'),{key:config.privateKey,dsaEncoding:'ieee-p1363'},Buffer.from(sig,'base64url')));
 assert.equal(lease(config,id,{status:'active',paidUntil:now+10},now).expiresAt,now+10);
});
test('expired, unpaid, trialing and review-held records never receive a Plus lease',()=>{
 const config=testConfig(),now=1700000000;
 for(const state of [{status:'free'},{status:'active',paidUntil:now},{status:'active',paidUntil:now+900,hold:'refund'}, {status:'past_due',paidUntil:now+900},{status:'trialing',paidUntil:now+900}])
  assert.equal(lease(config,hash('install'),state,now).plan,'free');
});
test('only exact Stripe checkout and portal hosts are accepted',()=>{
 assert.equal(approvedStripeUrl('https://checkout.stripe.com/c/pay/test'),'https://checkout.stripe.com/c/pay/test');
 for(const url of ['https://checkout.stripe.com.evil.test/path','http://checkout.stripe.com/path','javascript:alert(1)','https://user@checkout.stripe.com/path','https://checkout.stripe.com:444/path'])assert.throws(()=>approvedStripeUrl(url));
 assert.throws(()=>approvedStripeUrl('https://billing.stripe.com/p/session/a'));
});
