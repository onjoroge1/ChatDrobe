const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../extension/prefs.js');
// DOM geometry fixture exercises the real renderer; it does not claim browser paint validation.
async function fixture(){
 const playback={started:0,cancelled:0};
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.style={};this.dataset={};this.classList={add:()=>{}};this.hidden=false;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  contains(node){return node===this||this.children.some(child=>child.contains?.(node));}
  attachShadow(){return this.shadow=new Element('shadow');}
  getAnimations(){return [];}
  animate(){playback.started++;return {cancel(){playback.cancelled++;},onfinish:null,currentTime:0};}
  querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);return selector==='*'?all:[];}
  querySelector(selector){return this.querySelectorAll('*').find(n=>selector==='svg'?n.tag==='svg':selector===':scope > svg'?n.parent===this&&n.tag==='svg':selector.startsWith('.')?n.className===selector.slice(1):selector==='g[clip-path]'?n.tag==='g'&&n.attrs['clip-path']:selector.startsWith('[data-layer=')?n.attrs['data-layer']===selector.slice(13,-2):false)||null;}
 }
 const main={left:256,right:1280,width:1024,top:0,bottom:900,height:900},composer={left:384,right:1152,width:768,top:740,bottom:850,height:110},reading={left:384,right:1152,width:768,top:120,bottom:720,height:600};
 const flags={focused:true,reduced:false,dialog:false},events={},timers=new Map(),deadlines=new Map(),frames=new Map(),observers=[],controls=[],nativeAnimations=[],nodeCache=new WeakMap();let timer=0,clock=0;
 const add=(name,fn)=>{(events[name]??=new Set()).add(fn);},remove=(name,fn)=>events[name]?.delete(fn);
 const node=r=>{if(!nodeCache.has(r))nodeCache.set(r,{getBoundingClientRect:()=>r});return nodeCache.get(r);};const mainNode=node(main),composerNode=node(composer),readingNode=node(reading);
 const media={get matches(){return flags.reduced;},addEventListener(){},removeEventListener(){}};
 const doc={body:new Element(),hidden:false,getAnimations:()=>nativeAnimations,hasFocus:()=>flags.focused,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),getSelection:()=>null,addEventListener:add,removeEventListener:remove,querySelector:s=>s==='main'?mainNode:s==='#composer-background'||s==='#thread-bottom-container'||s==='form:has(#prompt-textarea)'?composerNode:null,querySelectorAll:s=>s.startsWith('main ')?[readingNode]:s.startsWith('button,')?controls.map(node):s.startsWith('[role=')&&flags.dialog?[{getClientRects:()=>[{}]}]:[]};
 class Observer{constructor(callback){this.callback=callback;this.nodes=new Set();observers.push(this);}observe(node,options){this.nodes.add(node);this.options=options;}unobserve(node){this.nodes.delete(node);}disconnect(){this.nodes.clear();}}
 const win={innerWidth:1280,innerHeight:900,performance:{now:()=>clock},getComputedStyle:node=>({transform:node.style.transform||'none'}),matchMedia:()=>media,CSSStyleSheet:class{replaceSync(){}},MutationObserver:Observer,ResizeObserver:Observer,addEventListener:add,removeEventListener:remove,requestAnimationFrame:fn=>{frames.set(++timer,fn);return timer;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(fn,ms)=>{timers.set(++timer,fn);deadlines.set(timer,clock+ms);return timer;},clearTimeout:id=>{timers.delete(id);deadlines.delete(id);}};
 doc.defaultView=win;const {createEnvironment}=await import('../extension/living/engine.mjs');const engine=createEnvironment(doc,win);
 return {engine,doc,flags,main,composer,reading,events,timers,frames,observers,controls,playback,nativeAnimations,node,advance:ms=>{const target=clock+ms;for(let n=0;n<100;n++){const next=[...deadlines].sort((a,b)=>a[1]-b[1])[0];if(!next||next[1]>target){clock=target;return;}const [id,due]=next,fn=timers.get(id);clock=due;timers.delete(id);deadlines.delete(id);fn();}throw new Error('Timer loop');},fire:(name,target)=>{for(const fn of events[name]||[])fn({target});},flushFrames:()=>{const pending=[...frames.values()];frames.clear();for(const fn of pending)fn();},nativeMutation:target=>{for(const observer of observers)if(observer.nodes.has(doc.body))observer.callback([{target:target||mainNode}]);},messageResize:()=>{for(const observer of observers)if(observer.nodes.has(readingNode))observer.callback([]);},controlResize:control=>{for(const observer of observers)if(!observer.options&&observer.nodes.has(node(control)))observer.callback([]);},prefs:P.prefs({livingEnabled:true,livingView:'full'}),host:()=>doc.body.children.find(n=>n.id==='chatdrobe-environment')};
}
test('real engine uses a portal mask for compact Full World fallback and rechecks changed geometry',async()=>{const f=await fixture();try{f.engine.configure(f.prefs);let d=f.engine.diagnostics();assert.equal(d.state,'displayed');assert.equal(d.layout.compact,true);assert.equal(d.requestedView,'full');assert.equal(d.view,'portal');assert.equal(f.host().style.maskImage,'none');assert.equal(f.host().hidden,false);assert.equal(d.controlObserver,true,'Still scenes track composer layout too');f.reading.left=270;f.reading.right=1260;f.reading.width=990;d=f.engine.diagnostics();assert.equal(d.state,'blocked');assert.equal(d.visible,false);assert.equal(f.host().hidden,true);assert.match(d.action,/sidebar/);}finally{f.engine.dispose();}assert.equal(f.doc.body.children.length,0);assert.equal(f.timers.size,0);});
test('real engine reports visible Still, reduced motion, dialog and hidden-tab states independently',async()=>{const f=await fixture();try{f.flags.focused=false;f.engine.configure(f.prefs);assert.equal(f.engine.diagnostics().state,'displayed');f.flags.focused=true;f.flags.reduced=true;f.engine.configure({...f.prefs,livingMotion:true});let d=f.engine.diagnostics();assert.equal(d.state,'paused');assert.equal(d.visible,true);assert.equal(d.motionAllowed,false);assert.ok(d.suppressionReasons.includes('reduced-motion preference'));f.flags.dialog=true;d=f.engine.diagnostics();assert.equal(d.state,'paused');assert.equal(d.visible,false);assert.match(d.reason,/dialog/);f.flags.dialog=false;f.doc.hidden=true;d=f.engine.diagnostics();assert.equal(d.visible,false);assert.match(d.reason,/inactive/);}finally{f.engine.dispose();}});
test('narrow conversation uses a measured gap and revokes it before a growing message can overlap',async()=>{const f=await fixture();try{
 f.reading.left=270;f.reading.right=1260;f.reading.width=990;f.reading.bottom=360;f.reading.height=240;
 f.engine.configure(f.prefs);let d=f.engine.diagnostics();assert.equal(d.layout.fallback,'conversation-gap');assert.equal(d.visible,true);assert.match(d.reason,/clear space/);assert.ok(d.layout.top>=f.reading.bottom+20);assert.ok(d.layout.top+d.layout.height<=f.composer.top-20);
 f.reading.bottom=690;f.reading.height=570;f.messageResize();assert.equal(f.host().hidden,true,'invalidate before waiting for another frame');f.flushFrames();assert.equal(f.frames.size,0);assert.equal(f.host().hidden,true);assert.equal(f.engine.diagnostics().state,'blocked');
 f.reading.bottom=360;f.reading.height=240;f.fire('scroll');f.flushFrames();assert.equal(f.host().hidden,false,'Still scenes recover on scroll without a panel diagnostics request');
 f.nativeMutation(f.host());assert.equal(f.frames.size,0,'renderer style writes do not observe themselves');
 }finally{f.engine.dispose();}assert.equal(f.frames.size,0);assert.equal(f.observers.filter(o=>o.nodes.size).length,0);assert.equal([...Object.values(f.events)].some(set=>set.size),false);
});
test('native controls and newly opened dialogs revoke the narrow fallback through layout events',async()=>{const f=await fixture();try{
 f.reading.left=270;f.reading.right=1260;f.reading.width=990;f.reading.bottom=360;f.reading.height=240;f.engine.configure(f.prefs);f.flushFrames();assert.equal(f.host().hidden,false);
 f.controls.push({left:500,right:600,top:380,bottom:700,width:100,height:320});f.nativeMutation();assert.equal(f.host().hidden,true);f.flushFrames();assert.equal(f.host().hidden,true);assert.equal(f.engine.diagnostics().state,'blocked');
 f.controls.length=0;f.nativeMutation();f.flushFrames();assert.equal(f.host().hidden,false);
 f.flags.dialog=true;f.nativeMutation();f.flushFrames();assert.equal(f.host().hidden,true);assert.match(f.engine.diagnostics().reason,/dialog/);
 }finally{f.engine.dispose();}
});
test('unchanged fallback geometry preserves the idle clock while a real obstruction suspends it',async()=>{const f=await fixture();try{
 f.reading.left=270;f.reading.right=1260;f.reading.width=990;f.reading.bottom=360;f.reading.height=240;f.engine.configure({...f.prefs,livingMotion:true});f.flushFrames();
 f.advance(12000);assert.equal(f.engine.diagnostics().quiet.busy,false);
 f.nativeMutation();assert.equal(f.host().hidden,true,'provisional hide remains immediate');f.flushFrames();assert.equal(f.engine.diagnostics().quiet.busy,false,'remeasurement does not count as recent input');
 f.advance(33000);const before=f.engine.diagnostics().quiet;assert.equal(before.pose,'look');assert.equal(before.stage,'noticing');
 const playback={...f.playback};f.nativeMutation();f.flushFrames();assert.deepEqual(f.playback,playback,'unchanged geometry never cancels or recreates an in-flight clip');const after=f.engine.diagnostics().quiet;assert.equal(after.pose,before.pose);assert.equal(after.serial,before.serial);assert.equal(after.stage,'noticing');assert.equal(after.busy,false);
 f.reading.bottom=710;f.messageResize();f.flushFrames();const blocked=f.engine.diagnostics();assert.equal(blocked.state,'blocked');assert.equal(blocked.quiet.enabled,false);assert.equal(blocked.quiet.timer,false,'an actual obstruction stops the policy timer');
 }finally{f.engine.dispose();}assert.equal(f.timers.size,0);
});
test('fallback waits through native animation and detects delayed control growth without a DOM mutation',async()=>{const f=await fixture();try{
 f.reading.left=270;f.reading.right=1260;f.reading.width=990;f.reading.bottom=360;f.reading.height=240;
 const control={left:500,right:600,top:360,bottom:400,width:100,height:40};f.controls.push(control);
 const animation={playState:'running',effect:{target:f.node(control)}};f.nativeAnimations.push(animation);
 f.engine.configure(f.prefs);f.flushFrames();assert.equal(f.host().hidden,true,'animation already running at mount holds fallback');assert.match(f.engine.diagnostics().reason,/layout is moving/);
 animation.playState='finished';f.fire('animationend',f.node(control));f.flushFrames();assert.equal(f.host().hidden,false);
 animation.playState='running';f.fire('transitionrun',f.node(control));assert.equal(f.host().hidden,true,'native movement hides the previously clear band immediately');f.flushFrames();assert.equal(f.host().hidden,true);
 animation.playState='idle';f.fire('transitioncancel',f.node(control));f.flushFrames();assert.equal(f.host().hidden,false);
 control.bottom=700;control.height=340;f.controlResize(control);assert.equal(f.host().hidden,true,'native size changes are observed without an attribute mutation');f.flushFrames();assert.equal(f.engine.diagnostics().state,'blocked');
 }finally{f.engine.dispose();}
});
test('blur or hidden tab during provisional geometry stops animation before another frame',async()=>{
 for(const event of ['blur','visibilitychange']){const f=await fixture();try{
  f.reading.left=270;f.reading.right=1260;f.reading.width=990;f.reading.bottom=360;f.reading.height=240;f.engine.configure({...f.prefs,livingMotion:true});f.flushFrames();f.advance(45000);
  const cancelled=f.playback.cancelled;f.nativeMutation();assert.equal(f.frames.size,1);assert.equal(f.playback.cancelled,cancelled);
  if(event==='blur')f.flags.focused=false;else f.doc.hidden=true;
  f.fire(event);assert.equal(f.frames.size,0);assert.ok(f.playback.cancelled>cancelled,'real inactivity cancels the active clip without waiting for diagnostics');assert.equal(f.timers.size,0,'real inactivity stops the quiet policy');assert.equal(f.engine.diagnostics().quiet.enabled,false);
 }finally{f.engine.dispose();}}
});
