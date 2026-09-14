import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {connectStore} from '../pg-store.mjs';
import {billingService} from '../billing-service.mjs';
import {testConfig,fakeStripe} from '../tests/fakes.mjs';
import {clock,API_VERSION} from '../security.mjs';

if (!process.env.BILLING_DATABASE_URL) throw new Error('PostgreSQL integration tests require an isolated BILLING_DATABASE_URL.');

test('real PostgreSQL: durable checkout concurrency, webhook rollback/deduplication, restart and revocation',async t=>{
 const {pool,store}=await connectStore(process.env.BILLING_DATABASE_URL);t.after(()=>pool.end());
 await pool.query(await fs.readFile(new URL('../migrations/001_billing.sql',import.meta.url),'utf8'));
 const config=testConfig(),provider=fakeStripe(),id=randomBytes(32).toString('hex');
 const service=billingService({config,store,stripe:provider.stripe});
 await Promise.all([service.checkout(id,'starlit'),service.checkout(id,'reactor')]);
 const saved=await store.read(id);assert.ok(saved.customerId);assert.ok(saved.intent.id);assert.ok(saved.sessionId);
 assert.equal([...provider.data.keys()].filter(k=>k.startsWith('/checkout/sessions/')).length,1);
 const sub=provider.pay(saved.sessionId,clock());
 const event={id:'evt_'+randomBytes(12).toString('hex'),livemode:false,api_version:API_VERSION,type:'customer.subscription.updated',data:{object:{id:sub.id}}};
 const results=await Promise.all([service.webhook(event),service.webhook(event)]);
 assert.equal(results.filter(r=>r.processed).length,1);assert.equal(results.filter(r=>r.duplicate).length,1);
 const eventRow=await pool.query('SELECT * FROM chatdrobe_billing_events WHERE id=$1',[event.id]);assert.equal(eventRow.rowCount,1);
 const snapshot=await store.read(id),failureId='evt_'+randomBytes(12).toString('hex');
 await assert.rejects(store.mutate(id,state=>{state.status='corrupted';throw Error('rollback');},{eventId:failureId}));
 assert.deepEqual(await store.read(id),snapshot);assert.equal((await pool.query('SELECT id FROM chatdrobe_billing_events WHERE id=$1',[failureId])).rowCount,0);
 // Fresh pool / service simulates another serverless instance after a restart.
 const second=await connectStore(process.env.BILLING_DATABASE_URL);t.after(()=>second.pool.end());
 const restarted=billingService({config,store:second.store,stripe:provider.stripe});assert.equal((await restarted.refresh(id)).plan,'plus');
 provider.data.get('/subscriptions/'+sub.id).status='canceled';assert.equal((await restarted.refresh(id)).plan,'free');
 await store.limit('fixture-'+id,1,60,clock());await assert.rejects(store.limit('fixture-'+id,1,60,clock()),{code:'RATE_LIMIT'});
});
