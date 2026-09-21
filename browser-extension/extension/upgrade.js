/* Upgrade information only; user-initiated website links do not grant access. */
'use strict';
const worlds={starlit:'Starlit Cat',reactor:'Mecha Reactor',sentinel:'Neon Sentinel',arcade:'Retro Arcade'};
const selected=worlds[new URLSearchParams(location.search).get('world')];
if(selected)document.getElementById('selected').textContent=selected+' is part of Premium. Your current appearance has not been changed.';
document.getElementById('price').replaceChildren(document.createTextNode('$'+ChatDrobeCommerceConfig.proposedAnnualUsd+' '),Object.assign(document.createElement('small'),{textContent:'/ year'}));
const links=ChatDrobeAccess.websiteLinks();
for(const node of document.querySelectorAll('[data-site-link]')){
 const url=links[node.dataset.siteLink];
 if(!url){node.removeAttribute('href');node.hidden=true;continue;}
 node.href=url;
 node.target='_blank';
 node.rel='noopener noreferrer';
 node.referrerPolicy='no-referrer';
 node.hidden=false;
}
// Fail closed. The presence of a live site/API URL does not certify billing integration.
document.getElementById('checkout').disabled=false;
document.getElementById('checkout').textContent='Sign in / manage access';
document.getElementById('status').textContent='Connect your account. Verified subscribers and administrators receive Premium without a second purchase.';
document.getElementById('checkout').addEventListener('click',async()=>{const r=await chrome.runtime.sendMessage({scope:'mooddock',kind:'open-account'});if(!r?.ok)document.getElementById('status').textContent=r?.error||'Unable to open account.';});

// Legacy upgrade links remain safe, but are no longer the normal selection path.
chrome.runtime.sendMessage({scope:'mooddock',kind:'billing-status'}).then(r=>{if(r?.ok&&r.billing?.premium)location.replace(chrome.runtime.getURL('account.html'));}).catch(()=>{});
