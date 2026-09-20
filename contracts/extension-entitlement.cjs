/* Pinned-key, device-bound proof. Browser flags, imports and owner role cannot grant Plus. */
(function(root){
 'use strict';
 function bytes(value){if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid entitlement encoding.');return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}
 async function verify(token,{publicJwk,keyId,deviceId,now=Math.floor(Date.now()/1000)}){
  if(typeof token!=='string'||token.length>4096||!Number.isSafeInteger(now))throw Error('Invalid entitlement.');
  const parts=token.split('.');if(parts.length!==3)throw Error('Invalid entitlement.');
  const [h,p,s]=parts,header=JSON.parse(new TextDecoder().decode(bytes(h))),claims=JSON.parse(new TextDecoder().decode(bytes(p)));
  if(header.alg!=='ES256'||header.typ!=='JWT'||header.kid!==keyId||publicJwk?.kty!=='EC'||publicJwk.crv!=='P-256'||publicJwk.d)throw Error('The server signing key does not match this extension build.');
  const key=await crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(s),new TextEncoder().encode(h+'.'+p)))throw Error('Invalid entitlement signature.');
  if(claims.iss!=='chatdrobe-billing-test'||claims.aud!=='chatdrobe-extension'||claims.environment!=='test'||claims.did!==deviceId||!/^[a-f0-9]{64}$/.test(claims.sub||'')||!['free','plus'].includes(claims.plan)||!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||claims.iat>now+30||claims.exp<=now||claims.exp<=claims.iat||claims.exp>claims.iat+600)throw Error('Expired or mismatched entitlement. Reconnect or refresh access.');
  return Object.freeze({premium:claims.plan==='plus',testSubscription:claims.plan==='plus',paid:false,testerPreview:false,expiresAt:claims.exp,subject:claims.sub});
 }
 const api=Object.freeze({verify});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ChatDrobeEntitlement=api;
})(globalThis);
