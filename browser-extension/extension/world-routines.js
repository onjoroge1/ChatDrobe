/* Loaded only for a selected Explorer world + opt-in idle routine.
 * All art is original, local SVG. The stage uses empty chat margins, never message text.
 */
export const WORLD_IDS=Object.freeze(['rally','bridge','observatory']);
export function marginStage(doc,win){
 const main=doc.querySelector('main')?.getBoundingClientRect();
 const form=doc.getElementById('prompt-textarea')?.closest('form')?.getBoundingClientRect();
 if(!main||!form||main.width<350||form.width<120)return null;
 const right=Math.min(main.right,win.innerWidth),left=Math.max(main.left,0);
 const lanes=[{left:form.right+12,right:right-12},{left:left+12,right:form.left-12}];
 for(const lane of lanes){
  const scale=Math.min(1,(lane.right-lane.left)/168);
  if(scale<.65)continue;
  const width=168*scale,height=138*scale;
  const x=lane.right-width,y=Math.min(form.top-height-14,win.innerHeight-height-24);
  if(y<84)continue;
  // Geometry and control-hit checks only: do not inspect or store conversation text.
  let clear=true;
  for(const [u,v]of [[.05,.05],[.95,.05],[.5,.5],[.05,.95],[.95,.95]]){
   const hit=doc.elementFromPoint(x+width*u,y+height*v);
   if(!hit||hit.closest('[data-message-author-role],form,button,a,input,textarea,[contenteditable],[role="dialog"],[role="menu"],nav,aside')){clear=false;break;}
  }
  if(clear)return {x,y,width,height,scale};
 }
 return null;
}
function factory(doc){
 const ns='http://www.w3.org/2000/svg';
 return (tag,attrs={},...children)=>{const e=doc.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));e.append(...children);return e;};
}
export function createWorldVisual(doc,world,bounds){
 if(!WORLD_IDS.includes(world))throw new Error('Unsupported local world routine.');
 const host=doc.createElement('div');host.id='chatdrobe-idle';host.setAttribute('aria-hidden','true');host.dataset.worldRoutine=world;
 Object.assign(host.style,{position:'fixed',left:bounds.x+'px',top:bounds.y+'px',width:bounds.width+'px',height:bounds.height+'px',pointerEvents:'none',zIndex:'45',contain:'strict'});
 const shadow=host.attachShadow({mode:'closed'}),sheet=doc.createElement('style');
 sheet.textContent=`:host{pointer-events:none!important}.stage{position:relative;width:168px;height:138px;transform-origin:top left;overflow:hidden;border:1px solid var(--md-line,#a5b4c8);border-radius:18px;background:var(--md-surface,#fff);color:var(--md-text,#23344a);box-sizing:border-box}.scene{width:168px;height:138px;position:absolute;inset:0}.actor{position:absolute;left:0;top:0;width:84px;height:54px;will-change:transform}.car{width:84px;height:54px}.headlight{opacity:0}.stage[data-phase="park"] .headlight{animation:headlight 1300ms ease-in-out 1}.stage[data-phase="cruise"] .wheel{transform-box:fill-box;transform-origin:50% 50%;animation:wheel 600ms linear infinite}.drone{width:62px;height:52px}.drone-actor{width:62px;height:72px}.scan{position:absolute;left:15px;top:43px;width:32px;height:27px;clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);background:#74bcdd55;opacity:0}.stage[data-phase="inspect"] .scan{opacity:1;animation:scan 1200ms ease-in-out 2}.stage[data-phase="charge"] .charge{animation:headlight 1200ms ease-in-out 1}.orbit{position:absolute;left:12px;top:5px;width:144px;height:118px;transform-origin:50% 50%;will-change:transform}.planet{position:absolute;left:119px;top:52px;width:16px;height:16px;border:2px solid #dceeff;border-radius:50%;background:#658ec1;box-shadow:inset -4px -2px #3c5e94}.orbit-label{position:absolute;left:18px;bottom:9px;font:10px system-ui;color:var(--md-muted,#485e7a)}@keyframes wheel{to{transform:rotate(360deg)}}@keyframes headlight{0%,100%{opacity:0}40%,70%{opacity:.8}}@keyframes scan{0%,100%{opacity:.25}50%{opacity:.75}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;
 const stage=doc.createElement('div');stage.className='stage';stage.style.transform=`scale(${bounds.scale})`;
 const n=factory(doc),scene=n('svg',{viewBox:'0 0 168 138',class:'scene','aria-hidden':'true'});
 let actor=doc.createElement('div');actor.className='actor';
 let steps=[];
 if(world==='rally'){
  scene.append(n('path',{d:'M14 18 H110 M14 24 H65 M19 34 V108 M149 35 V108',stroke:'var(--md-line)',fill:'none','stroke-width':1}),n('path',{d:'M0 111 H168',stroke:'var(--md-muted)','stroke-width':2}),n('path',{d:'M4 124 H164',stroke:'var(--md-line)','stroke-width':2,'stroke-dasharray':'10 9'}));
  const car=n('svg',{viewBox:'0 0 110 72',class:'car'});
  car.append(n('path',{d:'M94 36 L110 29 V44Z',class:'headlight',fill:'#ffe18b'}),n('path',{d:'M10 37 L31 19 H65 L83 35 L98 39 L100 57 H6 L7 43Z',fill:'#de9455',stroke:'#744b37','stroke-width':2,'stroke-linejoin':'round'}),n('path',{d:'M34 23 H44 V36 H20Z M50 23 H64 L77 36 H50Z',fill:'#476278'}),n('rect',{x:87,y:41,width:10,height:5,rx:2,fill:'#fff2b1'}),n('rect',{x:45,y:41,width:18,height:12,rx:2,fill:'#fff9e8'}),n('path',{d:'M49 45 H55 L50 50 H55 M58 44 H61 L59 51',stroke:'#6a4a34','stroke-width':1.2,fill:'none'}));
  for(const x of [26,80])car.append(n('g',{class:'wheel'},n('circle',{cx:x,cy:57,r:10,fill:'#313b46'}),n('circle',{cx:x,cy:57,r:5,fill:'#b9c5ce'}),n('path',{d:`M${x-6} 57 H${x+6} M${x} 51 V63`,stroke:'#718497','stroke-width':1.2})));
  actor.append(car);
  steps=[{phase:'cruise',duration:3000,frames:[{transform:'translate(-78px,66px)'},{transform:'translate(64px,66px)'}]},
   {phase:'cruise',duration:1600,frames:[{transform:'translate(64px,66px)'},{transform:'translate(49px,66px)'}]},
   {phase:'park',duration:1600,frames:[{transform:'translate(49px,66px)'},{transform:'translate(49px,66px)'}]}];
 }else if(world==='bridge'){
  scene.append(n('rect',{x:11,y:12,width:146,height:62,rx:19,fill:'#153552',stroke:'var(--md-line)','stroke-width':1}),n('circle',{cx:118,cy:40,r:21,fill:'#7ab6d3'}),n('path',{d:'M104 28 Q129 17 130 40 L111 49 L103 44Z',fill:'#b6dee5'}),n('circle',{cx:35,cy:32,r:1.5,fill:'#fff8d1'}),n('circle',{cx:73,cy:24,r:1,fill:'#fff8d1'}),n('path',{d:'M25 110 H75 M30 117 H70 M92 105 H144 V119 H92Z',stroke:'var(--md-accent)','stroke-width':2,fill:'var(--md-soft)'}),n('rect',{x:103,y:112,width:27,height:3,rx:2,fill:'#8cbb8a',class:'charge'}));
  actor.classList.add('drone-actor');const drone=n('svg',{viewBox:'0 0 84 70',class:'drone'});
  drone.append(n('path',{d:'M10 43 L20 31 M10 43 L26 50 M74 43 L64 31 M74 43 L58 50',stroke:'#e6a55e','stroke-width':5,'stroke-linecap':'round'}),n('rect',{x:21,y:20,width:42,height:37,rx:14,fill:'#e7f2fb',stroke:'#35618c','stroke-width':2}),n('rect',{x:28,y:29,width:28,height:14,rx:5,fill:'#294f6d'}),n('circle',{cx:34,cy:36,r:3,fill:'#9ddce0'}),n('circle',{cx:50,cy:36,r:3,fill:'#9ddce0'}),n('path',{d:'M42 20 V12',stroke:'#35618c','stroke-width':2}),n('circle',{cx:42,cy:10,r:3,fill:'#e6a55e'}));
  const scan=doc.createElement('i');scan.className='scan';actor.append(drone,scan);
  steps=[{phase:'undock',duration:1900,frames:[{transform:'translate(84px,63px)'},{transform:'translate(77px,25px)'}]},
   {phase:'inspect',duration:2600,frames:[{transform:'translate(77px,25px)'},{transform:'translate(30px,39px)',offset:.4},{transform:'translate(30px,39px)'}]},
   {phase:'return',duration:1900,frames:[{transform:'translate(30px,39px)'},{transform:'translate(84px,63px)'}]},
   {phase:'charge',duration:1300,frames:[{transform:'translate(84px,63px)'},{transform:'translate(84px,63px)'}]}];
 }else{
  scene.append(n('circle',{cx:84,cy:64,r:52,fill:'var(--md-bg)',stroke:'var(--md-line)','stroke-width':1}),n('ellipse',{cx:84,cy:64,rx:57,ry:40,stroke:'var(--md-accent)','stroke-width':1,fill:'none'}),n('circle',{cx:84,cy:64,r:31,stroke:'var(--md-line)','stroke-width':1,fill:'none'}),n('circle',{cx:84,cy:64,r:17,fill:'#dfaa4a'}),n('circle',{cx:79,cy:59,r:8,fill:'#ffe1a0',opacity:.8}),n('path',{d:'M84 115 V123 M69 125 H99 M16 23 H26 M21 18 V28',stroke:'var(--md-accent)','stroke-width':2,'stroke-linecap':'round'}));
  actor.className='orbit';const planet=doc.createElement('i');planet.className='planet';actor.append(planet);
  steps=[{phase:'orbit',duration:6500,frames:[{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],easing:'linear'},
   {phase:'rest',duration:750,frames:[{transform:'rotate(360deg)'},{transform:'rotate(360deg)'}]}];
 }
 stage.append(scene,actor);shadow.append(sheet,stage);host.append();
 return {host,stage,actor,steps};
}
