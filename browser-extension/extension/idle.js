/* Lazy, local-only companion. No message edits, clipboard writes, network or saved transcript. */
const EXCLUDED='a,code,pre,button,input,textarea,[contenteditable],[role="textbox"],svg,math,[aria-hidden="true"]';
export function visibleWordRanges(doc,win,limit=3){
 // Fixed viewport samples, bounded traversal and character inspection. Never index chat history.
 const ranges=[],seen=new Set();let nodes=0,chars=0;
 const started=win.performance.now();
 outer:for(const yf of [.26,.4,.54,.68])for(const xf of [.35,.5,.65]){
  if(win.performance.now()-started>10||ranges.length>=limit)break outer;
  const hit=doc.elementFromPoint(win.innerWidth*xf,win.innerHeight*yf);
  const p=hit?.closest('p,li');
  if(!p||seen.has(p)||!p.closest('[data-message-author-role="assistant"]')||p.closest(EXCLUDED))continue;
  seen.add(p);
  const walker=doc.createTreeWalker(p,win.NodeFilter.SHOW_TEXT);
  let textNode;
  while(nodes<80&&chars<1536&&(textNode=walker.nextNode())){
   nodes++;
   if(win.performance.now()-started>10)break outer;
   if(textNode.parentElement?.closest(EXCLUDED))continue;
   const length=Math.min(textNode.length,512,1536-chars);chars+=length;
   const sample=textNode.data.slice(0,length);
   for(const word of sample.matchAll(/[^\s<>`{}]{2,24}/gu)){
    const r=doc.createRange();r.setStart(textNode,word.index);r.setEnd(textNode,word.index+word[0].length);
    const boxes=r.getClientRects();if(boxes.length!==1)continue;
    const b=boxes[0];if(b.width<3||b.height<3||b.left<16||b.right>win.innerWidth-16||b.top<70||b.bottom>win.innerHeight-190)continue;
    const at=doc.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    if(!at||!p.contains(at)||at.closest(EXCLUDED))continue;
    ranges.push({range:r,block:p,x:b.left+b.width/2-40,y:b.top-45});
    if(ranges.length>=limit)break outer;
   }
  }
 }
 return {ranges,nodes,chars};
}

/* Original segmented cat. Paws and tail move; no animated GIFs, video or image downloads. */
function walkingCat(doc){
 const ns='http://www.w3.org/2000/svg';
 const node=(tag,attrs,...children)=>{const e=doc.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);e.append(...children);return e;};
 return node('svg',{viewBox:'0 0 110 88',class:'walking-cat','aria-hidden':'true'},
  node('path',{d:'M30 48 C8 49 13 21 22 24 C30 27 18 33 23 43',class:'tail',fill:'none',stroke:'#c98d57','stroke-width':'7','stroke-linecap':'round'}),
  ...[36,48,65,78].map((x,i)=>node('path',{d:`M${x} 55 L${x+1} 73 L${x+8} 73`,class:'paw paw-'+i,fill:'none',stroke:i%2?'#c98d57':'#ae744b','stroke-width':'7','stroke-linecap':'round'})),
  node('ellipse',{cx:'55',cy:'48',rx:'30',ry:'19',fill:'#c98d57'}),
  node('path',{d:'M64 37 L64 13 L78 24 L85 24 L99 12 L100 40 Q99 57 82 57 Q65 55 64 37Z',fill:'#d9a167',stroke:'#7d513f','stroke-width':'2','stroke-linejoin':'round'}),
  node('path',{d:'M68 19 L68 28 L74 26 M96 20 L95 29 L91 26',fill:'#f1c6b0'}),
  node('circle',{cx:'75',cy:'36',r:'2.3',fill:'#493637'}),node('circle',{cx:'92',cy:'36',r:'2.3',fill:'#493637'}),
  node('path',{d:'M81 42 L85 42 L83 45 M83 45 Q79 49 77 46 M83 45 Q87 49 89 46',fill:'none',stroke:'#493637','stroke-width':'1.7','stroke-linecap':'round'}),
  node('path',{d:'M78 21 Q79 16 82 21 Q85 15 87 20 L84 24Z',fill:'#97506f'}));
}
export function strollPath(doc,win){
 const main=doc.querySelector('main')?.getBoundingClientRect();
 const form=doc.getElementById('prompt-textarea')?.closest('form')?.getBoundingClientRect();
 const left=Math.max(12,main?.left+18||18),right=Math.max(left,Math.min(win.innerWidth-116,(main?.right||win.innerWidth)-116));
 const y=Math.max(72,Math.min(win.innerHeight-146,(form?.top||win.innerHeight-145)-90));
 return [{x:left,y},{x:left+(right-left)*.55,y},{x:right,y}];
}

export function createIdleController(doc=document,win=window,loadWorlds=()=>import('./world-routines.js')){
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 let worldModule=null;
 let prefs=null,key='',timer=null,host=null,animation=null,observer=null,last=0,played=false,generation=0,running=false,manual=false,enabled=false;
 const metrics={worldModuleLoaded:false,worldRuns:0,runs:0,wordScans:0,examinedNodes:0,examinedCharacters:0,lastReason:'off'};
 const listeners=['pointermove','pointerdown','keydown','wheel','touchstart','input','compositionstart'];
 const clock=()=>win.performance.now();
 const clearTimer=()=>{if(timer!==null){win.clearTimeout(timer);timer=null;}};
 function removeVisual(reason){
  generation++;running=false;manual=false;animation?.cancel();animation=null;
  observer?.disconnect();observer=null;
  win.CSS?.highlights?.delete('chatdrobe-idle-bite');
  host?.remove();host=null;doc.documentElement.removeAttribute('data-md-idle-running');metrics.lastReason=reason;
 }
 function stop(reason='activity'){clearTimer();removeVisual(reason);}
 function eligible(ignoreFocus=false){
  if(!enabled||doc.hidden||reduced.matches||!doc.body||(!ignoreFocus&&!doc.hasFocus()))return false;
  if(doc.getSelection()&&!doc.getSelection().isCollapsed)return false;
  if(doc.querySelector('[data-is-streaming="true"],.result-streaming,[data-message-author-role="assistant"][aria-busy="true"]'))return false;
  const stopButton=doc.querySelector('button[data-testid="stop-button"]');
  if(stopButton&&stopButton.getClientRects().length)return false;
  const media=doc.querySelectorAll('video,audio');
  for(let i=0;i<Math.min(6,media.length);i++)if(!media[i].paused&&!media[i].ended)return false;
  if(doc.querySelector('[role="dialog"][aria-modal="true"],dialog[open]'))return false;
  return true;
 }
 function arm(){
  if(!enabled||played||timer!==null||running||doc.hidden||reduced.matches||!doc.hasFocus())return;
  const left=Math.max(50,prefs.idleSeconds*1000-(clock()-last));
  timer=win.setTimeout(()=>{timer=null;if(clock()-last<prefs.idleSeconds*1000){arm();return;}if(!eligible()){metrics.lastReason='busy-or-unfocused';played=true;return;}void run(false);},left);
 }
 function activity(){last=clock();played=false;if(running||manual)stop('activity');arm();}
 function visibility(){stop(doc.hidden?'hidden':'focus-change');last=clock();played=false;arm();}
 function blur(){stop('unfocused');played=false;}
 function motionChange(){stop(reduced.matches?'reduced-motion':'motion-change');last=clock();played=false;arm();}
 function attach(){for(const e of listeners)doc.addEventListener(e,activity,{passive:true,capture:true});doc.addEventListener('scroll',activity,{passive:true,capture:true});doc.addEventListener('visibilitychange',visibility);doc.addEventListener('selectionchange',activity);win.addEventListener('resize',activity);win.addEventListener('blur',blur);win.addEventListener('focus',visibility);win.addEventListener('pagehide',blur);win.addEventListener('popstate',activity);reduced.addEventListener('change',motionChange);}
 function detach(){for(const e of listeners)doc.removeEventListener(e,activity,true);doc.removeEventListener('scroll',activity,true);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('selectionchange',activity);win.removeEventListener('resize',activity);win.removeEventListener('blur',blur);win.removeEventListener('focus',visibility);win.removeEventListener('pagehide',blur);win.removeEventListener('popstate',activity);reduced.removeEventListener('change',motionChange);}
 async function runWorld(requested,ticket,startURL){
  running=true;
  try{
   if(!worldModule){const loaded=await loadWorlds();worldModule=loaded;metrics.worldModuleLoaded=true;}
   if(ticket!==generation||win.location.href!==startURL||!eligible(requested))return false;
   const bounds=worldModule.marginStage(doc,win);
   if(!bounds){metrics.lastReason='not-enough-clear-margin';return false;}
   const visual=worldModule.createWorldVisual(doc,prefs.theme,bounds);host=visual.host;
   doc.body.append(host);doc.documentElement.setAttribute('data-md-idle-running','true');
   metrics.runs++;metrics.worldRuns++;metrics.lastReason=prefs.theme+'-routine';
   for(const step of visual.steps){
    if(ticket!==generation||win.location.href!==startURL||!eligible(requested))break;
    visual.stage.dataset.phase=step.phase;
    animation=visual.actor.animate(step.frames,{duration:step.duration,easing:step.easing||'ease-in-out',fill:'forwards'});
    await animation.finished;
   }
  }catch{if(ticket===generation)metrics.lastReason='routine-load-or-animation-failed';}
  finally{if(ticket===generation)removeVisual(['routine-load-or-animation-failed','not-enough-clear-margin'].includes(metrics.lastReason)?metrics.lastReason:'complete');}
  return true;
 }
 async function run(requested){
  manual=false;played=true;if(!eligible(requested)){metrics.lastReason=reduced.matches?'reduced-motion':'busy-or-hidden';return false;}
  const ticket=++generation,startURL=win.location.href;
  if(prefs.idleMode==='stroll'&&prefs.companion==='theme'&&['rally','bridge','observatory'].includes(prefs.theme))return runWorld(requested,ticket,startURL);
  const bites=prefs.idleMode==='bites'&&prefs.wordBitesConsent&&!!win.Highlight&&!!win.CSS?.highlights;
  const scan=bites?visibleWordRanges(doc,win):{ranges:[],nodes:0,chars:0};
  if(bites){metrics.wordScans++;metrics.examinedNodes+=scan.nodes;metrics.examinedCharacters+=scan.chars;}
  const points=scan.ranges.length?scan.ranges:strollPath(doc,win);
  host=doc.createElement('div');host.id='chatdrobe-idle';host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;top:0;left:0;width:112px;height:88px;pointer-events:none;z-index:50;contain:strict;';
  const shadow=host.attachShadow({mode:'closed'}),style=doc.createElement('style');
  style.textContent=':host{pointer-events:none!important}.pet{position:relative;width:80px;height:80px;display:grid;place-items:center;font:54px/1 system-ui;pointer-events:none}.pet.theme{background:var(--md-art) center/contain no-repeat}.mouth{position:absolute;width:13px;height:10px;background:#27272a;border-radius:50%;bottom:16px;left:34px;transform:scaleY(.6);animation:chomp .3s ease-in-out infinite alternate}.badge{position:absolute;font-size:12px;right:4px;top:2px}@keyframes chomp{to{transform:scaleY(1.2)}}@media(prefers-reduced-motion:reduce){.mouth{animation:none}}';
  style.textContent+=`.pet{width:110px;height:88px}.walking-cat{width:110px;height:88px;overflow:visible}.walking-cat .paw{transform-box:fill-box;transform-origin:50% 0%;animation:paw-step .55s ease-in-out infinite alternate}.walking-cat .paw-1,.walking-cat .paw-3{animation-direction:alternate-reverse}.walking-cat .tail{transform-box:fill-box;transform-origin:95% 85%;animation:tail-swish 1.2s ease-in-out infinite alternate}.walking-cat{animation:cat-bob .55s ease-in-out infinite alternate}.facing{transform:scaleX(-1)}.emoji-walk{animation:cat-bob .55s ease-in-out infinite alternate}@keyframes paw-step{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}@keyframes tail-swish{from{transform:rotate(-8deg)}to{transform:rotate(12deg)}}@keyframes cat-bob{from{transform:translateY(0)}to{transform:translateY(-3px)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important}}`;
  const pet=doc.createElement('div'),isCat=prefs.companion==='cat'||prefs.companion==='theme'&&['mooncat','starlit'].includes(prefs.theme);
  pet.className='pet'+(!isCat&&prefs.companion==='theme'?' theme':'');
  if(isCat)pet.append(walkingCat(doc));else{pet.textContent=({robot:'🤖',spark:'✨'})[prefs.companion]||'';pet.classList.add('emoji-walk');}
  if(bites&&scan.ranges.length){const mouth=doc.createElement('i');mouth.className='mouth';pet.append(mouth);}
  shadow.append(style,pet);doc.body.append(host);doc.documentElement.setAttribute('data-md-idle-running','true');running=true;metrics.runs++;metrics.lastReason=scan.ranges.length?'word-bites':'stroll';
  // Only observe the few sampled text blocks while the effect is visible. Stop on any change.
  if(scan.ranges.length){observer=new win.MutationObserver(()=>stop('text-changed'));for(const block of new Set(scan.ranges.map(x=>x.block)))observer.observe(block,{childList:true,characterData:true,subtree:true});}
  const highlight=scan.ranges.length?new win.Highlight():null;
  if(highlight){highlight.priority=100;win.CSS.highlights.set('chatdrobe-idle-bite',highlight);}
  let from=scan.ranges.length?{x:Math.max(16,win.innerWidth-130),y:Math.max(70,win.innerHeight-270)}:{...points.at(-1)};
  try{
   for(const point of points){
    if(ticket!==generation||win.location.href!==startURL||!eligible(requested)||point.block&&!point.block.isConnected)break;
    pet.classList.toggle('facing',point.x<from.x);
    animation=host.animate([{transform:`translate(${from.x}px,${from.y}px)`},{transform:`translate(${point.x}px,${point.y}px)`}],{duration:scan.ranges.length?1400:2300,easing:'ease-in-out',fill:'forwards'});
    await animation.finished;
    if(ticket!==generation)break;
    if(point.range)highlight.add(point.range);
    from=point;
   }
   if(ticket===generation){animation=host.animate([{transform:`translate(${from.x}px,${from.y}px)`,opacity:1},{transform:`translate(${from.x}px,${from.y-16}px)`,opacity:0}],{duration:600,fill:'forwards'});await animation.finished;}
  }catch{/* Cancellation is the normal immediate exit on activity. */}
  finally{if(ticket===generation)removeVisual('complete');}
  return true;
 }
 return Object.freeze({
  configure(value){const next=JSON.stringify([value.enabled,value.idleMode,value.idleSeconds,value.wordBitesConsent,value.companion,value.theme,value.mode]);if(next===key)return;key=next;stop('reconfigured');if(enabled)detach();prefs=value;enabled=!!value.enabled&&value.idleMode!=='off'&&(value.idleMode!=='bites'||value.wordBitesConsent);played=false;last=clock();if(enabled){attach();arm();}},
  preview(){if(!enabled||reduced.matches||doc.hidden){stop('preview-blocked');return {ok:false,error:'Enable an idle effect first. Reduced motion and hidden tabs disable previews.'};}stop('preview-armed');played=false;manual=true;timer=win.setTimeout(()=>{timer=null;void run(true);},3000);return {ok:true};},
  diagnostics:()=>({...metrics,loaded:true,enabled,running,pendingTimer:timer!==null,overlayNodes:host?1:0,shortLivedTextObserver:!!observer}),
  dispose(){stop('disposed');if(enabled)detach();enabled=false;key='';prefs=null;}
 });
}
