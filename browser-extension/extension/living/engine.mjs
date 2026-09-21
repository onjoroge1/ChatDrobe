import {settings,worldById,focus,lighting,sceneLighting,stageFor,nextBoundary,state,react,placement,renderStatus} from './model.mjs';
import {createScene,SCENE_CSS} from './quiet-scene.mjs';
import {createQuietPolicy} from './quiet-policy.mjs';
/* One inert Shadow DOM scene, clipped out of the reading/composer band. No text sampling. */
export function createEnvironment(doc,win){
 let prefs=null,opts=settings(),world=worldById('tokyo'),session=null,sessionKey='',host=null,scene=null,shadow=null;
 let ui=state(),disposed=false,boundary=null,idleTimer=null,observer=null,resize=null,raf=null;
 let lastInput=Date.now(),nativeStreaming=false,bindings=false,lastConfig='',paintKey='',lastLayout=null,dialogBlocked=false;
 let observedComposer=null,composing=false,selectionActive=false,mediaBusy=false;
 const quiet=createQuietPolicy({now:()=>win.performance.now(),setTimer:(fn,ms)=>win.setTimeout(fn,ms),clearTimer:id=>win.clearTimeout(id),onChange:()=>paint()});
 const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
 const metrics={mounts:0,paints:0,events:0,geometryChecks:0};
 const active=()=>!doc.hidden&&doc.hasFocus();
 const composerElement=()=>doc.querySelector('#composer-background')||doc.querySelector('form:has(#prompt-textarea)')||doc.querySelector('#thread-bottom-container');
 function syncQuiet(){quiet.configure({enabled:opts.motion&&!reduced.matches,active:active()&&!!host&&!host.hidden,quiet:composing||selectionActive||mediaBusy||nativeStreaming||(opts.quietFocus&&ui.focused),world:world.id,behavior:prefs?.livingBehavior});}
 function emit(event){ui=react(world,ui,event);metrics.events++;syncQuiet();paint();}
 function mount(){
  if(host||!doc.body)return;
  host=doc.createElement('div');host.id='chatdrobe-environment';host.setAttribute('aria-hidden','true');host.inert=true;
  host.style.cssText='position:fixed;z-index:2;pointer-events:none!important;user-select:none!important;overflow:hidden;contain:layout style paint;';
  shadow=host.attachShadow({mode:'open'});const style=new win.CSSStyleSheet();style.replaceSync(SCENE_CSS);shadow.adoptedStyleSheets=[style];
  scene=createScene(doc,world);if(prefs?.livingCompanionOnly)scene.setCompanionOnly?.();shadow.append(scene.element);doc.body.append(host);metrics.mounts++;
  if(typeof win.ResizeObserver==='function'){resize=new win.ResizeObserver(scheduleGeometry);const main=doc.querySelector('main');if(main)resize.observe(main);const form=composerElement();if(form)resize.observe(form);}
  layout(); // No cinematic entrance while using a productive workspace.
 }
 function unmount(){scene?.dispose?.();resize?.disconnect();resize=null;host?.getAnimations().forEach(a=>a.cancel());host?.remove();host=scene=shadow=null;paintKey='';}
 function modalOpen(){return [...doc.querySelectorAll('[role="dialog"][aria-modal="true"]:not([hidden]),dialog[open]')].slice(0,10).some(n=>n.getClientRects().length>0);}
 function readingBounds(){
  // Union geometry across the conversation, never paragraph contents or just one message.
  const nodes=doc.querySelectorAll('main .markdown,main [data-message-author-role]');
  if(!nodes.length||nodes.length>200)return null; // Fall back to the conservative width guard.
  let left=Infinity,right=-Infinity;
  for(const node of nodes){const r=node.getBoundingClientRect();if(r.width>0){left=Math.min(left,r.left);right=Math.max(right,r.right);}}
  return right>left?{left,right,width:right-left}:null;
 }
 function layout(){
  if(raf!==null)win.cancelAnimationFrame(raf);raf=null;if(!host)return;metrics.geometryChecks++;
  const c=doc.querySelector('#thread-bottom-container')||doc.querySelector('form:has(#prompt-textarea)');if(c!==observedComposer)bindReactions();
  const main=doc.querySelector('main');const form=composerElement();
  const m=main?.getBoundingClientRect(),f=form?.getBoundingClientRect();
  const reading=readingBounds();
  const p=placement(m,f,prefs.width,opts.view,{width:win.innerWidth,height:win.innerHeight},reading);
  const blocked=modalOpen();lastLayout=p;dialogBlocked=blocked;host.hidden=!p.visible||blocked;
  if(!p.visible||blocked){syncQuiet();paint();return;}
  Object.assign(host.style,{left:p.left+'px',top:p.top+'px',width:p.width+'px',height:p.height+'px',borderRadius:p.view==='portal'?'18px':'0',boxShadow:p.view==='portal'&&!prefs?.livingCompanionOnly?'0 10px 35px #16273822':'none'});
  if(scene.setHabitat){const rightGap=p.view==='full'?p.width-p.cutRight:p.width;const leftGap=p.view==='full'?p.cutLeft:0;const useRight=rightGap>=leftGap;const space=useRight?rightGap:leftGap;scene.setHabitat({view:p.view,width:Math.max(0,space-16),left:useRight?p.width-space+8:8});}
  host.style.maskImage=p.view==='full'?`linear-gradient(to right,#000 0px,#000 ${p.cutLeft}px,transparent ${p.cutLeft}px,transparent ${p.cutRight}px,#000 ${p.cutRight}px,#000 100%)`:'none';
  syncQuiet();paint();
 }
 function scheduleGeometry(){if(raf===null&&!doc.hidden)raf=win.requestAnimationFrame(layout);}
 function paint(){
  if(!scene)return;
  const q=quiet.snapshot(),stage=stageFor(world,session),s={busy:q.busy||composing||selectionActive||mediaBusy||nativeStreaming,pose:q.pose,poseSerial:q.serial,idleStage:q.stage,world:world.id,light:sceneLighting(opts.time,stage,world.stages.length),weather:opts.weather,motion:opts.motion&&!reduced.matches,active:active()&&!host.hidden,quiet:opts.quietFocus,stage,label:world.stages[stage],...ui};
  const key=JSON.stringify(s);if(key===paintKey)return;paintKey=key;scene.update(s);metrics.paints++;
 }
 function tick(){
  clearTimeout(boundary);boundary=null;if(disposed||!prefs?.enabled||!prefs.livingEnabled||!active())return;
  // Deadline-driven visual completion. The worker alone persists aggregate completion.
  if(session?.status==='running'&&Date.now()>=session.end&&!ui.arrived)emit('FOCUS_COMPLETE');else paint();
  const delay=nextBoundary(world,session,opts.time);if(delay!==null)boundary=setTimeout(tick,delay);
 }
 function armIdle(){
  if(idleTimer||!opts.reactions||!active()||ui.idle)return;
  const idleAfter=(prefs?.idleSeconds||60)*1000;
  idleTimer=setTimeout(()=>{idleTimer=null;if(!active()||!opts.reactions)return;const remaining=idleAfter-(Date.now()-lastInput);if(remaining>0)armIdle();else emit('USER_IDLE');},Math.max(250,idleAfter-(Date.now()-lastInput)));
 }
 function activity(){if(!active())return;quiet.activity();lastInput=Date.now();if(opts.reactions&&ui.idle)emit('USER_RETURNED');armIdle();}
 function mediaChanged(){const media=doc.querySelectorAll('video,audio');let next=false;for(let i=0;i<Math.min(8,media.length);i++){if(!media[i].paused&&!media[i].ended){next=true;break;}}if(mediaBusy!==next){mediaBusy=next;syncQuiet();paint();}}
 function selectionChanged(){const selection=doc.getSelection?.();const active=!!selection&&!selection.isCollapsed;if(selectionActive!==active){selectionActive=active;syncQuiet();paint();}}
 function composingStart(){composing=true;syncQuiet();activity();}
 function composingEnd(){composing=false;syncQuiet();activity();}
 function controls(){
  // Only status/control geometry, never textContent, draft values, message nodes or key values.
  const element=doc.querySelector('#thread-bottom-container [data-testid="stop-button"],#composer-background [data-testid="stop-button"],form [data-testid="stop-button"]');
  const running=!!element&&element.getClientRects().length>0;
  if(running!==nativeStreaming){nativeStreaming=running;syncQuiet();if(opts.reactions)emit(running?'RESPONSE_STREAMING':'RESPONSE_FINISHED');else paint();}
  scheduleGeometry();
 }
 function onClick(event){
  if(opts.reactions&&event.target?.closest?.('[data-testid="send-button"]'))emit('CHAT_STARTED');
  scheduleGeometry();
 }
 function onSubmit(event){if(opts.reactions&&event.target?.querySelector?.('#prompt-textarea'))emit('CHAT_STARTED');}
 function bindReactions(){
  observer?.disconnect();observer=null;observedComposer=null;
  for(const name of ['pointermove','keydown','pointerdown','scroll'])win.removeEventListener(name,activity,true);
  clearTimeout(idleTimer);idleTimer=null;
  if(opts.reactions||opts.motion)for(const name of ['pointermove','keydown','pointerdown','scroll'])win.addEventListener(name,activity,{capture:true,passive:true});
  const composer=doc.querySelector('#thread-bottom-container')||doc.querySelector('form:has(#prompt-textarea)');
  if(composer){observedComposer=composer;observer=new win.MutationObserver(controls);observer.observe(composer,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','data-testid','aria-busy']});controls();}
  armIdle();
 }
 function lifecycle(){
  clearTimeout(boundary);boundary=null;clearTimeout(idleTimer);idleTimer=null;
  if(raf!==null){win.cancelAnimationFrame(raf);raf=null;}
  if(!active()){syncQuiet();host?.getAnimations().forEach(a=>a.cancel());paint();return;}
  lastInput=Date.now();if(opts.reactions&&ui.idle)emit('USER_RETURNED');syncQuiet();layout();tick();armIdle();
 }
 function install(){if(bindings)return;bindings=true;for(const name of ['play','pause','ended'])doc.addEventListener(name,mediaChanged,true);mediaChanged();doc.addEventListener('visibilitychange',lifecycle);doc.addEventListener('selectionchange',selectionChanged);doc.addEventListener('compositionstart',composingStart,true);doc.addEventListener('compositionend',composingEnd,true);win.addEventListener('focus',lifecycle);win.addEventListener('blur',lifecycle);win.addEventListener('resize',scheduleGeometry);win.addEventListener('popstate',scheduleGeometry);doc.addEventListener('click',onClick,true);doc.addEventListener('submit',onSubmit,true);doc.addEventListener('DOMContentLoaded',ready,{once:true});reduced.addEventListener('change',lifecycle);}
 function ready(){if(disposed||!prefs?.enabled||!prefs.livingEnabled)return;mount();bindReactions();tick();}
 function clear(){
  clearTimeout(boundary);boundary=null;clearTimeout(idleTimer);idleTimer=null;observer?.disconnect();observer=null;
  if(raf!==null){win.cancelAnimationFrame(raf);raf=null;}
  for(const name of ['pointermove','keydown','pointerdown','scroll'])win.removeEventListener(name,activity,true);
  if(bindings){for(const name of ['play','pause','ended'])doc.removeEventListener(name,mediaChanged,true);doc.removeEventListener('visibilitychange',lifecycle);doc.removeEventListener('selectionchange',selectionChanged);doc.removeEventListener('compositionstart',composingStart,true);doc.removeEventListener('compositionend',composingEnd,true);win.removeEventListener('focus',lifecycle);win.removeEventListener('blur',lifecycle);win.removeEventListener('resize',scheduleGeometry);win.removeEventListener('popstate',scheduleGeometry);doc.removeEventListener('click',onClick,true);doc.removeEventListener('submit',onSubmit,true);doc.removeEventListener('DOMContentLoaded',ready);reduced.removeEventListener('change',lifecycle);bindings=false;}
  quiet.configure({enabled:false});composing=false;selectionActive=false;mediaBusy=false;nativeStreaming=false;unmount();lastLayout=null;dialogBlocked=false;lastConfig='';
 }
 return {configure(p,snapshot=null){
  if(disposed)return;const changedSurface=!!prefs?.livingCompanionOnly!==!!p?.livingCompanionOnly;prefs=p;if(changedSurface)unmount();
  if(!p?.enabled||!p.livingEnabled){clear();return;}
  const next=settings({world:p.livingWorld,view:p.livingView,weather:p.livingWeather,time:p.livingTime,motion:p.livingMotion,quietFocus:p.livingQuiet,reactions:p.livingReactions});
  const changed=JSON.stringify({...next,behavior:p.livingBehavior,width:p.width})!==lastConfig;const worldChanged=opts.world!==next.world;opts=next;world=worldById(opts.world);lastConfig=JSON.stringify({...opts,behavior:p.livingBehavior,width:p.width});
  if(worldChanged){unmount();ui=state();nativeStreaming=false;sessionKey='';}
  install();mount();
  const f=focus(snapshot);const key=JSON.stringify(f);
  if(key!==sessionKey){sessionKey=key;session=f;ui.arrived=false;ui.focused=false;
   if(f?.status==='running')emit(Date.now()>=f.end?'FOCUS_COMPLETE':'FOCUS_STARTED');else if(f?.status==='complete')emit('FOCUS_COMPLETE');else emit('FOCUS_CANCELLED');
  }
  if(changed){lastInput=Date.now();if(!opts.reactions){ui.idle=false;ui.streaming=false;ui.lamp=false;}bindReactions();layout();}
  syncQuiet();tick();paint();
 },diagnostics(){if(host){if(raf!==null)win.cancelAnimationFrame(raf);layout();}const q=quiet.diagnostics();return {...metrics,loaded:true,active:!!host&&!host.hidden&&active(),...renderStatus({enabled:!!prefs?.enabled&&prefs.livingEnabled,mounted:!!host,layout:lastLayout,dialog:dialogBlocked,active:active(),pageVisible:!doc.hidden,motion:opts.motion,reducedMotion:reduced.matches,composing,selection:selectionActive,media:mediaBusy,streaming:nativeStreaming,quietFocus:opts.quietFocus&&ui.focused,busy:q.busy,sleep:q.pose==='sleep'}),world:world.id,view:lastLayout?.view||opts.view,requestedView:opts.view,layout:lastLayout,sceneNodes:scene?.nodeCount()||0,stage:stageFor(world,session),boundaryTimer:!!boundary,idleTimer:!!idleTimer,controlObserver:!!observer,reducedMotion:reduced.matches,contentReads:0,quiet:q,companion:scene?.motionDiagnostics?.()||null};},dispose(){clear();quiet.dispose();disposed=true;}};
}
