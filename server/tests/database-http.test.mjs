import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {createHandler} from '../http.mjs';import {configuration} from '../security.mjs';
import {deployDatabase} from '../deploy-database.mjs';import {testConfig} from './fakes.mjs';
async function listen(t,handler){const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return `http://127.0.0.1:${server.address().port}/api/billing`;}
test('database readiness works independently of Stripe configuration and rejects all writes',async t=>{
 let probes=0;
 const base=await listen(t,createHandler(async()=>{throw Error('Stripe configuration must not be read');},{databaseStatus:async()=>{probes++;return {configured:true,connected:true,schemaReady:true,status:'ready'};}}));
 const res=await fetch(base+'?action=database');assert.equal(res.status,200);assert.equal((await res.json()).status,'ready');assert.match(res.headers.get('cache-control'),/no-store/);
 for(const method of ['POST','PUT','DELETE'])assert.equal((await fetch(base+'?action=database',{method})).status,405);
 assert.equal(probes,1);
});
test('pending schema returns 503 while normal health still accurately says payments off',async t=>{
 const base=await listen(t,createHandler(async()=>({config:{enabled:false}}),{databaseStatus:async()=>({configured:true,connected:true,schemaReady:false,status:'schema_pending'})}));
 assert.equal((await fetch(base+'?action=database')).status,503);
 assert.deepEqual(await(await fetch(base+'?action=health')).json(),{enabled:false,mode:'off',livePayments:false});
 assert.equal((await fetch(base+'?action=checkout',{method:'POST'})).status,503);
});
test('the full billing configuration accepts DATABASE_URL without BILLING_DATABASE_URL',()=>{
 const fixture=testConfig();
 const env={BILLING_MODE:'test',DATABASE_URL:'postgresql://fixture:fixture@localhost/test',BILLING_ORIGIN:fixture.origin,
 STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PLUS_PRICE_ID:'price_fixture',
 BILLING_EXTENSION_IDS:'a'.repeat(32),BILLING_SIGNING_PRIVATE_KEY:fixture.privateKey.export({format:'pem',type:'pkcs8'})};
 assert.equal(configuration(env).databaseUrl,env.DATABASE_URL);
});
test('preview releases never call migrations even when given database credentials',async()=>{
 let called=false;const env={VERCEL:'1',VERCEL_ENV:'preview',DATABASE_URL:'postgresql://fixture:fixture@localhost/test'};
 assert.deepEqual(await deployDatabase({env,migrate:async()=>{called=true;},log:()=>{}}),{skipped:true});assert.equal(called,false);
});
