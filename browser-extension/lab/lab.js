import {WORLDS,worldById,settings,lighting,sceneLighting,state,react} from './model.mjs';
import {createScene,SCENE_CSS} from './scene.mjs';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let opts=settings({view:'full'}),ui=state(),world=worldById(opts.world),scene,percent=0;
const host=$('scene-host'),shadow=host.attachShadow({mode:'open'}),style=new CSSStyleSheet();style.replaceSync(SCENE_CSS);shadow.adoptedStyleSheets=[style];
function render(){
 const stage=Math.min(world.stages.length-1,Math.floor(percent/100*world.stages.length));
 scene.update({world:world.id,weather:opts.weather,light:sceneLighting(opts.time,stage,world.stages.length),motion:opts.motion&&!reduced.matches,active:!document.hidden,quiet:opts.quietFocus,stage,label:world.stages[stage],...ui});
 $('stage').classList.toggle('portal',opts.view==='portal');$('chapter').textContent=world.stages[stage];$('percent').textContent=percent+'% · preview timeline';
 [...$('chapters').children].forEach((n,i)=>n.classList.toggle('active',i===stage));
}
function choose(id){
 world=worldById(id);opts=settings({...opts,world:id,weather:world.defaultWeather});ui=state();percent=0;$('timeline').value=0;
 scene?.element.remove();scene=createScene(document,world);shadow.append(scene.element);
 $('world-title').textContent=world.name;$('subtitle').textContent=world.eyebrow;
 $('weather').replaceChildren(...world.weather.map(w=>new Option(w[0].toUpperCase()+w.slice(1),w)));$('weather').value=opts.weather;
 $('chapters').replaceChildren(...world.stages.map(s=>{const n=document.createElement('span');n.textContent=s;return n;}));
 [...$('worlds').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===id)));render();
}
for(const w of WORLDS){const b=document.createElement('button');b.className='world';b.dataset.world=w.id;b.type='button';b.textContent=w.name;const sub=document.createElement('span');sub.textContent={tokyo:'Room / atmosphere',starship:'Journey / space',train:'Journey / landscape'}[w.id];b.append(sub);b.addEventListener('click',()=>choose(w.id));$('worlds').append(b);}
for(const key of ['view','time','weather'])$(key).addEventListener('change',()=>{opts=settings({...opts,[key]:$(key).value});render();});
$('motion').addEventListener('change',()=>{opts.motion=$('motion').checked;render();});$('quiet').addEventListener('change',()=>{opts.quietFocus=$('quiet').checked;render();});
$('timeline').addEventListener('input',()=>{percent=Number($('timeline').value);ui.arrived=percent===100;render();});
for(const b of document.querySelectorAll('[data-event]'))b.addEventListener('click',()=>{ui=react(world,ui,b.dataset.event);if(b.dataset.event==='FOCUS_COMPLETE'){percent=100;$('timeline').value=100;}if(b.dataset.event==='FOCUS_STARTED'){percent=0;$('timeline').value=0;}$('event-status').textContent='Simulated event: '+b.dataset.event+' — no ChatGPT data is connected.';render();});
$('reset').addEventListener('click',()=>{opts=settings({view:'full'});$('view').value='full';$('time').value='day';$('motion').checked=false;$('quiet').checked=true;choose('tokyo');$('event-status').textContent='Demo reset. Motion off; no account connected.';});
document.addEventListener('visibilitychange',render);window.addEventListener('blur',()=>{scene.element.dataset.active='false';});window.addEventListener('focus',render);reduced.addEventListener('change',render);choose('tokyo');
