import test from 'node:test';
import assert from 'node:assert/strict';
import {extensionDevices} from '../extension-devices.mjs';
import {memoryStore} from './fakes.mjs';

function fixture(){
 const now=1700000000,rows=new Map(),calls=[],store=memoryStore();let lookups=0;
 const pool={async query(sql,params){
  if(sql.startsWith('SELECT d.*')){lookups++;return {rows:rows.has(params[0])?[rows.get(params[0])]:[]};}
  if(sql.startsWith('SELECT *'))return {rows:[]};
  return {rows:[],rowCount:1};
 },async connect(){return {...pool,release(){}};}};
 const tracked={...store,async limit(...args){calls.push(args[0]);return store.limit(...args);}};
 const devices=extensionDevices({pool,store:tracked,owner:{ready:true,version:'current'},now:()=>now});
 const add=(id,patch={})=>rows.set(id,{account_id:'account',expires_at:new Date((now+600)*1000),...patch});
 return {devices,add,calls,get lookups(){return lookups;}};
}

test('invalid credentials cannot consume the shared device quota or repeatedly query the database',async()=>{
 const f=fixture();f.add('healthy');
 for(let i=0;i<1300;i++)await assert.rejects(f.devices.device('invalid'),{status:i<30?401:429});
 assert.equal(f.lookups,30);assert.equal(f.calls.filter(x=>x==='device-api-global').length,0);
 assert.equal((await f.devices.device('healthy')).account_id,'account');
});

test('revoked, expired, disabled, unapproved and rotated credentials spend no shared entitlement quota',async()=>{
 const f=fixture(),invalid=[{revoked_at:new Date()},{expires_at:new Date(0)},{disabled_at:new Date()},{owner_version:'previous'},{account_id:null}];
 for(const [i,patch] of invalid.entries()){f.add(String(i),patch);await assert.rejects(f.devices.device(String(i)),{status:patch.account_id===null?409:401});}
 assert.equal(f.calls.includes('device-api-global'),false);
 // Valid pending pairing polls are deliberately allowed but still rate limited.
 assert.deepEqual(await f.devices.poll('4'),{linked:false,pending:true});
 assert.equal(f.calls.filter(x=>x==='device-api-global').length,1);
});

test('a throttled valid credential cannot starve another device and shared capacity remains bounded',async()=>{
 const f=fixture();f.add('noisy');
 for(let i=0;i<30;i++)await f.devices.device('noisy');
 for(let i=0;i<1250;i++)await assert.rejects(f.devices.device('noisy'),{status:429});
 assert.equal(f.calls.filter(x=>x==='device-api-global').length,30);
 for(let i=0;i<1170;i++){const id='valid-'+i;f.add(id);await f.devices.device(id);}
 f.add('over-shared-limit');await assert.rejects(f.devices.device('over-shared-limit'),{status:429});
});

test('pairing attempts over one IP limit are rejected before spending the global start budget',async()=>{
 const f=fixture();
 for(let i=0;i<10;i++)await f.devices.start('device-'+i,'a'.repeat(32),'one-ip');
 for(let i=0;i<205;i++)await assert.rejects(f.devices.start('excess-'+i,'a'.repeat(32),'one-ip'),{status:429});
 assert.equal(f.calls.filter(x=>x==='device-start-global').length,10);
 assert.match((await f.devices.start('healthy','a'.repeat(32),'another-ip')).code,/^[A-F0-9-]+$/);
});
