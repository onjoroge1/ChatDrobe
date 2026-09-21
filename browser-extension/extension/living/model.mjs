/* Content-independent world state. No DOM, account access, network or executable manifests. */
export const EVENTS = Object.freeze(['CHAT_STARTED','RESPONSE_STREAMING','RESPONSE_FINISHED','FOCUS_STARTED','FOCUS_COMPLETE','FOCUS_CANCELLED','USER_IDLE','USER_RETURNED']);
export const WEATHER = Object.freeze(['clear','rain','snow','fog','aurora']);
export const TIMES = Object.freeze(['day','dusk','night','local','journey']);
export const WORLDS = Object.freeze([
 {id:'tokyo',name:'Rainy Tokyo Loft',eyebrow:'A quiet room above the city',palette:'mooncat',weather:['clear','rain','snow','fog'],defaultWeather:'rain',stages:['Morning coffee','Afternoon light','Golden hour','Windows after dark'],layers:['sky','city','traffic','window','desk','lamp','cat'],rules:{CHAT_STARTED:'lamp-on',USER_IDLE:'sleep',USER_RETURNED:'wake',FOCUS_STARTED:'quiet',FOCUS_COMPLETE:'arrive'}},
 {id:'starship',name:'Starship Journey',eyebrow:'A little further with every session',palette:'bridge',weather:['clear','aurora'],defaultWeather:'clear',stages:['Earth orbit','Lunar approach','Asteroid passage','Jupiter flyby','Deep space'],layers:['sky','stars','planet','craft','window','console','drone'],rules:{CHAT_STARTED:'lamp-on',RESPONSE_STREAMING:'signal-on',RESPONSE_FINISHED:'signal-off',USER_IDLE:'sleep',USER_RETURNED:'wake',FOCUS_STARTED:'quiet',FOCUS_COMPLETE:'arrive'}},
 {id:'train',name:'Cozy Train Journey',eyebrow:'Your window seat, somewhere new',palette:'paper',weather:['clear','rain','snow','fog'],defaultWeather:'clear',stages:['City departure','Open farmland','Mountain pass','Snow country','Sunset arrival'],layers:['sky','city','mountains','landscape','rails','window','carriage','lamp','cat'],rules:{CHAT_STARTED:'lamp-on',USER_IDLE:'sleep',USER_RETURNED:'wake',FOCUS_STARTED:'quiet',FOCUS_COMPLETE:'arrive'}}
].map(w=>Object.freeze({schemaVersion:1,...w})));
const kinds=new Set(WORLDS.flatMap(w=>w.layers));
const actions=new Set(['lamp-on','sleep','wake','quiet','arrive','signal-on','signal-off']);
export function validateWorld(w){
 if(!w||typeof w!=='object'||Array.isArray(w))throw new Error('World must be an object.');
 const keys=['schemaVersion','id','name','eyebrow','palette','weather','defaultWeather','stages','layers','rules'];
 if(Object.keys(w).some(k=>!keys.includes(k)))throw new Error('Unsupported world field; scripts, URLs and uploads are not accepted.');
 if(w.schemaVersion!==1)throw new Error('Unsupported world schema version.');
 if(!/^[a-z][a-z0-9-]{1,31}$/.test(w.id)||typeof w.name!=='string'||w.name.length>60||typeof w.eyebrow!=='string'||w.eyebrow.length>100)throw new Error('Invalid identity.');
 if(!['mooncat','bridge','paper'].includes(w.palette))throw new Error('Unsupported palette.');
 if(!Array.isArray(w.layers)||w.layers.length>10||w.layers.length<1||new Set(w.layers).size!==w.layers.length||w.layers.some(l=>!kinds.has(l)))throw new Error('Unsupported scene layer.');
 if(!Array.isArray(w.weather)||!w.weather.length||w.weather.length>5||w.weather.some(x=>!WEATHER.includes(x))||!w.weather.includes(w.defaultWeather))throw new Error('Unsupported weather.');
 if(!Array.isArray(w.stages)||!w.stages.length||w.stages.length>8||w.stages.some(s=>typeof s!=='string'||s.length>60))throw new Error('Invalid journey.');
 if(!w.rules||typeof w.rules!=='object'||Array.isArray(w.rules)||Object.entries(w.rules).some(([e,a])=>!EVENTS.includes(e)||!actions.has(a)))throw new Error('Unsupported behavior.');
 return w;
}
WORLDS.forEach(validateWorld);
export const worldById=id=>WORLDS.find(w=>w.id===id)||WORLDS[0];
export const DEFAULTS=Object.freeze({world:'tokyo',view:'portal',weather:'rain',time:'day',motion:false,quietFocus:true,reactions:false});
export function settings(v={}){
 v=v&&typeof v==='object'?v:{};const w=worldById(v.world);
 return {world:w.id,view:['portal','full'].includes(v.view)?v.view:'portal',weather:w.weather.includes(v.weather)?v.weather:w.defaultWeather,time:TIMES.includes(v.time)?v.time:'day',motion:v.motion===true,quietFocus:v.quietFocus!==false,reactions:v.reactions===true};
}
export function lighting(time,now=Date.now()){
 if(time!=='local')return ['day','dusk','night'].includes(time)?time:'day';
 const hour=new Date(now).getHours();return hour>=7&&hour<17?'day':hour>=17&&hour<20?'dusk':'night';
}
export function focus(value){
 if(!value||!Number.isFinite(value.start)||!Number.isFinite(value.end)||value.end<=value.start||value.end-value.start>10800000||typeof value.id!=='string'||value.id.length>100||!['running','complete','cancelled'].includes(value.status))return null;
 return {id:value.id,start:value.start,end:value.end,status:value.status};
}
export function progress(session,now=Date.now()){
 const f=focus(session);if(!f)return 0;if(f.status==='complete')return 1;if(f.status==='cancelled')return 0;
 return Math.max(0,Math.min(1,(now-f.start)/(f.end-f.start)));
}
export function stageFor(w,session,now=Date.now()) {return Math.min(w.stages.length-1,Math.floor(progress(session,now)*w.stages.length));}
export function nextBoundary(w,session,time,now=Date.now()){
 const f=focus(session);let next=Infinity;
 if(f?.status==='running'&&now<f.end){const stage=stageFor(w,f,now);next=Math.min(f.end,f.start+(stage+1)*(f.end-f.start)/w.stages.length);}
 if(time==='local'){const d=new Date(now);d.setHours(d.getHours()+1,0,0,0);next=Math.min(next,d.getTime());}
 return Number.isFinite(next)?Math.max(250,next-now+20):null;
}
export function state(initial={}) {return {idle:false,lamp:false,streaming:false,focused:false,arrived:false,...initial};}
export function react(w,s,event){
 if(!EVENTS.includes(event))return s;const n={...s};
 // Core state transitions remain shared; per-world manifests opt into corresponding visuals.
 if(event==='FOCUS_CANCELLED'){n.focused=false;n.arrived=false;}
 if(event==='FOCUS_STARTED'){n.focused=true;n.arrived=false;}
 if(event==='FOCUS_COMPLETE'){n.focused=false;n.arrived=true;}
 const action=w.rules[event];
 if(action==='lamp-on')n.lamp=true;
 if(action==='sleep')n.idle=true;
 if(action==='wake'){n.idle=false;n.lamp=true;}
 if(action==='signal-on')n.streaming=true;
 if(action==='signal-off')n.streaming=false;
 return n;
}
/* Layout protects the entire measured conversation band, including offscreen messages.
   Until both reading and composer bounds are known, retain the requested-width guard. */
export function placement(main,composer,width,view,viewport,reading=null){
 const action='Collapse the ChatGPT sidebar, widen the window, or choose a theme.';
 if(!main||main.width<280||viewport.height<380)return {visible:false,reason:'No supported conversation layout.',action};
 const left=Math.max(0,main.left),right=Math.min(viewport.width,main.right);
 const band=Math.max(600,width,composer?.width||0),center=(left+right)/2;
 const bounded=r=>Number.isFinite(r?.left)&&Number.isFinite(r?.right)&&r.right>r.left;
 const measured=bounded(reading)&&bounded(composer);
 const protectedLeft=measured?Math.min(reading.left,composer.left):Math.min(center-band/2,bounded(reading)?reading.left:Infinity,bounded(composer)?composer.left:Infinity);
 const protectedRight=measured?Math.max(reading.right,composer.right):Math.max(center+band/2,bounded(reading)?reading.right:-Infinity,bounded(composer)?composer.right:-Infinity);
 const safeLeft=Math.min(right,Math.max(left,protectedLeft-20)),safeRight=Math.max(left,Math.min(right,protectedRight+20));
 const bottom=Math.min(viewport.height-24,composer?.top>180?composer.top-20:viewport.height-230);
 const top=86,height=bottom-top;
 const gap=Math.max(safeLeft-left,right-safeRight);
 if(gap<80||height<100)return {visible:false,reason:'The world needs more clear margin beside the conversation.',action};
 const compact=gap<128||height<160;
 if(view==='portal'||compact){
  const w=Math.min(300,gap-16),h=Math.min(235,height,w*.72+22);
  return {visible:true,left:right-safeRight>=safeLeft-left?safeRight+8:left+8,top:bottom-h,width:w,height:h,view:'portal',requestedView:view,compact,measured};
 }
 return {visible:true,left,top,width:right-left,height,view,compact:false,measured,cutLeft:Math.max(0,safeLeft-left),cutRight:Math.min(right-left,safeRight-left)};
}

/* Diagnostics distinguish visible artwork from motion intentionally held by policy. */
export function renderStatus(v={}){
 const suppressionReasons=[];
 for(const [key,label] of [['reducedMotion','reduced-motion preference'],['composing','text composition'],['selection','text selection'],['media','media playback'],['streaming','a response in progress'],['quietFocus','the focus timer'],['busy','recent input'],['sleep','the companion is asleep']])if(v[key])suppressionReasons.push(label);
 if(!v.active)suppressionReasons.unshift(v.pageVisible===false?'an inactive ChatGPT tab':'focus outside the ChatGPT page');
 const common={visible:false,motionRequested:!!v.motion,motionAllowed:false,suppressionReasons};
 if(!v.enabled)return {...common,state:'off',reason:'World is off.',action:''};
 if(!v.mounted)return {...common,state:'loading',reason:'Waiting for the ChatGPT page to be ready.',action:''};
 if(v.dialog)return {...common,state:'paused',reason:'World hidden while a dialog is open.',action:'Close the dialog to show the world.'};
 if(!v.layout?.visible)return {...common,state:'blocked',reason:v.layout?.reason||'No supported conversation layout.',action:v.layout?.action||'Open a ChatGPT conversation.'};
 const visible=v.pageVisible!==false;
 const mode=v.layout.compact?'Compact world':'World';
 if(!visible)return {...common,state:'paused',reason:'World paused while this ChatGPT tab is inactive.',action:'Return to the ChatGPT tab.'};
 if(v.motion&&suppressionReasons.length)return {...common,visible:true,state:'paused',reason:`${mode} visible; motion paused for ${suppressionReasons.join(', ')}.`,action:''};
 return {...common,visible:true,motionAllowed:!!v.motion,state:'displayed',reason:`${mode} displayed${v.motion?'; motion enabled':'; Still selected'}.`,action:''};
}

export function sceneLighting(time,stage,total,now=Date.now()){if(time==='journey'){const fraction=stage/Math.max(1,total-1);return fraction<.5?'day':fraction<1?'dusk':'night';}return lighting(time,now);}
