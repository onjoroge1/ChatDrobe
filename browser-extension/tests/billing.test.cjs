const test=require('node:test'),assert=require('node:assert/strict');
const {generateKeyPairSync,sign,createHash,webcrypto}=require('node:crypto');
const {create}=require('../extension/billing-client.js'),verifier=require('../extension/entitlement.js');
const hash=v=>createHash('sha256').update(v).digest('hex');
function fixture(){
 let now=1700000000000,linked=false,plan='free',fail=null,wrong=false,intercept=null;
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'}),storageData={},alarmsData=new Map(),requests=[];
 const storage={get:async key=>({[key]:structuredClone(storageData[key])}),set:async values=>Object.assign(storageData,structuredClone(values))};
 function token(device,changes={}){const header={alg:'ES256',typ:'JWT',kid:'fixture'},claims={iss:'chatdrobe-billing-test',aud:'chatdrobe-extension',sub:hash('member'),did:hash(device),environment:'test',plan,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+600,...changes};const body=[header,claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return body+'.'+sign('sha256',Buffer.from(body),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');}
 const fetcher=async(url,options)=>{
  const action=new URL(url).searchParams.get('action'),credential=options.headers.Authorization.slice(7);requests.push({action,body:options.body,url,credential});
  if(fail==='network')throw Error('Network unavailable');if(fail==='signer'&&action==='entitlement')return new Response(JSON.stringify({error:{code:'ACCESS_SIGNING_NOT_READY',message:'BILLING_SIGNING_PRIVATE_KEY is missing. Your account connection is saved.'}}),{status:503});
  if(Number.isInteger(fail))return new Response(JSON.stringify({error:{code:fail===429?'RATE_LIMIT':'DEVICE_SIGN_IN_REQUIRED',message:fail===429?'Try again later':'Reconnect'}}),{status:fail});
  if(fail?.status)return new Response(fail.body,{status:fail.status});
  let result=action==='start'?{code:'ABCDE-12345-ABCDE-12345',expiresAt:now/1000+600,verificationUrl:'https://www.chatdrobe.com/account/#link=ABCDE-12345-ABCDE-12345'}:action==='poll'?{linked,account:{email:'member@example.test'}}:action==='entitlement'?{linked:true,account:{email:'member@example.test'},token:token(wrong?'other-device':credential),plan,billingEnabled:true}: {ok:true};
  if(intercept&&action==='entitlement')await intercept;
  return new Response(JSON.stringify(result),{status:200});
 };
 const options={storage,alarms:{create:async(k,v)=>alarmsData.set(k,v),clear:async k=>alarmsData.delete(k)},fetcher,config:{billingOrigin:'https://www.chatdrobe.com',entitlementKey:{keyId:'fixture',publicJwk:jwk}},extensionId:'a'.repeat(32),now:()=>now,cryptoApi:webcrypto,verify:verifier.verify};const client=create(options);
 return {client,restart:()=>create(options),storageData,alarmsData,requests,token,jwk,setPlan:v=>plan=v,setLinked:v=>linked=v,setFail:v=>fail=v,setWrong:v=>wrong=v,advance:ms=>now+=ms,setIntercept:p=>intercept=p};
}
async function connected(plan='plus'){const f=fixture();await f.client.start();f.setLinked(true);f.setPlan(plan);await f.client.refresh();return f;}
test('fresh installation has no Premium, no tester bypass and makes no automatic network request',async()=>{const f=fixture();const s=await f.client.initialize();assert.equal(s.premium,false);assert.equal(s.testerPreview,false);assert.equal(f.requests.length,0);});
test('connection returns only a code and safe URL; status never returns credentials or JWTs',async()=>{const f=fixture(),r=await f.client.start();assert.match(r.verificationUrl,/^https:\/\/www.chatdrobe.com\/account\/#link=/);const raw=f.storageData[f.client.KEY];assert.match(raw.secret,/^[A-Za-z0-9_-]{43}$/);assert.ok(!JSON.stringify(r).includes(raw.secret));const s=await f.client.refresh();assert.equal(s.premium,false);assert.equal(f.requests.some(r=>r.action==='entitlement'),false);});
test('only a verified device-bound Plus token unlocks; Free account and role flags do not',async()=>{const f=await connected('free');assert.equal((await f.client.status()).premium,false);f.storageData[f.client.KEY].isAdmin=true;f.storageData[f.client.KEY].premium=true;f.storageData[f.client.KEY].testerPreview=true;assert.equal((await f.client.status()).premium,false);f.setPlan('plus');assert.equal((await f.client.refresh()).premium,true);assert.equal((await f.client.status()).paid,false);assert.equal((await f.client.status()).testSubscription,true);});
test('cancellation / a signed Free update locks Premium without deleting local workspace data',async()=>{const f=await connected();f.storageData.mooddock={notes:'private note',prompts:[{body:'saved'}]};f.setPlan('free');assert.equal((await f.client.refresh()).premium,false);assert.equal(f.storageData.mooddock.notes,'private note');});
test('offline cache expires on time and cannot extend itself',async()=>{const f=await connected();f.setFail('network');f.advance(300000);assert.equal((await f.client.refresh()).premium,true);f.advance(301000);assert.equal((await f.client.status()).premium,false);await f.client.refresh();assert.equal((await f.client.status()).premium,false);});
test('a token issued to another installation does not unlock this one',async()=>{const f=fixture();await f.client.start();f.setLinked(true);f.setPlan('plus');f.setWrong(true);const s=await f.client.refresh();assert.equal(s.premium,false);assert.match(s.lastError,/mismatch/i);});
test('forged local access flags and altered signed token fail closed',async()=>{const f=await connected();const data=f.storageData[f.client.KEY],[h,p,s]=data.token.split('.'),claim=JSON.parse(Buffer.from(p,'base64url'));claim.exp+=9999;data.token=h+'.'+Buffer.from(JSON.stringify(claim)).toString('base64url')+'.'+s;assert.equal((await f.client.status()).premium,false);});
test('disconnect clears credentials, proof and alarms before any network completion',async()=>{const f=await connected();f.setFail('network');await f.client.disconnect();assert.equal((await f.client.status()).connected,false);assert.equal((await f.client.status()).premium,false);assert.equal(f.alarmsData.size,0);assert.equal(f.storageData[f.client.KEY].secret,undefined);});
test('an inflight refresh cannot restore access after disconnect',async()=>{const f=await connected();let release;f.setIntercept(new Promise(r=>release=r));const refresh=f.client.refresh();await new Promise(r=>setTimeout(r,10));await f.client.disconnect();release();await refresh;assert.equal((await f.client.status()).premium,false);assert.equal(f.storageData[f.client.KEY].secret,undefined);});
test('server-revoked credentials clear cache and require a new connection',async()=>{const f=await connected();f.setFail(401);const s=await f.client.refresh();assert.equal(s.connected,false);assert.equal(s.premium,false);assert.equal(f.storageData[f.client.KEY].token,undefined);});
test('restoring the same account to a new installation needs a new approved credential',async()=>{const one=await connected(),two=fixture();two.storageData[two.client.KEY]={...one.storageData[one.client.KEY],secret:'B'.repeat(43)};assert.equal((await two.client.status()).premium,false);await two.client.start();two.setLinked(true);two.setPlan('plus');assert.equal((await two.client.refresh()).premium,true);assert.notEqual(two.storageData[two.client.KEY].secret,one.storageData[one.client.KEY].secret);});
test('only account endpoint and minimal bodies are used, never chat contents or website cookies',async()=>{const f=await connected();for(const r of f.requests){assert.match(r.url,/^https:\/\/www.chatdrobe.com\/api\/extension\?action=/);assert.deepEqual(Object.keys(JSON.parse(r.body)),r.action==='start'?['extensionId']:[]);}assert.equal(f.requests.some(r=>r.url.includes(r.credential)),false);});

test('remembered credential and signed grant survive a new worker/client without a sign-in',async()=>{const f=await connected();const before=f.requests.length;const restored=f.restart();await restored.initialize();assert.equal((await restored.ensure()).premium,true);assert.equal(f.requests.length,before);assert.match(f.storageData[f.client.KEY].secret,/^[A-Za-z0-9_-]{43}$/);f.advance(61000);await f.client.ensure();assert.equal(f.requests.length,before+1);});
test('only a signed admin source is complimentary; arbitrary source and local role claims are rejected',async()=>{const f=await connected('free'),raw=f.storageData[f.client.KEY];raw.token=f.token(raw.secret,{plan:'plus',accessSource:'admin'});const s=await f.client.status();assert.equal(s.adminPremium,true);assert.equal(s.testSubscription,false);raw.token=f.token(raw.secret,{plan:'plus',accessSource:'invented'});assert.equal((await f.client.status()).premium,false);raw.token=f.token(raw.secret,{plan:'free',accessSource:'admin'});assert.equal((await f.client.status()).premium,false);});

test('approval link is available after restart, carries the SAME code, and expires without regenerating credentials',async()=>{const f=fixture();await f.client.start();const credential=f.storageData[f.client.KEY].secret;const r=await f.restart().status();assert.equal(r.verificationUrl,'https://www.chatdrobe.com/account/#link=ABCDE-12345-ABCDE-12345');assert.equal(f.storageData[f.client.KEY].secret,credential);f.advance(601000);assert.equal((await f.client.status()).verificationUrl,'');});
test('signing failure keeps the approved account and reports configuration rather than asking for a new purchase',async()=>{const f=fixture();await f.client.start();f.setLinked(true);f.setFail('signer');const r=await f.client.refresh();assert.equal(r.connected,true);assert.equal(r.premium,false);assert.equal(r.lastErrorCode,'ACCESS_SIGNING_NOT_READY');assert.equal(r.linkCode,'');assert.ok(f.storageData[f.client.KEY].secret);f.setFail(null);f.setPlan('plus');assert.equal((await f.client.refresh()).premium,true);assert.equal((await f.client.status()).lastErrorCode,'');});
test('network failures have an actionable error code and never discard an already connected identity',async()=>{const f=await connected('free');f.setFail('network');const r=await f.client.refresh();assert.equal(r.connected,true);assert.equal(r.lastErrorCode,'NETWORK_UNAVAILABLE');assert.match(r.lastError,/connection is saved/);});

test('temporary HTTP failures retain only the existing signed proof and its original expiry',async()=>{
 for(const fail of [408,425,429,500,503,{status:429,body:'<html>Too many requests</html>'}]){
  const f=await connected(),proof=f.storageData[f.client.KEY].token,expiry=f.alarmsData.get(f.client.EXPIRY).when;
  f.advance(300000);f.setFail(fail);const refreshed=await f.client.refresh();
  assert.equal(refreshed.premium,true);assert.equal(refreshed.connected,true);
  assert.equal(f.storageData[f.client.KEY].token,proof);assert.equal(f.alarmsData.get(f.client.EXPIRY).when,expiry);
  f.advance(300000);assert.equal((await f.client.refresh()).premium,false);
  assert.equal(f.alarmsData.has(f.client.EXPIRY),false);
 }
});
test('permanent HTTP denials revoke credentials even when the response body is not JSON',async()=>{
 for(const fail of [401,403,{status:401,body:'Unauthorized'},{status:403,body:'x'.repeat(17000)}]){
  const f=await connected();f.setFail(fail);const refreshed=await f.client.refresh();
  assert.equal(refreshed.connected,false);assert.equal(refreshed.premium,false);
  assert.equal(f.storageData[f.client.KEY].token,undefined);assert.equal(f.storageData[f.client.KEY].secret,undefined);
  assert.equal(f.alarmsData.size,0);
 }
});
