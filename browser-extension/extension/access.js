/* Access decisions run in the service worker, not only on theme cards.
 * Sandbox access comes from the separate pinned-key billing client. Return URLs never grant access.
 */
(function(root){
 'use strict';
 const premiumIds=Object.freeze(['starlit','reactor','sentinel','arcade']);
 function access(raw={},config=root.ChatDrobeCommerceConfig||{}){
  const preview=config.channel==='private-beta'&&config.allowTesterPreview===true&&raw.testerPreview===true;
  return {premium:preview,testerPreview:preview,paid:false,checkoutReady:false};
 }
 function effective(value,allowed){
  const p={...value};
  if(!allowed.premium){if(premiumIds.includes(p.theme))p.theme='mooncat';p.idleMode='off';p.motion=false;p.livingEnabled=false;p.livingMotion=false;p.livingReactions=false;}
  return p;
 }
 function requiresPremium(value){return premiumIds.includes(value.theme)||(value.idleMode&&value.idleMode!=='off')||value.motion===true||value.livingEnabled===true||value.livingMotion===true||value.livingReactions===true;}
 function checkout(config=root.ChatDrobeCommerceConfig||{}){
  // An external URL alone is not sufficient: lifecycle verification must exist first.
  // The legacy helper stays disabled; the sandbox worker routes through account linking and verified proofs.
  return {ready:false,url:'',reason:'Checkout is not connected. No payment will be collected.'};
 }
 function websiteLinks(config=root.ChatDrobeCommerceConfig||{}){
  const origin='https://www.chatdrobe.com',links={};
  // No URL from query parameters, imported appearances or message payloads is used.
  if(config.websiteOrigin!==origin)return Object.freeze(links);
  for(const [name,path] of Object.entries({home:'/',premium:'/premium/',pricing:'/pricing/',help:'/help/',privacy:'/privacy/'})){
   const value=config[name+'Url'];
   if(value===origin+path)links[name]=value;
  }
  return Object.freeze(links);
 }
 const api=Object.freeze({premiumIds,access,effective,requiresPremium,checkout,websiteLinks});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ChatDrobeAccess=api;
})(globalThis);
