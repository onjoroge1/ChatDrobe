/* Runs only in the extension worker. Never invoked from a website content script. */
(function(root){
 'use strict';
 const KEY='chatdrobe:billing-v1',REFRESH='chatdrobe:billing-refresh',EXPIRY='chatdrobe:billing-expiry';
 function create({storage,alarms,fetcher=fetch,config,extensionId,now=()=>Date.now(),cryptoApi=crypto,verify=ChatDrobeEntitlement.verify}={}){
  const origin='https://www.chatdrobe.com';let generation=0,inflight=null;
  if(config.billingOrigin!==origin)throw Error('Unsupported billing origin.');
  const publicKey=config.entitlementKey;
  const saved=async()=>((await storage.get(KEY))[KEY]||{});
  const save=async v=>storage.set({[KEY]:v});
  const digest=async v=>Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
  const newSecret=()=>btoa(String.fromCharCode(...cryptoApi.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  async function api(action,credential,input={}){
   let response;try{response=await fetcher(origin+'/api/extension?action='+action,{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential},body:JSON.stringify(input)});}catch(error){const e=Error('Could not reach www.chatdrobe.com. Your connection is saved. Check network access and the extension website permission, then retry.');e.code='NETWORK_UNAVAILABLE';throw e;}
   const body=await response.text();let value;
   if(body.length<=16384)try{value=JSON.parse(body);}catch{}
   // Keep the HTTP status even if an upstream proxy returned HTML or an oversized body.
   // A denied credential must revoke access; a temporary throttle must not revoke a valid proof.
   if(!response.ok){const e=Error(value?.error?.message||'Account request failed.');e.code=value?.error?.code;e.status=response.status;throw e;}
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Account service unavailable.');return value;
  }
  async function grant(data){
   if(!data.token||!/^[A-Za-z0-9_-]{43}$/.test(data.secret||''))return {premium:false,testerPreview:false,paid:false,testSubscription:false};
   try{return await verify(data.token,{...publicKey,deviceId:await digest(data.secret),now:Math.floor(now()/1000)});}catch{return {premium:false,testerPreview:false,paid:false,testSubscription:false};}
  }
  async function schedule(data){
   if(data.secret&&data.email){await alarms?.create(REFRESH,{periodInMinutes:5});}else await alarms?.clear(REFRESH);
   const access=await grant(data);if(access.expiresAt>now()/1000)await alarms?.create(EXPIRY,{when:access.expiresAt*1000});else await alarms?.clear(EXPIRY);
  }
  async function status(){const data=await saved(),access=await grant(data);const connected=!!data.email&&(!data.connectionExpiresAt||data.connectionExpiresAt>now()/1000);return {...access,connected,connectionExpiresAt:data.connectionExpiresAt||0,accountEmail:typeof data.email==='string'?data.email:'',linkCode:typeof data.linkCode==='string'&&data.linkExpires>now()/1000?data.linkCode:'',linkExpires:data.linkExpires||0,verificationUrl:typeof data.linkCode==='string'&&/^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(data.linkCode)&&data.linkExpires>now()/1000?origin+'/account/#link='+encodeURIComponent(data.linkCode):'',lastError:typeof data.lastError==='string'?data.lastError:'',lastErrorCode:typeof data.lastErrorCode==='string'?data.lastErrorCode:'',channel:'sandbox',checkoutReady:!!data.email};}
  async function start(){
   const ticket=++generation,previous=await saved(),credential=newSecret();inflight=null;
   // Clear old access before any request. A new connection must not inherit a prior account.
   await save({secret:credential});await schedule({});
   if(previous.secret)api('disconnect',previous.secret).catch(()=>{});
   try{
    const result=await api('start',credential,{extensionId});if(ticket!==generation)return status();
    if(!/^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(result.code||''))throw Error('Invalid account connection code.');
    const url=origin+'/account/#link='+encodeURIComponent(result.code);if(result.verificationUrl!==url)throw Error('Invalid account connection URL.');
    await save({secret:credential,linkCode:result.code,linkExpires:result.expiresAt});return {...await status(),verificationUrl:url};
   }catch(e){if(ticket===generation)await save({lastError:e.message,lastErrorCode:e.code||''});throw e;}
  }
  async function refresh(){
   if(inflight)return inflight;
   const ticket=generation;
   const task=(async()=>{
    let data=await saved();if(!data.secret)return status();
    try{
     if(!data.email){const link=await api('poll',data.secret);if(ticket!==generation)return status();if(!link.linked)return status();data={...data,email:String(link.account?.email||'').slice(0,254),linkCode:'',linkExpires:0};}
     const response=await api('entitlement',data.secret);if(ticket!==generation)return status();
     if(response.token){await verify(response.token,{...publicKey,deviceId:await digest(data.secret),now:Math.floor(now()/1000)});data.token=response.token;}else if(response.billingEnabled===false){data.token=null;}else throw Error('The account service returned no signed access proof.');
     if(ticket!==generation)return status();
     data.email=String(response.account?.email||data.email||'').slice(0,254);data.lastChecked=now();data.lastErrorCode='';data.connectionExpiresAt=Number.isSafeInteger(response.connectionExpiresAt)?response.connectionExpiresAt:data.connectionExpiresAt;data.lastError=!response.token&&response.billingEnabled===false?'Account linked. Test billing is not configured yet.':'';
     await save(data);await schedule(data);return status();
    }catch(e){
     if(ticket!==generation)return status();
     if(e.status===401||e.status===403){await save({lastError:e.message,lastErrorCode:e.code||''});await schedule({});}
     else{if(e.status&&e.status<500&&![408,425,429].includes(e.status))data.token=null;data.lastError=e.message;data.lastErrorCode=e.code||(/signing key|signature/i.test(e.message)?'PROOF_INVALID':'');await save(data);await schedule(data);}
     return status();
    }
   })();inflight=task;try{return await task;}finally{if(inflight===task)inflight=null;}
  }
  async function disconnect(){const old=await saved();generation++;inflight=null;await save({});await schedule({});if(old.secret)try{await api('disconnect',old.secret);}catch{}return status();}
  async function ensure(){const data=await saved(),access=await grant(data);if(!data.secret)return status();if(access.premium&&data.lastChecked<=now()&&now()-data.lastChecked<60000&&access.expiresAt>now()/1000+60)return status();return refresh();}
  async function initialize(){const data=await saved();await schedule(data);return status();}
  return Object.freeze({initialize,status,start,refresh,ensure,disconnect,KEY,REFRESH,EXPIRY});
 }
 const api=Object.freeze({create,KEY,REFRESH,EXPIRY});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ChatDrobeBilling=api;
})(globalThis);
