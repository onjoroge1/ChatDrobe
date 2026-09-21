/* First-party activation UI. URL flags select a view, never grant access. */
export function linkCode(hash=''){
 const value=new URLSearchParams(hash.replace(/^#/, '')).get('link')||'';
 return /^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(value)?value:'';
}
export function linkFragment(hash=''){const code=linkCode(hash);return code?'#link='+encodeURIComponent(code):'';}
export function authLink(path,search='',hash=''){
 if(!['/signin/','/signup/'].includes(path))throw Error('Unsupported sign-in route.');
 const next=new URLSearchParams(search).get('next');
 return path+(['account','admin'].includes(next)?'?next='+next:'')+linkFragment(hash);
}
export function connectionState(profile,linked,signing,returned=false,verificationFailed=false,approvedHere=false){
 if(!profile?.user)return {kind:'signed-out',title:'Sign in to connect ChatDrobe',detail:'Use the account that owns your subscription.'};
 if(verificationFailed&&!profile.access?.complimentary)return {kind:'payment-pending',title:'Subscription verification needs a retry',detail:'The server could not verify your payment just now. Your connection is saved; do not purchase again.'};
 const eligible=profile.access?.premium===true;
 if(eligible&&(!signing?.ready||signing.matchesExtension!==true))return {kind:'setup-required',title:'Account connected — Premium setup needs attention',detail:signing?.status==='key_mismatch'?'The server key does not match this extension release. Keep this account linked; the operator must restore the matching signing key.':'Your membership is recognized, but the server cannot issue matching Premium access yet. Keep your connection; do not buy again or generate another code.'};
 if(eligible&&approvedHere)return {kind:'needs-extension-check',title:'Connection approved — verify in ChatDrobe',detail:'The account approved this connection. Return to your extension to verify signed Premium access and check whether your selected world is displayed. This website cannot confirm the installed extension or page state.'};
 if(eligible)return {kind:'needs-connection',title:profile.access?.complimentary?'Admin Premium recognized — check your extension':'Premium recognized — check your extension',detail:'Open ChatDrobe in Chrome. If it is not connected, choose Sign in / connect account and use its approval link. Other linked installations do not confirm this browser. An already connected extension can check access without a new code.'};
 return returned?{kind:'payment-pending',title:'Checking your subscription',detail:'Returning from Stripe does not prove payment. Access stays locked until the server verifies an eligible subscription. Do not pay a second time.'}:{kind:'choose-plan',title:linked?'Account has linked installations':'Connect your extension',detail:linked?'Your Free account has linked installations. Check this browser in the extension. Use the account checkout button when sandbox checkout is enabled. After payment, the same connection receives verified access—no second code.':'Use the approval link from the extension below. Sign-in, subscription and extension approval belong to the same account.'};
}
if(typeof document!=='undefined'){
 const root=document.querySelector('[data-account-page="account"]');
 if(root){
  const n=(tag,text,attrs={})=>{const x=document.createElement(tag);if(text)x.textContent=text;for(const[k,v]of Object.entries(attrs))x.setAttribute(k,v);return x;};
  const card=n('section','',{class:'account-card','data-connection-success':'',hidden:''}),title=n('h2','Finishing your connection'),detail=n('p',''),status=n('p','',{role:'status','aria-live':'polite'}),actions=n('div','',{class:'actions'}),open=n('a','Open ChatGPT',{href:'https://chatgpt.com/',target:'_blank',rel:'noopener noreferrer',class:'btn',hidden:''}),check=n('button','Check activation',{type:'button',class:'btn outline'});
  actions.append(open,check);card.append(n('p','CONNECT → VERIFY ACCESS → RETURN TO CHATGPT',{class:'eyebrow'}),title,detail,status,actions);root.prepend(card);
  const content=root.querySelector('[data-account-content]');let serial=0,busy=false,timer=null,attempts=0,stopped=false,queued=false,approvedHere=false;
  const params=new URLSearchParams(location.search),returned=params.get('checkout')==='returned';let inFlow=returned||params.get('flow')==='extension'||/link=/.test(location.hash);
  async function api(action,body,endpoint='account'){
   let r;try{r=await fetch('/api/'+endpoint+'?action='+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:body===undefined?{}:{'Content-Type':'application/json','X-ChatDrobe-Request':'account-v1'},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw Error('Could not reach ChatDrobe. Keep this page open and retry without starting another purchase.');}
   let v;try{v=await r.json();}catch{throw Error('ChatDrobe returned an unreadable response. Retry without starting another purchase.');}if(!r.ok){const e=Error(v.error?.message||'Unable to check access.');e.code=v.error?.code;e.status=r.status;throw e;}return v;
  }
  function cancel(){serial++;clearTimeout(timer);timer=null;card.hidden=true;status.textContent='';}
  async function update(reconcile=false){
   if(stopped)return;if(busy){queued=true;return;}busy=true;const ticket=++serial;check.disabled=true;clearTimeout(timer);timer=null;
   try{
    let profile=await api('me');if(ticket!==serial)return;
    let verificationError='';
    if(reconcile&&!profile.access?.complimentary){try{await api('entitlement',{},'billing');profile=await api('me');}catch(e){verificationError=e.message;}}
    const[devices,diagnostic]=await Promise.all([api('devices'),api('health',undefined,'extension')]);if(ticket!==serial)return;
    const linked=devices.devices?.length>0,s=connectionState(profile,linked,diagnostic.signing,returned,!!verificationError,approvedHere);
    card.hidden=false;card.dataset.state=s.kind;title.textContent=s.title;detail.textContent=s.detail;open.hidden=!['needs-extension-check','needs-connection'].includes(s.kind);status.textContent=verificationError;
    if(s.kind==='setup-required'&&profile.access?.complimentary)status.textContent=`Operator: check BILLING_SIGNING_PRIVATE_KEY in Vercel Production and redeploy. Expected public key ID: ${diagnostic.signing?.expectedKeyId||'see extension configuration'}. Status: ${diagnostic.signing?.status||'unavailable'}. Never paste a private key into this website.`;
    // Bounded return checks; hidden pages do not poll.
    if(returned&&s.kind==='payment-pending'&&!verificationError&&attempts<3&&!document.hidden){const wait=[2000,4000,8000][attempts++];timer=setTimeout(()=>update(true),wait);}
   }catch(e){if(ticket!==serial)return;if(e.status===401||e.status===403){card.hidden=true;}else{card.hidden=false;card.dataset.state='error';title.textContent='Unable to check account access';status.textContent=e.message;open.hidden=true;}}
   finally{busy=false;check.disabled=false;if(queued&&!stopped){queued=false;update(returned);}}
  }
  check.addEventListener('click',()=>{attempts=0;update(returned);});
  window.addEventListener('chatdrobe:link-approved',event=>{approvedHere=event.detail?.approved===true;inFlow=true;update(returned);});
  window.addEventListener('focus',()=>{if(inFlow&&!busy)update(returned);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=null;}});
  window.addEventListener('pagehide',e=>{stopped=!e.persisted;cancel();});
  window.addEventListener('pageshow',e=>{if(e.persisted){stopped=false;if(inFlow)update(returned);}});
  if(content)new MutationObserver(()=>{if(content.hidden)cancel();}).observe(content,{attributes:true,attributeFilter:['hidden']});
  if(inFlow)update(returned);
 }
}
