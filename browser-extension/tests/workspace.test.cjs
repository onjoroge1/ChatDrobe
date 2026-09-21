const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../extension/core.js'),P=require('../extension/prefs.js'),A=require('../extension/access.js');

// A small DOM fixture executes the actual panel and its event handlers. It does
// not certify browser layout, Chrome IPC, or a live ChatGPT page.
class Node{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.events={};this.value='';this._text='';this.style={setProperty(k,v){this[k]=v;},getPropertyValue(){return '';},getPropertyPriority(){return '';},removeProperty(k){delete this[k];}};this.classList={toggle:(name,on)=>{const set=new Set(this.className.split(' ').filter(Boolean));on?set.add(name):set.delete(name);this.className=[...set].join(' ');}};}
 set className(value){this.attributes.class=value;} get className(){return this.attributes.class||'';}
 set textContent(value){this._text=String(value);this.children=[];} get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 setAttribute(k,v){this.attributes[k]=String(v);} getAttribute(k){return this.attributes[k]??null;}
 removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 append(...nodes){for(let node of nodes){if(typeof node==='string'){const t=new Node('#text');t.textContent=node;node=t;}node.parentNode=this;this.children.push(node);}}
 prepend(...nodes){this.children.unshift(...nodes);for(const n of nodes)n.parentNode=this;}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this._text='';this.append(...nodes);}
 attachShadow(){this.shadowRoot=new Node('#shadow');this.shadowRoot.parentNode=this;return this.shadowRoot;}
 get isConnected(){return this.connected===true||!!this.parentNode?.isConnected;}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 focus(){} click(){return this.dispatch('click');}
 async dispatch(name,extra={}){for(const fn of this.events[name]||[])await fn({target:this,...extra});}
 matches(selector){if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));const attr=selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);if(attr)return this.getAttribute(attr[1])!==null&&(attr[2]===undefined||this.getAttribute(attr[1])===attr[2]);return this.tagName.toLowerCase()===selector.toLowerCase();}
 querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
async function panel({prefs={},premium=true,diagnostics}={}){
 let state=C.state({prefs,notes:'keep local notes'}),allowed=premium,revision=1;
 const messages=[],storageListeners=[],blobs=[],documentEvents={},windowEvents={},timers=new Map();let nextTimer=0;
 const html=new Node('html');html.connected=true;
 const document={documentElement:html,body:new Node('body'),hidden:false,createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),createTextNode:text=>{const n=new Node('#text');n.textContent=text;return n;},getElementById:id=>html.querySelectorAll('[id]').find(n=>n.id===id)||null,addEventListener:(name,fn)=>(documentEvents[name]??=[]).push(fn)};
 const effective=()=>C.state({...state,prefs:A.effective(state.prefs,{premium:allowed})});
 const response=()=>({ok:true,state:effective(),desiredPrefs:state.prefs,revision,access:{premium:allowed,testSubscription:allowed,accessSource:allowed?'test':'free'}});
 const chrome={runtime:{id:'test',getManifest:()=>({version:'0.8.0'}),onMessage:{addListener(){}},async sendMessage(message){messages.push(message);if(message.kind==='mutate'){state=C.reduce(state,message.action);revision++;}
  if(message.kind==='open-upgrade')return {ok:true};
  if(message.kind==='diagnostics')return diagnostics?.(effective(),revision)||{ok:true,experience:{...P.experience(effective().prefs),revision,state:'displayed',visible:true}};
  return response();}},storage:{onChanged:{addListener:fn=>storageListeners.push(fn)}}};
 const window={innerWidth:400,addEventListener:(name,fn)=>(windowEvents[name]??=[]).push(fn),confirm:()=>true,matchMedia:()=>({matches:false})};
 const timeout=(fn,delay=0)=>{if(delay<1000)return setTimeout(fn,0);const id='timer-'+(++nextTimer);timers.set(id,{fn,delay});return id;};
 const clear=id=>{if(timers.has(id))timers.delete(id);else clearTimeout(id);};
 const context={MoodDockCore:C,ChatDrobePrefs:P,ChatDrobeAccess:A,ChatDrobeCommerceConfig:{},MoodDockPanelCSS:'',document,window,chrome,location:{protocol:'chrome-extension:'},crypto:require('node:crypto').webcrypto,URL:class extends URL{static createObjectURL(blob){blobs.push(blob);return 'blob:test';}static revokeObjectURL(){}},Blob,setTimeout:timeout,clearTimeout:clear,confirm:window.confirm,navigator:{},console};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/workspace.js'),'utf8'),context);
 const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
 await settle();const shadow=html.children.find(n=>n.id==='mooddock-root').shadowRoot;
 const find=(tag,label)=>shadow.querySelectorAll(tag).find(n=>n.getAttribute('aria-label')===label||n.textContent===label);
 return {shadow,messages,blobs,settle,state:()=>state,find,pendingChecks:()=>[...timers.values()].filter(t=>t.delay===3000).length,async poll(){for(const [id,timer]of [...timers])if(timer.delay===3000){timers.delete(id);await timer.fn();}await settle();},async visibility(hidden){document.hidden=hidden;for(const fn of documentEvents.visibilitychange||[])await fn();await settle();},async lifecycle(name){for(const fn of windowEvents[name]||[])await fn();await settle();},async click(label){const button=find('button',label);assert.ok(button,'Missing button: '+label);await button.click();await settle();},async change(label,value){const input=find('select',label)||find('input',label);assert.ok(input,'Missing input: '+label);input.value=value;await input.dispatch('change');await settle();},async expire(){allowed=false;revision++;for(const fn of storageListeners)fn({'mooddock:prefs-v2':{newValue:{revision,prefs:effective().prefs}}},'local');await settle();}};
}

test('one gallery switches a moving Living World to a theme and acknowledges the page',async()=>{
 const p=await panel({prefs:C.selectExperience({}, {kind:'living',id:'train',motion:'playful'})});
 assert.equal(p.shadow.querySelectorAll('.world').length,19);
 assert.equal(p.find('button','Playful').getAttribute('aria-pressed'),'true');
 await p.click('Select Rally Garage');
 assert.deepEqual(P.experience(p.state().prefs),{kind:'theme',id:'rally',motion:'playful'});
 assert.equal(p.state().prefs.livingEnabled,false);assert.equal(p.state().prefs.idleMode,'off');
 assert.equal(p.state().notes,'keep local notes');
 assert.match(p.shadow.querySelector('[data-page-status]').textContent,/Displayed on the active/);
 await p.change('Gallery appearance','dark');
 assert.equal(p.find('button','Select Starlit Cat').getAttribute('data-preview-scheme'),'dark');
});
test('motion applies directly to the active world and Still stops it without selecting a card again',async()=>{
 const p=await panel({prefs:C.selectExperience({livingWeather:'snow',livingView:'full'}, {kind:'living',id:'tokyo',motion:'still'})});
 await p.click('Playful');
 assert.deepEqual(P.experience(p.state().prefs),{kind:'living',id:'tokyo',motion:'playful'});
 assert.equal(p.find('button','Playful').getAttribute('aria-pressed'),'true');
 assert.equal(p.state().prefs.livingView,'full');
 assert.equal(p.messages.filter(m=>m.kind==='mutate').length,1);
 await p.click('Still');
 assert.equal(p.state().prefs.livingEnabled,true);assert.equal(p.state().prefs.livingMotion,false);
 assert.equal(p.find('button','Still').getAttribute('aria-pressed'),'true');
});
test('a motion click queued behind a new world applies to that new world',async()=>{
 const p=await panel();
 await Promise.all([p.click('Select Cozy Train Journey'),p.click('Subtle')]);
 assert.deepEqual(P.experience(p.state().prefs),{kind:'living',id:'train',motion:'subtle'});
 const mutations=p.messages.filter(m=>m.kind==='mutate');assert.equal(mutations.length,2);
 assert.deepEqual({...mutations[1].action.value},{kind:'living',id:'train',motion:'subtle'});
});
test('locked motion requests account linking immediately while the control keeps showing actual applied motion',async()=>{
 const p=await panel({premium:false});await p.click('Subtle');
 const pending=p.messages.filter(m=>m.kind==='open-upgrade').at(-1);
 assert.deepEqual({...pending.target},{kind:'theme',id:'mooncat',motion:'subtle'});
 assert.equal(p.messages.filter(m=>m.kind==='mutate').length,0);
 assert.equal(p.find('button','Still').getAttribute('aria-pressed'),'true');
 assert.equal(p.state().prefs.motion,false);
 await p.click('Connect for Starship Journey');
 assert.deepEqual({...p.messages.filter(m=>m.kind==='open-upgrade').at(-1).target},{kind:'living',id:'starship',motion:'still'});
});
test('display status follows layout changes automatically and checks stop outside the visible gallery',async()=>{
 let observed='displayed';
 const p=await panel({prefs:C.selectExperience({}, {kind:'living',id:'tokyo',motion:'subtle'}),diagnostics:(s,revision)=>({ok:true,experience:{...P.experience(s.prefs),revision,state:observed,visible:observed==='displayed',reason:observed==='blocked'?'No clear page space.':''}})});
 assert.match(p.shadow.querySelector('[data-page-status]').textContent,/Displayed on the active/);
 assert.equal(p.pendingChecks(),1);
 observed='blocked';await p.poll();assert.match(p.shadow.querySelector('[data-page-status]').textContent,/cannot be displayed.*No clear page space/);
 assert.equal(p.pendingChecks(),1);
 const count=p.messages.filter(m=>m.kind==='diagnostics').length;
 await p.visibility(true);await p.poll();assert.equal(p.pendingChecks(),0);
 assert.equal(p.messages.filter(m=>m.kind==='diagnostics').length,count);
 observed='displayed';await p.visibility(false);assert.match(p.shadow.querySelector('[data-page-status]').textContent,/Displayed on the active/);
 await p.click('About');assert.equal(p.pendingChecks(),0);
 await p.click('Worlds');assert.equal(p.pendingChecks(),1);
 await p.lifecycle('pagehide');assert.equal(p.pendingChecks(),0);
 await p.lifecycle('pageshow');assert.equal(p.pendingChecks(),1);
});
test('late diagnostics cannot overwrite a hidden panel and background checks preserve foreground feedback',async()=>{
 let deferred=null,hold=false;
 const p=await panel({diagnostics:(s,revision)=>hold?new Promise(resolve=>{deferred=()=>resolve({ok:true,experience:{...P.experience(s.prefs),revision,state:'blocked',reason:'Old layout'}});}):{ok:true,experience:{...P.experience(s.prefs),revision,state:'displayed',visible:true}}});
 await p.click('Check display');const status=p.shadow.querySelector('.status').textContent;
 await p.poll();assert.equal(p.shadow.querySelector('.status').textContent,status);
 hold=true;await p.poll();assert.ok(deferred);
 await p.visibility(true);deferred();await p.settle();
 assert.doesNotMatch(p.shadow.querySelector('[data-page-status]').textContent,/Old layout/);
 assert.equal(p.pendingChecks(),0);
});
test('hidden paused diagnostics never claim the selected scene is visible',async()=>{
 const p=await panel({prefs:C.selectExperience({}, {kind:'living',id:'tokyo',motion:'subtle'}),diagnostics:(s,revision)=>({ok:true,experience:{...P.experience(s.prefs),revision,state:'paused',visible:false,reason:'A dialog covers the page.'}})});
 await p.click('Check display');const text=p.shadow.querySelector('[data-page-status]').textContent;
 assert.match(text,/currently hidden/);assert.doesNotMatch(text,/Visible on the active/);
});
test('effective-pref expiry redraws the panel but export retains the saved Premium selection',async()=>{
 const selected=C.selectExperience({}, {kind:'living',id:'starship',motion:'playful'});
 const p=await panel({prefs:selected});await p.expire();
 assert.equal(p.find('button','Connect for Starship Journey').getAttribute('aria-pressed'),'false');
 assert.equal(p.find('button','Still').getAttribute('aria-pressed'),'true');
 await p.click('About');await p.click('Export appearance JSON');
 const exported=JSON.parse(await p.blobs.at(-1).text());
 assert.equal(exported.prefs.livingEnabled,true);assert.equal(exported.prefs.livingWorld,'starship');assert.equal(exported.prefs.livingMotion,true);
});
test('backup input restores validated local records without importing text consent or a timer',async()=>{
 const p=await panel();await p.click('About');
 const input=p.find('input','Restore local data backup');
 const backup={format:'chatdrobe-local-backup',version:1,state:C.state({notes:'restored note',timerUntil:Date.now()+99999,prefs:{idleMode:'bites',wordBitesConsent:true}})};
 input.files=[{size:500,text:async()=>JSON.stringify(backup)}];await input.dispatch('change');await p.settle();
 assert.equal(p.state().notes,'restored note');assert.equal(p.state().prefs.wordBitesConsent,false);assert.equal(p.state().prefs.idleMode,'off');assert.equal(p.state().timerUntil,0);
 input.files=[{size:17*1024*1024,text:async()=>{throw Error('must not read oversized file');}}];await input.dispatch('change');
 assert.match(p.shadow.querySelector('.status').textContent,/smaller than 16 MB/);
});
