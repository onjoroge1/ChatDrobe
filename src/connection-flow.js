/* First-party activation UI. URL flags select a view, never grant access. */
export function connectionState(profile,linked,signing,returned=false){
 if(!profile?.user)return {kind:'signed-out',title:'Sign in to connect ChatDrobe',detail:'Use the account that owns your subscription.'};
 const eligible=profile.access?.premium===true||profile.subscription?.plan==='test_plus';
 if(eligible&&(!signing?.ready||signing.matchesExtension!==true))return {kind:'setup-required',title:'Account connected — Premium setup needs attention',detail:signing?.status==='key_mismatch'?'The server key does not match this extension release. Keep this account linked; the operator must restore the matching signing key.':'Your membership is recognized, but the server cannot issue matching Premium access yet. Keep your connection; do not buy again or generate another code.'};
 if(eligible&&linked)return {kind:'ready',title:profile.access?.complimentary?'Admin Premium is ready':'Premium is ready',detail:'Your account and an extension connection are verified. Return to ChatGPT; the extension checks its signed access and applies the selected world. No code is needed for each theme.'};
 if(eligible)return {kind:'needs-connection',title:'Premium recognized — connect your extension',detail:'Open ChatDrobe in Chrome and choose Sign in / connect account. Use its approval link; your code will be filled in here.'};
 return returned?{kind:'payment-pending',title:'Checking your subscription',detail:'Returning from Stripe does not prove payment. Access stays locked until the server verifies an eligible subscription. Do not pay a second time.'}:{kind:'choose-plan',title:linked?'Account connected':'Connect your extension',detail:linked?'Your Free account is linked. Use the account checkout button when sandbox checkout is enabled. After payment, the same connection receives verified access—no second code.':'Use the approval link from the extension below. Sign-in, subscription and extension approval belong to the same account.'};
}
if(typeof document!=='undefined'){
 const root=document.querySelector('[data-account-page="account"]');
 if(root){
  const n=(tag,text,attrs={})=>{const x=document.createElement(tag);if(text)x.textContent=text;for(const[k,v]of Object.entries(attrs))x.setAttribute(k,v);return x;};
  const card=n('section','',{class:'account-card','data-connection-success':'',hidden:''}),title=n('h2','Finishing your connection'),detail=n('p',''),status=n('p','',{role:'status','aria-live':'polite'}),actions=n('div','',{class:'actions'}),open=n('a','Open ChatGPT',{href:'https://chatgpt.com/',target:'_blank',rel:'noopener noreferrer',class:'btn',hidden:''}),check=n('button','Check activation',{type:'button',class:'btn outline'});
  actions.append(open,check);card.append(n('p','CONNECT → VERIFY ACCESS → RETURN TO CHATGPT',{class:'eyebrow'}),title,detail,status,actions);root.prepend(card);
  const content=root.querySelector('[data-account-content]');let serial=0,busy=false,timer=null,attempts=0,stopped=false;
  const params=new URLSearchParams(location.search),returned=params.get('checkout')==='returned';let inFlow=returned||params.get('flow')==='extension'||/link=/.test(location.hash);
  async function api(action,body,endpoint='account'){
   let r;try{r=await fetch('/api/'+endpoint+'?action='+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:body===undefined?{}:{'Content-Type':'application/json','X-ChatDrobe-Request':'account-v1'},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw Error('Could not reach ChatDrobe. Keep this page open and retry; your account connection is saved.');}
   let v;try{v=await r.json();}catch{throw Error('ChatDrobe returned an unreadable response. Retry without starting another purchase.');}if(!r.ok){const e=Error(v.error?.message||'Unable to check access.');e.code=v.error?.code;e.status=r.status;throw e;}return v;
  }
  function cancel(){serial++;clearTimeout(timer);timer=null;card.hidden=true;status.textContent='';}
  async function update(reconcile=false){
   if(busy||stopped)return;busy=true;const ticket=++serial;check.disabled=true;clearTimeout(timer);timer=null;
   try{
    let profile=await api('me');if(ticket!==serial)return;
    let verificationError='';
    if(reconcile&&!profile.access?.complimentary){try{await api('entitlement',{},'billing');profile=await api('me');}catch(e){verificationError=e.message;}}
    const[devices,diagnostic]=await Promise.all([api('devices'),api('health',undefined,'extension')]);if(ticket!==serial)return;
    const linked=devices.devices?.length>0,s=connectionState(profile,linked,diagnostic.signing,returned);
    card.hidden=false;card.dataset.state=s.kind;title.textContent=s.title;detail.textContent=s.detail;open.hidden=s.kind!=='ready';status.textContent=verificationError;
    if(s.kind==='setup-required'&&profile.access?.complimentary)status.textContent=`Operator: check BILLING_SIGNING_PRIVATE_KEY in Vercel Production and redeploy. Expected public key ID: ${diagnostic.signing?.expectedKeyId||'see extension configuration'}. Status: ${diagnostic.signing?.status||'unavailable'}. Never paste a private key into this website.`;
    // Bounded reconciliation following the Stripe return; no polling while hidden and no loop on setup errors.
    if(returned&&s.kind==='payment-pending'&&!verificationError&&attempts<3&&!document.hidden){const wait=[2000,4000,8000][attempts++];timer=setTimeout(()=>update(true),wait);}
   }catch(e){if(ticket!==serial)return;if(e.status===401||e.status===403){card.hidden=true;}else{card.hidden=false;card.dataset.state='error';title.textContent='Connection saved — unable to check activation';status.textContent=e.message;open.hidden=true;}}
   finally{busy=false;check.disabled=false;}
  }
  check.addEventListener('click',()=>{attempts=0;update(returned);});
  window.addEventListener('chatdrobe:link-approved',()=>{inFlow=true;update(returned);});
  window.addEventListener('focus',()=>{if(inFlow&&!busy)update(returned);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=null;}});
  window.addEventListener('pagehide',()=>{stopped=true;cancel();});
  if(content)new MutationObserver(()=>{if(content.hidden)cancel();}).observe(content,{attributes:true,attributeFilter:['hidden']});
  if(inFlow)update(returned);
 }
}
