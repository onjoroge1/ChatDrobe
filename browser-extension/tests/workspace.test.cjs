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
 const messages=[],storageListeners=[],blobs=[];
 const html=new Node('html');html.connected=true;
 const document={documentElement:html,body:new Node('body'),hidden:false,createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),createTextNode:text=>{const n=new Node('#text');n.textContent=text;return n;},getElementById:id=>html.querySelectorAll('[id]').find(n=>n.id===id)||null,addEventListener(){}};
 const effective=()=>C.state({...state,prefs:A.effective(state.prefs,{premium:allowed})});
 const response=()=>({ok:true,state:effective(),desiredPrefs:state.prefs,revision,access:{premium:allowed,testSubscription:allowed,accessSource:allowed?'test':'free'}});
 const chrome={runtime:{id:'test',getManifest:()=>({version:'0.8.0'}),onMessage:{addListener(){}},async sendMessage(message){messages.push(message);if(message.kind==='mutate'){state=C.reduce(state,message.action);revision++;}
  if(message.kind==='open-upgrade')return {ok:true};
  if(message.kind==='diagnostics')return diagnostics?.(effective(),revision)||{ok:true,experience:{...P.experience(effective().prefs),revision,state:'displayed',visible:true}};
  return response();}},storage:{onChanged:{addListener:fn=>storageListeners.push(fn)}}};
 const window={innerWidth:400,addEventListener(){},confirm:()=>true,matchMedia:()=>({matches:false})};
 const context={MoodDockCore:C,ChatDrobePrefs:P,ChatDrobeAccess:A,ChatDrobeCommerceConfig:{},MoodDockPanelCSS:'',document,window,chrome,location:{protocol:'chrome-extension:'},crypto:require('node:crypto').webcrypto,URL:class extends URL{static createObjectURL(blob){blobs.push(blob);return 'blob:test';}static revokeObjectURL(){}},Blob,setTimeout:(fn)=>setTimeout(fn,0),clearTimeout,confirm:window.confirm,navigator:{},console};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension/workspace.js'),'utf8'),context);
 const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
 await settle();const shadow=html.children.find(n=>n.id==='mooddock-root').shadowRoot;
 const find=(tag,label)=>shadow.querySelectorAll(tag).find(n=>n.getAttribute('aria-label')===label||n.textContent===label);
 return {shadow,messages,blobs,settle,state:()=>state,find,async click(label){const button=find('button',label);assert.ok(button,'Missing button: '+label);await button.click();await settle();},async change(label,value){const input=find('select',label)||find('input',label);assert.ok(input,'Missing input: '+label);input.value=value;await input.dispatch('change');await settle();},async expire(){allowed=false;revision++;for(const fn of storageListeners)fn({'mooddock:prefs-v2':{newValue:{revision,prefs:effective().prefs}}},'local');await settle();}};
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
test('locked world selection preserves the explicit motion intent for account linking',async()=>{
 const p=await panel({premium:false});await p.click('Subtle');
 assert.equal(p.messages.filter(m=>m.kind==='open-upgrade').length,0,'Choosing motion is a draft until the world is selected');
 await p.click('Connect for Starship Journey');
 const pending=p.messages.filter(m=>m.kind==='open-upgrade').at(-1);
 assert.deepEqual({...pending.target},{kind:'living',id:'starship',motion:'subtle'});
 assert.equal(p.state().prefs.livingEnabled,false);
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
