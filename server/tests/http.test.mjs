import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomBytes,createHmac} from 'node:crypto';
import {createHandler} from '../http.mjs';
import {billingService} from '../billing-service.mjs';
import {clock,hash,API_VERSION,lease} from '../security.mjs';
import {verifyLicense} from '../../contracts/license.mjs';
import {testConfig,memoryStore,fakeStripe} from './fakes.mjs';
async function app(t, enabled=true) {
 const config=enabled?testConfig():{enabled:false},store=memoryStore(),provider=fakeStripe();
 const service=enabled?billingService({config,store,stripe:provider.stripe}):null;
 const server=http.createServer(createHandler(async()=>({config,store,service})));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}/api/billing`,secret=randomBytes(32).toString('base64url'),id=hash(secret);
 const post=(action,input={},extra={})=>fetch(base+'?action='+action,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+secret,...extra},body:JSON.stringify(input)});
 return{base,post,config,store,provider,secret,id};
}
test('disabled handler is deployable without credentials, dependencies or database activity',async t=>{
 const a=await app(t,false);assert.equal((await(await fetch(a.base+'?action=health')).json()).enabled,false);
 assert.equal((await a.post('checkout')).status,503);assert.equal(a.store.rows.size,0);
});
test('HTTP endpoint rejects price/customer injection, hostile Origin, missing auth and wrong methods',async t=>{
 const a=await app(t);
 assert.equal((await a.post('checkout',{price:'price_attacker'})).status,400);
 assert.equal((await a.post('portal',{customer:'cus_victim'})).status,400);
 assert.equal((await a.post('checkout',{}, {origin:'https://attacker.example'})).status,403);
 assert.equal((await a.post('checkout',{}, {authorization:''})).status,401);
 assert.equal((await fetch(a.base+'?action=checkout')).status,405);
 assert.equal(a.store.rows.size,0);
});
test('checkout → signed webhook → browser-verifiable lease → cancellation is exercised over real local HTTP',async t=>{
 const a=await app(t);assert.equal((await a.post('checkout',{world:'starlit'})).status,200);
 const before=await(await a.post('entitlement')).json();assert.equal(before.plan,'free');
 const state=await a.store.read(a.id),sub=a.provider.pay(state.sessionId,clock());
 const event={id:'evt_http1',type:'checkout.session.completed',api_version:API_VERSION,livemode:false,data:{object:{id:state.sessionId}}};
 const body=JSON.stringify(event),timestamp=clock(),sig=createHmac('sha256',a.config.webhookSecret).update(`${timestamp}.${body}`).digest('hex');
 const reply=await fetch(a.base+'?action=webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':`t=${timestamp},v1=${sig}`},body});
 assert.equal(reply.status,200);
 const result=await(await a.post('entitlement')).json();
 const verified=await verifyLicense(result.token,{publicJwk:a.config.publicJwk,keyId:a.config.keyId,installationId:a.id});assert.equal(verified.premium,true);
 a.provider.data.get('/subscriptions/'+sub.id).status='canceled';
 const cancelled=await(await a.post('entitlement')).json();
 assert.equal((await verifyLicense(cancelled.token,{publicJwk:a.config.publicJwk,keyId:a.config.keyId,installationId:a.id})).premium,false);
});
test('forged success return cannot create an installation or change access',async t=>{
 const a=await app(t);const response=await fetch(a.base+'?action=return&paid=true&isPro=true');
 assert.equal(response.status,200);assert.equal(a.store.rows.size,0);
 assert.match(await response.text(),/visiting this page cannot/);
});
test('responses are non-cacheable and oversized/unsigned webhook bodies are rejected',async t=>{
 const a=await app(t);const response=await a.post('entitlement');
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
 assert.equal((await a.post('webhook')).status,400);
 assert.equal((await a.post('checkout',{world:'x'.repeat(3000)})).status,413);
});
test('browser verifier rejects tampering, other installations, expired leases and unpinned keys',async()=>{
 const cfg=testConfig(),id=hash('test'),now=1700000000,result=lease(cfg,id,{status:'active',paidUntil:now+900},now);
 const opts={publicJwk:cfg.publicJwk,keyId:cfg.keyId,installationId:id,now};
 assert.equal((await verifyLicense(result.token,opts)).premium,true);
 await assert.rejects(verifyLicense(result.token,{...opts,installationId:hash('other')}));
 await assert.rejects(verifyLicense(result.token,{...opts,now:now+601}));
 await assert.rejects(verifyLicense(result.token,{...opts,publicJwk:testConfig().publicJwk}));
 const [h,p,s]=result.token.split('.');const payload=JSON.parse(Buffer.from(p,'base64url'));payload.exp+=86400;
 await assert.rejects(verifyLicense(h+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.'+s,opts));
});
