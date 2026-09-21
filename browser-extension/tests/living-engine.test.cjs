const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../extension/prefs.js');
// DOM geometry fixture exercises the real renderer; it does not claim browser paint validation.
async function fixture(){
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.style={};this.dataset={};this.classList={add:()=>{}};this.hidden=false;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  attachShadow(){return this.shadow=new Element('shadow');}
  getAnimations(){return [];}
  animate(){return {cancel(){},onfinish:null,currentTime:0};}
  querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);return selector==='*'?all:[];}
  querySelector(selector){return this.querySelectorAll('*').find(n=>selector==='svg'?n.tag==='svg':selector===':scope > svg'?n.parent===this&&n.tag==='svg':selector.startsWith('.')?n.className===selector.slice(1):selector==='g[clip-path]'?n.tag==='g'&&n.attrs['clip-path']:selector.startsWith('[data-layer=')?n.attrs['data-layer']===selector.slice(13,-2):false)||null;}
 }
 const main={left:256,right:1280,width:1024},composer={left:384,right:1152,width:768,top:740},reading={left:384,right:1152,width:768};
 const flags={focused:true,reduced:false,dialog:false},events={},timers=new Map();let timer=0;
 const node=r=>({getBoundingClientRect:()=>r});const mainNode=node(main),composerNode=node(composer),readingNode=node(reading);
 const media={get matches(){return flags.reduced;},addEventListener(){},removeEventListener(){}};
 const doc={body:new Element(),hidden:false,hasFocus:()=>flags.focused,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),getSelection:()=>null,addEventListener:(n,fn)=>events[n]=fn,removeEventListener:n=>delete events[n],querySelector:s=>s==='main'?mainNode:s==='#composer-background'||s==='#thread-bottom-container'||s==='form:has(#prompt-textarea)'?composerNode:null,querySelectorAll:s=>s.startsWith('main ')?[readingNode]:s.startsWith('[role=')&&flags.dialog?[{getClientRects:()=>[{}]}]:[]};
 const win={innerWidth:1280,innerHeight:900,performance:{now:()=>0},matchMedia:()=>media,CSSStyleSheet:class{replaceSync(){}},MutationObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},addEventListener:(n,fn)=>events[n]=fn,removeEventListener:n=>delete events[n],requestAnimationFrame:fn=>{timers.set(++timer,fn);return timer;},cancelAnimationFrame:id=>timers.delete(id),setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)};
 doc.defaultView=win;const {createEnvironment}=await import('../extension/living/engine.mjs');const engine=createEnvironment(doc,win);
 return {engine,doc,flags,main,composer,reading,events,timers,prefs:P.prefs({livingEnabled:true,livingView:'full'}),host:()=>doc.body.children.find(n=>n.id==='chatdrobe-environment')};
}
test('real engine uses a portal mask for compact Full World fallback and rechecks changed geometry',async()=>{const f=await fixture();try{f.engine.configure(f.prefs);let d=f.engine.diagnostics();assert.equal(d.state,'displayed');assert.equal(d.layout.compact,true);assert.equal(d.requestedView,'full');assert.equal(d.view,'portal');assert.equal(f.host().style.maskImage,'none');assert.equal(f.host().hidden,false);assert.equal(d.controlObserver,true,'Still scenes track composer layout too');f.reading.left=270;f.reading.right=1260;f.reading.width=990;d=f.engine.diagnostics();assert.equal(d.state,'blocked');assert.equal(d.visible,false);assert.equal(f.host().hidden,true);assert.match(d.action,/sidebar/);}finally{f.engine.dispose();}assert.equal(f.doc.body.children.length,0);assert.equal(f.timers.size,0);});
test('real engine reports visible Still, reduced motion, dialog and hidden-tab states independently',async()=>{const f=await fixture();try{f.flags.focused=false;f.engine.configure(f.prefs);assert.equal(f.engine.diagnostics().state,'displayed');f.flags.focused=true;f.flags.reduced=true;f.engine.configure({...f.prefs,livingMotion:true});let d=f.engine.diagnostics();assert.equal(d.state,'paused');assert.equal(d.visible,true);assert.equal(d.motionAllowed,false);assert.ok(d.suppressionReasons.includes('reduced-motion preference'));f.flags.dialog=true;d=f.engine.diagnostics();assert.equal(d.state,'paused');assert.equal(d.visible,false);assert.match(d.reason,/dialog/);f.flags.dialog=false;f.doc.hidden=true;d=f.engine.diagnostics();assert.equal(d.visible,false);assert.match(d.reason,/inactive/);}finally{f.engine.dispose();}});
