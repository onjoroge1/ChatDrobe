import {createTour} from './living-tour.js';
/* First-party demo only. No extension APIs, conversation inspection, storage or payment calls. */
let resources;
function loadRenderer(){
 if(!resources)resources=Promise.all([import('./living-renderer.js'),import('./living-model.js')]).catch(error=>{resources=null;throw error;});
 return resources;
}
const names={tokyo:'Rainy Tokyo Loft',starship:'Starship Journey',train:'Cozy Train Journey'};
const eventNotes={rest:'Normal workspace. Nothing is sent or recorded.',CHAT_STARTED:'The desk lamp turns on; the spacecraft enters its active state.',USER_IDLE:'The cat closes its eyes; the spacecraft companion rests.',USER_RETURNED:'The companion wakes and the workspace returns to its active state.',FOCUS_STARTED:'Quiet Focus pauses ambient motion. Journey chapters can still advance.',FOCUS_COMPLETE:'The arrival marker celebrates a completed session. This demo awards no focus minutes.',RESPONSE_STREAMING:'The spacecraft signal lights pulse when motion is enabled. No response text is read.'};
for(const preview of document.querySelectorAll('[data-living-preview]')){
 const $=s=>preview.querySelector(s),buttons=[...preview.querySelectorAll('[data-env-select]')];
 let world=buttons.find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.envSelect||'tokyo';
 let requested=false,visible=true,alive=true,loading=null,sequence=0,renderer,model,scene,sceneWorld;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();
 const motion=$('[data-env-motion]'),light=$('[data-env-light]'),portal=$('[data-env-portal]');
 const play=$('[data-env-play]'),slider=$('[data-env-progress]'),weather=$('[data-env-weather]'),time=$('[data-env-time]'),moment=$('[data-env-event]');
 const host=$('[data-env-live]'),stage=$('.env-stage'),error=$('[data-env-error]');
 const tour=createTour({onChange:()=>paint()});
 const canRun=()=>visible&&!document.hidden&&document.hasFocus()&&!reduced.matches;
 const listen=(target,name,fn)=>target.addEventListener(name,fn,{signal:events.signal});
 const text=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 const definition=()=>model.worldById(world);
 function weatherChoices(){
  const d=definition();weather.replaceChildren(...d.weather.map(id=>{const o=document.createElement('option');o.value=id;o.textContent=id[0].toUpperCase()+id.slice(1);return o;}));
  weather.value=d.defaultWeather;
  moment.querySelector('[value="RESPONSE_STREAMING"]').disabled=!d.rules.RESPONSE_STREAMING;
 }
 async function ready(){
  if(renderer)return;
  if(!loading)loading=(async()=>{
   const [r,m]=await loadRenderer();if(!alive)return;
   const shadow=host.shadowRoot||host.attachShadow({mode:'open'});
   await new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./living-runtime.css',import.meta.url).href;
    link.onload=resolve;link.onerror=()=>{link.remove();reject(new Error('Scene stylesheet unavailable'));};shadow.append(link);
   });
   if(!alive)return;renderer=r;model=m;weatherChoices();tour.reset(definition().stages.length);
  })().catch(e=>{loading=null;throw e;});
  await loading;
 }
 function use(action){
  const ticket=++sequence;error.hidden=true;preview.setAttribute('aria-busy','true');
  ready().then(()=>{if(!alive||ticket!==sequence)return;action();paint();}).catch(()=>{
   if(!alive||ticket!==sequence)return;tour.pause();requested=false;error.hidden=false;
   error.textContent='The live scene could not load. Your static preview still works. Retry a control or refresh this page.';
  }).finally(()=>{if(ticket===sequence)preview.removeAttribute('aria-busy');});
 }
 function reset(){
  sequence++;requested=false;time.value='day';moment.value='rest';preview.dataset.view='full';portal.setAttribute('aria-pressed','false');
  if(model)weatherChoices();tour.reset(model?definition().stages.length:4);error.hidden=true;preview.removeAttribute('aria-busy');paint();
 }
 function paint(){
  if(!alive)return;
  const snap=tour.snapshot(),moving=(requested||snap.playing)&&!reduced.matches;
  preview.dataset.motion=String(moving);preview.dataset.active=String(canRun());preview.dataset.playing=String(snap.playing);
  motion.disabled=reduced.matches;motion.setAttribute('aria-pressed',String(moving));
  text(motion,reduced.matches?'Reduced motion enabled':moving?'Pause motion':'Enable motion');
  play.disabled=reduced.matches;
  text(play,reduced.matches?'Choose a chapter below':snap.playing?'Pause journey':snap.complete?'Replay 30-second journey':snap.progress>0?'Resume journey':'Watch a 30-second journey');
  for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.envSelect===world));
  for(const room of preview.querySelectorAll('.env-stage > [data-env-room]'))room.hidden=room.dataset.envRoom!==world||Boolean(renderer);
  let day=time.value==='night'?'night':'day',chapter='Morning coffee';
  if(renderer){
   const d=definition();day=model.sceneLighting(time.value,snap.stage,d.stages.length);chapter=d.stages[snap.stage];
   if(sceneWorld!==world){const next=renderer.createScene(document,d);scene?.element.remove();scene=next;sceneWorld=world;host.shadowRoot.append(scene.element);}
   const behavior=moment.value==='rest'?model.state():model.react(d,model.state(),moment.value);
   const arrived=behavior.arrived||snap.complete;
   scene.update({...behavior,arrived,light:day,weather:weather.value,stage:snap.stage,label:chapter,motion:moving,active:canRun(),quiet:true});
   host.hidden=false;preview.dataset.ready='true';
   text($('[data-env-badge]'),arrived?'Session complete · '+chapter:chapter);
   text($('[data-env-chapter]'),`${snap.stage+1} / ${d.stages.length} · ${chapter}`);
   slider.value=String(Math.round(snap.progress*100));slider.setAttribute('aria-valuetext',chapter);
  }
  preview.dataset.day=day;light.setAttribute('aria-pressed',String(day==='night'));
  text($('[data-env-reaction]'),eventNotes[moment.value]||eventNotes.rest);
  const pause=snap.playing&&!canRun()?' · Tour waiting for this preview to be visible':'';
  text($('[data-env-status]'),`${names[world]} · ${day==='night'?'Night':day==='dusk'?'Golden hour':'Day'} · ${moving?'Motion on':'Motion off'}${renderer?' · '+chapter:''}${pause}`);
 }
 for(const button of buttons)listen(button,'click',()=>use(()=>{
  const id=button.dataset.envSelect;if(!Object.hasOwn(names,id))return;world=id;requested=false;time.value='day';moment.value='rest';weatherChoices();tour.reset(definition().stages.length);
 }));
 listen(play,'click',()=>use(()=>{
  if(reduced.matches)return;
  if(tour.snapshot().playing)tour.pause();else{time.value='journey';moment.value='rest';tour.visible(canRun());tour.play();}
 }));
 listen(slider,'input',()=>{const value=Number(slider.value)/100;use(()=>{tour.pause();tour.seek(value);time.value='journey';moment.value='rest';});});
 listen(weather,'change',()=>{const selected=weather.value;use(()=>{weather.value=definition().weather.includes(selected)?selected:definition().defaultWeather;});});
 listen(time,'change',()=>use(()=>{}));
 listen(moment,'change',()=>use(()=>{
  if(moment.value==='RESPONSE_STREAMING'&&!definition().rules.RESPONSE_STREAMING)moment.value='rest';
  if(moment.value==='FOCUS_COMPLETE'){tour.pause();tour.seek(1);}
 }));
 listen(light,'click',()=>use(()=>{time.value=preview.dataset.day==='night'?'day':'night';}));
 listen(portal,'click',()=>use(()=>{const on=preview.dataset.view!=='portal';preview.dataset.view=on?'portal':'full';portal.setAttribute('aria-pressed',String(on));}));
 listen(motion,'click',()=>use(()=>{if(reduced.matches)return;const currently=requested||tour.snapshot().playing;if(currently){requested=false;tour.pause();}else requested=true;}));
 listen($('[data-env-reset]'),'click',reset);
 function visibility(){if(!alive)return;tour.visible(canRun());paint();}
 listen(reduced,'change',()=>{if(reduced.matches){requested=false;tour.pause();}visibility();});
 for(const event of ['focus','blur','pageshow'])listen(window,event,visibility);
 listen(document,'visibilitychange',visibility);
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility();}):null;
 observer?.observe(preview);
 listen(window,'pagehide',event=>{tour.visible(false);if(!event.persisted){alive=false;tour.destroy();observer?.disconnect();events.abort();sequence++;}});
 visibility();
}
