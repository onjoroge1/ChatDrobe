/* Event-driven broker. Page scripts receive only effective appearance preferences. */
'use strict';
importScripts('prefs.js','core.js','commerce-config.js','access.js','focus-state.js','entitlement.js','billing-client.js');
const PREF_KEY='mooddock:prefs-v2',ACCESS_KEY='chatdrobe:access-beta-v1';
const FOCUS_KEY='chatdrobe:focus-v1',FOCUS_ALARM='chatdrobe:focus-complete';
let queue=Promise.resolve(),ready=null;
const billing=ChatDrobeCommerceConfig.channel==='sandbox'?ChatDrobeBilling.create({storage:chrome.storage.local,alarms:chrome.alarms,config:ChatDrobeCommerceConfig,extensionId:chrome.runtime.id}):null;
const PENDING='chatdrobe:pending-upgrade-v1';
async function currentAccess(raw){return billing?billing.status():ChatDrobeAccess.access(raw||{},ChatDrobeCommerceConfig);}
// Persist the exact bounded visual request, without account data or text-inspection permission.
function safeTarget(value={},current={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Choose a supported experience.');
 const canonical=Object.hasOwn(value,'kind');
 const legacy={...current,...value};
 if(!canonical&&Object.hasOwn(value,'theme')&&value.livingEnabled!==true&&value.idleMode!=='natural'){legacy.livingEnabled=false;legacy.idleMode='off';}
 const selection=canonical?value:MoodDockCore.experience(legacy);
 const selected=MoodDockCore.selectExperience(current,selection);
 const fields=['enabled','theme','motion','idleMode','companion','livingEnabled','livingWorld','livingMotion','livingBehavior','livingReactions','decoration','accent','livingWeather'];
 const result=Object.fromEntries(fields.map(key=>[key,selected[key]]));
 const engineFields=['theme','motion','idleMode','companion','livingEnabled','livingWorld','livingMotion','livingBehavior'];
 const optional=Object.keys(MoodDockCore.DEFAULTS).filter(key=>key!=='wordBitesConsent'&&(!canonical||!engineFields.includes(key)));
 const normalized=MoodDockCore.prefs({...selected,...Object.fromEntries(optional.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]])),wordBitesConsent:false});
 for(const key of optional)if(Object.hasOwn(value,key))result[key]=normalized[key];
 return result;
}
async function updateBillingSnapshot(){
 const run=queue.catch(()=>{}).then(async()=>{await initialize();const saved=await chrome.storage.local.get(['mooddock',ACCESS_KEY,PENDING]);let state=MoodDockCore.state(saved.mooddock);const access=await currentAccess(saved[ACCESS_KEY]);
 if(access.premium&&saved[PENDING]){state=MoodDockCore.reduce(state,{type:'settings',value:safeTarget(saved[PENDING],state.prefs)});await chrome.storage.local.set({mooddock:state,[PENDING]:null});}
 await snapshotFor(state,access);return access;});queue=run;return run;
}

async function settleFocus(){
 const raw=(await chrome.storage.local.get(FOCUS_KEY))[FOCUS_KEY]||{};
 const value=ChatDrobeFocus.settle(raw,Date.now());
 if(JSON.stringify(raw)!==JSON.stringify(value))await chrome.storage.local.set({[FOCUS_KEY]:value});
 if(value.session?.status==='running'){
  const alarm=await chrome.alarms?.get(FOCUS_ALARM);
  if(!alarm||Math.abs(alarm.scheduledTime-value.session.end)>500)await chrome.alarms?.create(FOCUS_ALARM,{when:value.session.end});
 }else await chrome.alarms?.clear(FOCUS_ALARM);
 return value;
}
async function changeFocus(end){
 const previous=await settleFocus(),now=Date.now();
 const value=end?ChatDrobeFocus.start(previous,end,now,crypto.randomUUID()):ChatDrobeFocus.cancel(previous,now);
 await chrome.storage.local.set({[FOCUS_KEY]:value});await settleFocus();
}

function initialize(){
 if(!ready)ready=(async()=>{
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
  if(billing)await billing.initialize();
  const initial=(await chrome.storage.local.get(PREF_KEY))[PREF_KEY];
  if(!initial||!Number.isSafeInteger(initial.revision)||initial.revision<0||!initial.prefs){
   const state=MoodDockCore.state((await chrome.storage.local.get('mooddock')).mooddock);
   const access=await currentAccess((await chrome.storage.local.get(ACCESS_KEY))[ACCESS_KEY]);
   await chrome.storage.local.set({[PREF_KEY]:{revision:0,prefs:ChatDrobeAccess.effective(state.prefs,access),focus:null}});
  }
 })().catch(e=>{ready=null;throw e;});return ready;
}
function role(sender){try{const u=new URL(sender.url);if(u.protocol==='chrome-extension:'&&u.hostname===chrome.runtime.id){if(u.pathname==='/workspace.html')return 'workspace';if(u.pathname==='/upgrade.html')return 'upgrade';if(u.pathname==='/account.html')return 'account';}if(u.origin==='https://chatgpt.com')return 'page';}catch{}return '';}
async function broadcast(snapshot){
 const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
 await Promise.allSettled(tabs.filter(t=>Number.isInteger(t.id)).map(t=>chrome.tabs.sendMessage(t.id,{scope:'mooddock',kind:'prefs',snapshot})));
}
async function snapshotFor(state,access){
 const prior=(await chrome.storage.local.get(PREF_KEY))[PREF_KEY];
 const prefs=ChatDrobeAccess.effective(state.prefs,access);
 const focus=(await settleFocus()).session;
 if(prior&&Number.isSafeInteger(prior.revision)&&prior.revision>=0&&JSON.stringify(prior.prefs)===JSON.stringify(prefs)&&JSON.stringify(prior.focus||null)===JSON.stringify(focus))return prior;
 const snapshot={revision:(Number.isSafeInteger(prior?.revision)?prior.revision:0)+1,prefs,focus};
 await chrome.storage.local.set({[PREF_KEY]:snapshot});await broadcast(snapshot);return snapshot;
}
chrome.runtime.onInstalled.addListener(()=>{initialize().catch(console.error);});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||message?.scope!=='mooddock')return false;
 const from=role(sender),k=message.kind;
 if(['billing-status','billing-start','billing-refresh','billing-disconnect','billing-website','billing-return'].includes(k)){
  if(!billing||!['workspace','upgrade','account'].includes(from)){respond({ok:false,error:'Account actions are available only inside this extension.'});return false;}
  (async()=>{
   try{await initialize();let result;
    if(k==='billing-start'){
     if(!await chrome.permissions.contains({origins:['https://www.chatdrobe.com/*']}))throw Error('Open Account and allow website access before connecting.');
     result=await billing.start();await chrome.tabs.create({url:result.verificationUrl});
    }else if(k==='billing-refresh')result=await billing.refresh();
    else if(k==='billing-disconnect'){result=await billing.disconnect();await chrome.storage.local.set({[PENDING]:null});}
    else if(k==='billing-website'){
     result=await billing.status();await chrome.tabs.create({url:result.verificationUrl||'https://www.chatdrobe.com/account/?flow=extension'});
    }else if(k==='billing-return'){
     result=await billing.ensure();await updateBillingSnapshot();
     if(!result.premium)throw Error(result.lastError||'Premium has not been verified. Check access before returning.');
     const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*'});
     const target=tabs.find(t=>t.active)||tabs[0];
     if(Number.isInteger(target?.id)){await chrome.tabs.update(target.id,{active:true});if(Number.isInteger(target.windowId))await chrome.windows?.update(target.windowId,{focused:true});}
     else await chrome.tabs.create({url:'https://chatgpt.com/'});
    }
    else result=await billing.ensure();
    await updateBillingSnapshot();respond({ok:true,billing:result});
   }catch(e){respond({ok:false,error:e.message||'Account operation failed.'});}
  })();return true;
 }
 if(k==='open-account'&&['workspace','upgrade'].includes(from)){
  chrome.tabs.create({url:chrome.runtime.getURL('account.html')}).then(()=>respond({ok:true})).catch(()=>respond({ok:false,error:'Unable to open account.'}));return true;
 }
 const allowed=from==='workspace'||from==='page'&&k==='read-prefs'||from==='upgrade'&&['commerce-status','start-checkout'].includes(k);
 if(!allowed){respond({ok:false,error:'This action is available only in the extension workspace.'});return false;}
 queue=queue.catch(()=>{}).then(async()=>{
  try{
   await initialize();
   const saved=await chrome.storage.local.get(['mooddock',ACCESS_KEY]);
   let rawAccess=saved[ACCESS_KEY]||{},access=await currentAccess(rawAccess),state=MoodDockCore.state(saved.mooddock);
   if(k==='living-state'){respond({ok:true,progress:await settleFocus()});return;}
   if(k==='living-reset-progress'){await chrome.storage.local.set({[FOCUS_KEY]:ChatDrobeFocus.normalize()});state=MoodDockCore.reduce(state,{type:'timer',value:0});await chrome.storage.local.set({mooddock:state});await snapshotFor(state,access);respond({ok:true,progress:await settleFocus()});return;}
   if(k==='commerce-status'){respond({ok:true,access,checkout:ChatDrobeAccess.checkout()});return;}
   if(k==='start-checkout'){if(!billing)throw new Error(ChatDrobeAccess.checkout().reason);await chrome.tabs.create({url:chrome.runtime.getURL('account.html')});respond({ok:true});return;}
   if(k==='open-upgrade'){
    const target=safeTarget(message.target||{theme:message.world},state.prefs);
    if(billing){
     access=await billing.ensure();
     if(access.premium){
      state=MoodDockCore.reduce(state,{type:'settings',value:target});
      await chrome.storage.local.set({mooddock:state,[PENDING]:null});
      const snapshot=await snapshotFor(state,access);
      respond({ok:true,applied:true,access,state:{...state,prefs:snapshot.prefs},desiredPrefs:state.prefs,revision:snapshot.revision});return;
     }
     await chrome.storage.local.set({[PENDING]:target});
     // One connection screen, not an upgrade page followed by another connection page.
     await chrome.tabs.create({url:chrome.runtime.getURL('account.html')});
     respond({ok:true,applied:false,connectionRequired:!access.connected,errorHint:access.lastError||''});return;
    }
    const world=MoodDockCore.THEMES.some(t=>t.id===message.world)?message.world:'';
    await chrome.tabs.create({url:chrome.runtime.getURL('upgrade.html')+(world?'?world='+encodeURIComponent(world):'')});respond({ok:true});return;
   }
   if(k==='tester-preview'){
    if(ChatDrobeCommerceConfig.channel!=='private-beta'||!ChatDrobeCommerceConfig.allowTesterPreview)throw new Error('Test preview is unavailable in this build.');
    if(typeof message.enabled!=='boolean')throw new Error('Invalid preview setting.');
    rawAccess={testerPreview:message.enabled};await chrome.storage.local.set({[ACCESS_KEY]:rawAccess});access=await currentAccess(rawAccess);
    const snapshot=await snapshotFor(state,access);respond({ok:true,state:{...state,prefs:snapshot.prefs},desiredPrefs:state.prefs,revision:snapshot.revision,access});return;
   }
   if(k==='diagnostics'||k==='idle-preview'){
    if(k==='idle-preview'&&!access.premium)throw new Error('Connect your account and verify Premium access before previewing a companion.');
    const [tab]=await chrome.tabs.query({url:'https://chatgpt.com/*',active:true,currentWindow:true});
    if(!Number.isInteger(tab?.id))throw new Error('Open ChatGPT in the active tab and refresh it.');
    respond(await chrome.tabs.sendMessage(tab.id,{scope:'mooddock',kind:k}));return;
   }
   if(k==='mutate'){
    const candidate=MoodDockCore.reduce(state,message.action);
    const appearanceChange=['settings','select-experience'].includes(message.action?.type);
    const premiumRequest=appearanceChange&&ChatDrobeAccess.requiresPremium(message.action.type==='select-experience'?candidate.prefs:message.action.value||{});
    if(billing&&premiumRequest)access=await billing.ensure();
    if(premiumRequest&&!access.premium)throw new Error('Premium selection requires an upgrade. Your current free appearance was not changed.');
    if(message.action?.type==='timer')await changeFocus(candidate.timerUntil);
    if(message.action?.type==='restore-backup'){await changeFocus(0);await chrome.storage.local.set({[PENDING]:null});}
    state=candidate;
    // A newer explicit choice supersedes an older request awaiting account access.
    if(['select-experience','settings','reset'].includes(message.action?.type))await chrome.storage.local.set({[PENDING]:null});
    if(message.action?.type==='wipe'){if(billing){await billing.disconnect();await chrome.storage.local.set({[PENDING]:null});}await chrome.storage.local.set({[FOCUS_KEY]:ChatDrobeFocus.normalize()});await chrome.alarms?.clear(FOCUS_ALARM);rawAccess={};access=await currentAccess(rawAccess);await chrome.storage.local.set({[ACCESS_KEY]:rawAccess});}
    await chrome.storage.local.set({mooddock:state});
   }else if(!['read','read-prefs'].includes(k))throw new Error('Unknown request.');
   const snapshot=await snapshotFor(state,access);
   if(k==='read-prefs')respond({ok:true,snapshot});else respond({ok:true,state:{...state,prefs:snapshot.prefs},desiredPrefs:state.prefs,revision:snapshot.revision,access});
  }catch(error){respond({ok:false,error:error.message||'Local storage operation failed.'});}
 });return true;
});

// Alarms survive a sleeping service worker; completion is settled idempotently from persisted state.
function wakeFocus(){queue=queue.catch(()=>{}).then(async()=>{
 await initialize();await settleFocus();const saved=await chrome.storage.local.get(['mooddock',ACCESS_KEY]);
 await snapshotFor(MoodDockCore.state(saved.mooddock),await currentAccess(saved[ACCESS_KEY]||{}));
}).catch(console.error);}
chrome.alarms?.onAlarm.addListener(alarm=>{if(alarm.name===FOCUS_ALARM)wakeFocus();});
chrome.runtime.onStartup?.addListener(wakeFocus);

if(billing){
 chrome.alarms?.onAlarm.addListener(alarm=>{
  if(alarm.name===ChatDrobeBilling.EXPIRY)updateBillingSnapshot().catch(()=>{});
  if(alarm.name===ChatDrobeBilling.REFRESH)billing.refresh().then(updateBillingSnapshot).catch(()=>{});
 });
 chrome.runtime.onStartup?.addListener(()=>{billing.refresh().then(updateBillingSnapshot).catch(()=>{});});
 chrome.tabs.onUpdated?.addListener((id,change,tab)=>{
  if(change.status!=='complete')return;
  try{const u=new URL(tab.url);if(u.origin==='https://www.chatdrobe.com'&&u.pathname==='/account/')billing.refresh().then(updateBillingSnapshot).catch(()=>{});else if(u.origin==='https://chatgpt.com')billing.ensure().then(updateBillingSnapshot).catch(()=>{});}catch{}
 });
}
