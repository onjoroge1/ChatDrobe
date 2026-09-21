import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {extensionDevices} from '../extension-devices.mjs';
import {createExtensionHandler,extensionClientIp} from '../extension-http.mjs';
import {hash} from '../accounts-policy.mjs';
import {memoryStore} from './fakes.mjs';

async function fixture(t,{vercelProxy=false}={}){
 const store=memoryStore(),calls=[],rows=new Map();let lookups=0;
 const tracked={...store,async limit(...args){calls.push(args[0]);return store.limit(...args);}};
 const pool={async query(sql,params){assert.ok(sql.startsWith('SELECT d.*'));lookups++;return {rows:rows.has(params[0])?[rows.get(params[0])]:[]};}};
 const devices=extensionDevices({pool,store:tracked,owner:{ready:false},now:()=>1700000000});
 const runtime=async()=>({devices,pool});
 const server=http.createServer(createExtensionHandler(runtime,{vercelProxy}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port+'/api/extension';
 const post=(secret,ip,action='poll')=>fetch(base+'?action='+action,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+secret,'x-vercel-forwarded-for':ip},body:'{}'});
 const credential=()=>randomBytes(32).toString('base64url');
 function pending(secret){rows.set(hash(secret),{account_id:null,expires_at:new Date(1700000600000)});}
 return {post,credential,pending,calls,get lookups(){return lookups;}};
}

test('forwarding headers cannot choose quota identity outside the trusted Vercel boundary',()=>{
 const request={headers:{'x-vercel-forwarded-for':'203.0.113.1'},socket:{remoteAddress:'127.0.0.1'}};
 assert.equal(extensionClientIp(request,false),'127.0.0.1');assert.equal(extensionClientIp(request,true),'203.0.113.1');
 for(const header of ['invented','203.0.113.1, 203.0.113.2',['203.0.113.1']]){
  request.headers['x-vercel-forwarded-for']=header;assert.equal(extensionClientIp(request,true),'127.0.0.1');
 }
});

test('real HTTP: rotating invented credentials and spoofed forwarding headers have bounded database lookups',async t=>{
 const f=await fixture(t);
 for(let i=0;i<130;i++){
  const result=await f.post(f.credential(),'203.0.113.'+(i+1),i%2?'poll':'entitlement');
  assert.equal(result.status,i<120?401:429);await result.text();
 }
 assert.equal(f.lookups,120);
 assert.equal(f.calls.filter(x=>x.startsWith('device-api:')).length,120);
 assert.equal(f.calls.includes('device-api-global'),false);
 assert.equal(new Set(f.calls.filter(x=>x.startsWith('device-request-ip:'))).size,1);
});

test('real HTTP: an exhausted untrusted-client quota leaves another client and the shared quota usable',async t=>{
 const f=await fixture(t,{vercelProxy:true});
 for(let i=0;i<120;i++){const result=await f.post(f.credential(),'203.0.113.1');assert.equal(result.status,401);await result.text();}
 const blocked=await f.post(f.credential(),'203.0.113.1');assert.equal(blocked.status,429);await blocked.text();
 const healthy=f.credential();f.pending(healthy);
 const result=await f.post(healthy,'203.0.113.2');assert.equal(result.status,200);assert.deepEqual(await result.json(),{linked:false,pending:true});
 assert.equal(f.lookups,121);assert.equal(f.calls.filter(x=>x==='device-api-global').length,1);
});
