/* First-party activation UI. URL flags select a view, never grant access. */
export function linkCode(hash=''){
 const value=new URLSearchParams(hash.replace(/^#/, '')).get('link')||'';
 return /^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(value)?value:'';
}
export function linkFragment(hash=''){const code=linkCode(hash);return code?'#link='+encodeURIComponent(code):'';}
export function authLink(path,search='',hash=''){
 if(!['/signin/','/signup/'].includes(path))throw Error('Unsupported sign-in route.');
 const params=new URLSearchParams(search),query=new URLSearchParams(),next=params.get('next');
 if(['account','admin'].includes(next))query.set('next',next);
 if(params.get('flow')==='extension')query.set('flow','extension');
 return path+(query.size?'?'+query:'')+linkFragment(hash);
}
export function authDestination(search='',hash=''){
 const params=new URLSearchParams(search);
 return (params.get('next')==='admin'?'/admin/':'/account/'+(params.get('flow')==='extension'?'?flow=extension':''))+linkFragment(hash);
}
export function connectionState(profile,linked,signing,returned=false,verificationFailed=false,approvedHere=false,pendingApproval=false){
 if(!profile?.user)return {kind:'signed-out',title:'Sign in to connect ChatDrobe',detail:'Use the account that owns your subscription.'};
 if(verificationFailed&&!profile.access?.complimentary)return {kind:'payment-pending',title:'Subscription verification needs a retry',detail:'Payment verification failed. Your connection is saved; do not purchase again.'};
 if(pendingApproval&&!approvedHere)return {kind:'needs-approval',title:'Approve this extension',detail:'Compare the attached code with your extension, confirm it below, then connect. Your selected world stays saved in the extension.'};
 const eligible=profile.access?.premium===true;
 if(eligible&&(!signing?.ready||signing.matchesExtension!==true))return {kind:'setup-required',title:'Account connected — Premium setup needs attention',detail:signing?.status==='key_mismatch'?'The server key does not match this release. The operator must restore the matching key.':'The server cannot issue matching Premium access yet. Keep this connection; do not buy again.'};
 if(eligible&&approvedHere)return {kind:'needs-extension-check',title:'Connection approved — verify in ChatDrobe',detail:'Return to the extension to verify Premium and apply your saved world. This website cannot confirm the installed extension or page state.'};
 if(eligible)return {kind:'needs-connection',title:profile.access?.complimentary?'Admin Premium recognized — check your extension':'Premium recognized — check your extension',detail:'Open ChatDrobe and check access, or use Sign in / connect account if disconnected. Other linked installations do not confirm this browser. A connected extension needs no new code.'};
 if(approvedHere)return {kind:'connected-free',title:'Extension connected — Free account',detail:'Your connection is saved. Free themes remain available. Premium worlds require eligible account access; signing in does not unlock them.'};
 return returned?{kind:'payment-pending',title:'Checking your subscription',detail:'Stripe return links do not prove payment. Access stays locked until verified. Do not pay a second time.'}:{kind:'choose-plan',title:linked?'Account has linked installations':'Connect your extension',detail:linked?'Your Free account has linked installations. Check this browser in the extension. Sandbox checkout, when enabled, updates the same connection—no second code.':'Use your extension’s approval link to connect this account.'};
}
if(typeof document!=='undefined'){
 const root=document.querySelector('[data-account-page="account"]');
 if(root){
  const n=(tag,text,attrs={})=>{const x=document.createElement(tag);if(text)x.textContent=text;for(const[k,v]of Object.entries(attrs))x.setAttribute(k,v);return x;};
  const card=n('section','',{class:'account-card','data-connection-success':'',hidden:''}),title=n('h2','Finishing your connection'),detail=n('p',''),status=n('p','',{role:'status','aria-live':'polite'}),actions=n('div','',{class:'actions'}),approve=n('button','Review connection code',{type:'button',class:'btn',hidden:''}),open=n('a','Open ChatGPT',{href:'https://chatgpt.com/',target:'_blank',rel:'noopener noreferrer',class:'btn',hidden:''}),check=n('button','Check activation',{type:'button',class:'btn outline'});
  actions.append(approve,open,check);card.append(n('p','SIGN IN → CONNECT EXTENSION → APPLY WORLD',{class:'eyebrow'}),title,detail,status,actions);root.prepend(card);
  const content=root.querySelector('[data-account-content]');let serial=0,busy=false,timer=null,attempts=0,stopped=false,queued=false,approvedHere=false;
  const params=new URLSearchParams(location.search),returned=params.get('checkout')==='returned';let inFlow=returned||params.get('flow')==='extension'||/link=/.test(location.hash);
  async function api(action,body,endpoint='account'){
   let r;try{r=await fetch('/api/'+endpoint+'?action='+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:body===undefined?{}:{'Content-Type':'application/json','X-ChatDrobe-Request':'account-v1'},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw Error('Could not reach ChatDrobe. Retry here; do not purchase again.');}
   let v;try{v=await r.json();}catch{throw Error('Unreadable ChatDrobe response. Retry; do not purchase again.');}if(!r.ok){const e=Error(v.error?.message||'Unable to check access.');e.code=v.error?.code;e.status=r.status;throw e;}return v;
  }
  function cancel(){serial++;clearTimeout(timer);timer=null;card.hidden=true;status.textContent='';}
  async function update(reconcile=false){
   if(stopped)return;if(busy){queued=true;return;}busy=true;const ticket=++serial;check.disabled=true;clearTimeout(timer);timer=null;
   try{
    let profile=await api('me');if(ticket!==serial)return;
    let verificationError='';
    if(reconcile&&!profile.access?.complimentary){try{await api('entitlement',{},'billing');profile=await api('me');}catch(e){verificationError=e.message;}}
    const[devices,diagnostic]=await Promise.all([api('devices').catch(e=>{if(e.status===401||e.status===403)throw e;return {devices:[]};}),api('health',undefined,'extension')]);if(ticket!==serial)return;
    const linked=devices.devices?.length>0,s=connectionState(profile,linked,diagnostic.signing,returned,!!verificationError,approvedHere,!!linkCode(location.hash));
    card.hidden=false;card.dataset.state=s.kind;title.textContent=s.title;detail.textContent=s.detail;approve.hidden=s.kind!=='needs-approval';open.hidden=!['needs-extension-check','needs-connection'].includes(s.kind);status.textContent=verificationError;
    if(s.kind==='setup-required'&&profile.access?.complimentary)status.textContent=`Operator: check BILLING_SIGNING_PRIVATE_KEY in Vercel Production and redeploy. Expected public key ID: ${diagnostic.signing?.expectedKeyId||'see extension configuration'}. Status: ${diagnostic.signing?.status||'unavailable'}. Never paste a private key into this website.`;
    if(returned&&s.kind==='payment-pending'&&!verificationError&&attempts<3&&!document.hidden){const wait=[2000,4000,8000][attempts++];timer=setTimeout(()=>update(true),wait);}
   }catch(e){if(ticket!==serial)return;if(e.status===401||e.status===403){card.hidden=true;}else{card.hidden=false;card.dataset.state='error';title.textContent='Unable to check account access';status.textContent=e.message;open.hidden=true;approve.hidden=true;}}
   finally{busy=false;check.disabled=false;if(queued&&!stopped){queued=false;update(returned);}}
  }
  approve.addEventListener('click',()=>root.querySelector('#extension-link-code')?.focus());
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
