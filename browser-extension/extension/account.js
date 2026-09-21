'use strict';
const $=id=>document.getElementById(id);let busy=false,last=null;
async function request(kind){const r=await chrome.runtime.sendMessage({scope:'mooddock',kind});if(!r?.ok)throw Error(r?.error||'Reload the extension and try again.');return r.billing;}
function paint(s){
 last=s;
 const setup=!!s.connected&&!s.premium&&(s.lastErrorCode==='ACCESS_SIGNING_NOT_READY'||s.lastErrorCode==='PROOF_INVALID'||/Premium-signing|BILLING_SIGNING_PRIVATE_KEY|signing key/i.test(s.lastError||''));
 $('plan').textContent=s.adminPremium?'Admin Premium — complimentary':s.testSubscription?'Test Plus — verified sandbox subscription':setup?'Connected — Premium setup required':s.connected&&s.lastError?'Connected — access check pending':'Free';
 $('email').textContent=s.accountEmail||'Not connected to a ChatDrobe account.';$('code').textContent=s.linkCode||'';$('pairing').hidden=!s.linkCode;
 $('code-expiry').textContent=s.linkExpires?'Code expires at '+new Date(s.linkExpires*1000).toLocaleTimeString()+'.':'Codes expire after ten minutes.';
 $('status').textContent=s.lastError||(s.premium?'Premium is ready. Open ChatGPT to use your world.':s.linkCode?'Step 2: approve the prefilled code on ChatDrobe, then return here.':s.connected?'Account connected. A subscription is required for Premium.':'Step 1: sign in and approve this extension.');
 $('setup').hidden=!setup;$('success').hidden=!s.premium;$('connect').hidden=setup;document.body.dataset.setup=String(setup);
 $('connect').textContent=s.connected?'Switch account':s.linkCode?'Start a new code (replaces this one)':'Sign in / connect account';
 $('website').textContent=setup?'View account and setup status':s.premium?'Manage account':'View account / test checkout';
 $('website').hidden=s.premium||!!s.linkCode;$('disconnect').hidden=!s.connected&&!s.linkCode;
 $('continue').hidden=!s.premium;
 $('remembered').textContent=s.connected?'This connection is remembered for up to 30 days. Premium is rechecked periodically, not cached for 30 days.':'One approval remembers this installation for up to 30 days. You should not connect again for every theme.';
}
async function act(fn){if(busy)return;busy=true;for(const n of document.querySelectorAll('button'))n.disabled=true;try{const r=await fn();if(r)paint(r);}catch(e){$('status').textContent=e.message==='Failed to fetch'?'Could not reach ChatDrobe. Your connection is saved; check website access and retry.':e.message;}finally{busy=false;for(const n of document.querySelectorAll('button'))n.disabled=false;}}
$('connect').addEventListener('click',()=>act(async()=>{if(last?.linkCode&&!confirm('Replace the current code? The old approval link will stop working.'))return;if(!await chrome.permissions.request({origins:['https://www.chatdrobe.com/*']}))throw Error('Website access is needed to link the account. Free themes still work.');return request('billing-start');}));
$('approve').addEventListener('click',()=>act(()=>request('billing-website')));
$('refresh').addEventListener('click',()=>act(()=>request('billing-refresh')));
$('website').addEventListener('click',()=>act(()=>request('billing-website')));
$('disconnect').addEventListener('click',()=>{if(confirm('Disconnect and lock Premium here? Your local notes and prompts remain unchanged.'))act(()=>request('billing-disconnect'));});
$('continue').addEventListener('click',()=>act(()=>request('billing-return')));
window.addEventListener('focus',()=>act(()=>request('billing-refresh')));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)act(()=>request('billing-refresh'));});
act(()=>request('billing-status'));
