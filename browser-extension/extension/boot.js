/* Appearance stays small. Living and idle modules are loaded only after explicit opt-in. */
(()=>{
 'use strict';
 if(location.origin!=='https://chatgpt.com'||!globalThis.ChatDrobeAdapter)return;
 const adapter=ChatDrobeAdapter.create(document);
 let revision=-1,current=null,focus=null,idle=null,loading=null,living=null,livingLoading=null,livingError='',hiddenPage=false;
 function naturalCompanion(){return !!current&&ChatDrobePrefs.experience(current).kind==='companion';}
 function syncIdle(){
  const effective=(current?.livingEnabled||naturalCompanion())?{...current,enabled:false}:current;
  if(idle){idle.configure(effective);return;}
  if(!effective?.enabled||effective.idleMode==='off'||hiddenPage)return;
  if(!loading)loading=import(chrome.runtime.getURL('idle.js')).then(m=>{idle=m.createIdleController(document,window);if(!hiddenPage)idle.configure((current?.livingEnabled||naturalCompanion())?{...current,enabled:false}:current);}).catch(()=>{loading=null;});
 }
 function livingPrefs(){return naturalCompanion()&&!current?.livingEnabled?{...current,livingEnabled:true,livingWorld:'tokyo',livingView:'portal',livingWeather:'clear',livingCompanionOnly:true}:current;}
 function syncLiving(){
  const configured=livingPrefs();
  if(living){living.configure(hiddenPage?{...livingPrefs(),enabled:false}:livingPrefs(),focus);return;}
  if(!current?.enabled||!configured?.livingEnabled||hiddenPage)return;
  if(!livingLoading)livingLoading=import(chrome.runtime.getURL('living/engine.mjs')).then(m=>{living=m.createEnvironment(document,window);livingError='';living.configure(hiddenPage?{...livingPrefs(),enabled:false}:livingPrefs(),focus);}).catch(error=>{livingLoading=null;livingError=error.message||'Engine module did not load. Reload the extension and refresh this tab.';});
 }
 function receive(snapshot){
  if(!snapshot||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<revision)return;
  revision=snapshot.revision;current=ChatDrobePrefs.prefs(snapshot.prefs);focus=snapshot.focus||null;
  adapter.apply((current.livingEnabled||naturalCompanion())?{...current,decoration:false,motion:false}:current);syncIdle();syncLiving();
 }
 function experienceStatus(){
  const selected=ChatDrobePrefs.experience(current),base={revision,...selected,visible:false,action:''};
  if(!current||revision<0)return {...base,state:'loading',reason:'Waiting for saved settings.'};
  if(!current.enabled)return {...base,state:'off',reason:'ChatDrobe is off on this device.'};
  if(hiddenPage)return {...base,state:'paused',reason:'This ChatGPT page is suspended.',action:'Return to the ChatGPT tab.'};
  if(selected.kind==='living'||selected.kind==='companion'){
   if(livingError)return {...base,state:'blocked',reason:livingError,action:'Reload the extension and refresh ChatGPT.'};
   const rendered=living?.diagnostics();
   if(!rendered)return {...base,state:'loading',reason:'Loading the selected world.'};
   return {...base,state:rendered.state,visible:rendered.visible,reason:rendered.reason,action:rendered.action||'',motionAllowed:rendered.motionAllowed,compact:!!rendered.layout?.compact};
  }
  const applied=document.documentElement?.getAttribute('data-md-enabled')==='true';
  return {...base,state:applied?'applied':'loading',visible:applied&&!document.hidden,reason:applied?'Theme settings reached this ChatGPT tab.':'Waiting for appearance settings to reach the page.'};
 }
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
  if(sender.id!==chrome.runtime.id||m?.scope!=='mooddock')return false;
  if(m.kind==='prefs'){receive(m.snapshot);respond({ok:true});}
  if(m.kind==='diagnostics')respond({ok:true,experience:experienceStatus(),stats:adapter.diagnostics(),idle:idle?.diagnostics()||{loaded:false,enabled:false,running:false,pendingTimer:false},living:living?.diagnostics()||{loaded:false,active:false,state:livingError?'blocked':'off',reason:livingError||'Off'}});
  if(m.kind==='idle-preview'){if(current?.livingEnabled||naturalCompanion())respond({ok:false,error:'Turn Living Worlds off before using a separate idle companion.'});else if(!idle)respond({ok:false,error:'Enable the companion, then try again.'});else respond(idle.preview());}
  return false;
 });
 function refresh(){chrome.runtime.sendMessage({scope:'mooddock',kind:'read-prefs'}).then(r=>{if(r?.ok)receive(r.snapshot);}).catch(()=>{});}
 refresh();
 window.addEventListener('pagehide',()=>{hiddenPage=true;idle?.configure({...current,enabled:false});living?.configure({...current,enabled:false},focus);});
 window.addEventListener('pageshow',event=>{hiddenPage=false;if(event.persisted)refresh();});
})();
