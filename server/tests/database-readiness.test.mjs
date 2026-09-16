import test from 'node:test';import assert from 'node:assert/strict';
import {databaseProbe} from '../database-readiness.mjs';
const env={DATABASE_URL:'postgresql://postgres:fixture@db.example/test?sslmode=require'};
test('absent database returns a truthful non-ready summary without a connection attempt',async()=>{
 const probe=databaseProbe({env:{},connect:()=>{throw Error('must not connect');}});
 assert.deepEqual(await probe(),{configured:false,connected:false,schemaReady:false,status:'not_configured'});
});
test('authentication/network errors disclose no host, user, password or provider error',async()=>{
 const probe=databaseProbe({env,connect:async()=>{throw Error('secret credential at db.example');}});
 const result=await probe();assert.equal(result.connected,false);assert.equal(result.status,'unavailable');
 assert.ok(!JSON.stringify(result).includes('db.example'));assert.ok(!JSON.stringify(result).includes('secret'));
});
test('a connected but empty database is not reported ready; probing is SELECT-only',async()=>{
 const queries=[];let released=false,ended=false;
 const client={query:async(sql)=>{queries.push(sql);return {rows:[],rowCount:0};},release:()=>{released=true;}};
 const probe=databaseProbe({env,connect:async()=>({pool:{connect:async()=>client,end:async()=>{ended=true;}}})});
 assert.deepEqual(await probe(),{configured:true,connected:true,schemaReady:false,status:'schema_pending'});
 assert.ok(queries.includes('BEGIN READ ONLY'));assert.ok(released&&ended);
 assert.ok(queries.every(q=>/^(BEGIN READ ONLY|SET LOCAL |SELECT |COMMIT|ROLLBACK)/i.test(q)));
});
test('parallel and repeated requests coalesce and cache database work, including failures',async()=>{
 let attempts=0,time=0;const probe=databaseProbe({env,now:()=>time,connect:async()=>{attempts++;throw Error('unavailable');}});
 await Promise.all(Array.from({length:50},()=>probe()));assert.equal(attempts,1);
 time=59000;await probe();assert.equal(attempts,1);time=61000;await probe();assert.equal(attempts,2);
});
test('conflicting deployment environment yields configuration_error without opening a socket',async()=>{
 const probe=databaseProbe({env:{...env,BILLING_DATABASE_URL:env.DATABASE_URL+'/other'},connect:()=>{throw Error('must not connect');}});
 assert.equal((await probe()).status,'configuration_error');
});
