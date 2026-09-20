/* Owner login and explicit extension pairing. No local/session storage or access token in URLs. */
const root=document.querySelector('[data-account-page]');
if(root){
 const page=root.dataset.accountPage;
 const linkCode=()=>{const value=new URLSearchParams(location.hash.slice(1)).get('link')||'';return /^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(value)?value:'';};
 const fragment=()=>linkCode()?'#link='+encodeURIComponent(linkCode()):'';
 function node(tag,text,attrs={}){const n=document.createElement(tag);if(text)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
 async function api(action,value){const r=await fetch('/api/account?action='+action,{method:value===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:value===undefined?{}:{'Content-Type':'application/json','X-ChatDrobe-Request':'account-v1'},body:value===undefined?undefined:JSON.stringify(value)});const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Account request failed.');return v;}
 if(page==='signin'||page==='signup'){
  const box=node('section','',{class:'account-card'}),title=node('h2','Owner login'),notice=node('p','Owner login is available only when server credentials are configured. It does not grant Premium.'),status=node('p','Checking owner login…',{role:'status'});
  const form=node('form'),email=node('input','',{type:'email',name:'email',autocomplete:'username',required:'',maxlength:'254',id:'owner-email'}),password=node('input','',{type:'password',name:'password',autocomplete:'current-password',required:'',maxlength:'128',id:'owner-password'}),button=node('button','Sign in as owner',{type:'submit',class:'btn'});
  form.append(node('label','Owner email',{for:'owner-email'}),email,node('label','Owner password',{for:'owner-password'}),password,button);form.hidden=true;box.append(title,notice,status,form);root.append(box);
  api('status').then(v=>{form.hidden=!v.ownerLoginAvailable;status.textContent=v.ownerLoginAvailable?'Use the owner credentials configured in Vercel.':'Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH in Vercel, then redeploy. Public email signup is a separate flow.';}).catch(()=>{status.textContent='Unable to check owner login.';});
  let busy=false;form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;button.disabled=true;try{await api('owner-login',{email:email.value,password:password.value});password.value='';const next=new URLSearchParams(location.search).get('next');location.assign((next==='admin'?'/admin/':'/account/')+fragment());}catch(err){status.textContent=err.message;password.value='';}finally{busy=false;button.disabled=false;}});
 }
 if(page==='account'){
  const card=node('section','',{class:'account-card'}),status=node('p','',{role:'status'}),form=node('form'),input=node('input','',{id:'extension-link-code',name:'code',maxlength:'23',autocomplete:'off',required:''}),confirm=node('input','',{type:'checkbox',required:'',id:'link-confirm'}),button=node('button','Connect this extension',{type:'submit',class:'btn'}),list=node('div');
  input.value=linkCode();const label=node('label',null,{class:'account-check'});label.append(confirm,node('span','I started this connection in my own ChatDrobe extension, and both codes match.'));
  form.append(node('label','Code shown in your extension',{for:'extension-link-code'}),input,label,button);
  card.append(node('h2','Connected extensions'),node('p','Approve only a code displayed in your own installed extension. This links your account, not an admin role or a free Premium grant.'),status,form,list);card.hidden=true;root.append(card);
  const signedOut=root.querySelector('[data-account-signedout]');if(signedOut){const login=signedOut.querySelector('a[href*="signin"]');if(login)login.href='/signin/?next=account'+fragment();}
  const content=root.querySelector('[data-account-content]');
  if(content)new MutationObserver(()=>{if(content.hidden){card.hidden=true;list.replaceChildren();status.textContent='';}}).observe(content,{attributes:true,attributeFilter:['hidden']});
  async function showDevices(){const result=await api('devices');list.replaceChildren(node('h3','Your linked installations'));if(!result.devices.length)list.append(node('p','No extensions linked yet.'));
   for(const device of result.devices){const row=node('p',`Extension ${device.extension_id.slice(0,8)}… · linked ${new Date(device.linked_at).toLocaleDateString()} `),remove=node('button','Disconnect',{type:'button',class:'plain'});remove.addEventListener('click',async()=>{if(!window.confirm('Disconnect this installation? Cached access expires within ten minutes. Local notes remain unchanged.'))return;remove.disabled=true;try{await api('revoke-device',{deviceId:device.id});await showDevices();}catch(e){status.textContent=e.message;remove.disabled=false;}});row.append(remove);list.append(row);}
  }
  api('me').then(v=>{if(!v.extensionLinkingAvailable)return;card.hidden=false;const notice=content?.querySelector('.notice-box');if(notice)notice.textContent='Sandbox payments use no real money. Use extension v0.6.0 to connect your account and verify Test Plus. A website account alone does not grant Premium.';return showDevices();}).catch(()=>{});
  let busy=false;form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;button.disabled=true;try{await api('link-extension',{code:input.value,confirmed:confirm.checked});history.replaceState(null,'',location.pathname+location.search);input.value='';confirm.checked=false;status.textContent='Connected. Return to ChatDrobe and choose Check connection / refresh access. Your subscription will be verified.';await showDevices();}catch(err){status.textContent=err.message;}finally{busy=false;button.disabled=false;}});
 }
}
