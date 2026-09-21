import {createScene as baseScene,SCENE_CSS as BASE_CSS} from './scene.mjs';
import {createCatRig} from './companion-rig.mjs';
import {CLIPS} from './companion-motion.mjs';
/* One original articulated companion in a bounded margin habitat. Never samples a page. */
export const QUIET_CSS=`
.caption{display:none!important}
.room .traffic,.room .craft,.room .drone,.room .signal{animation:none!important}
.room[data-weather=rain] .rain{opacity:.22!important}
.room[data-weather=snow] .snow{opacity:.4!important}
.room[data-weather=aurora] .aurora{opacity:.17!important}
.room .landscape-move{animation-duration:100s!important}
.room .planet-turn{animation-duration:240s!important}
.companion-habitat{position:absolute;right:0;bottom:0;width:48%;aspect-ratio:320/190;overflow:hidden;pointer-events:none;contain:layout style paint}
.companion-habitat>svg{display:block;width:100%;height:100%;overflow:hidden}
.companion-cat [data-bone]{transform-box:view-box;transform-origin:0 0}
.room[data-stage="3"] .windows{opacity:.8}
.room [data-depth=near]{transform-box:fill-box;transform-origin:center}
.room[data-motion=true][data-active=true][data-idle-stage=unwinding] [data-depth=near]{animation:habitat-landscape 110s linear infinite alternate}
.room[data-motion=true][data-active=true][data-idle-stage=comfortable] [data-depth=near]{animation:habitat-landscape 140s linear infinite alternate}
.room .tea-steam{fill:none;stroke:#f8e9d2;stroke-width:2.2;opacity:0}
.room[data-light=night] .tea-steam{stroke:#e7d0be}
.room[data-motion=true][data-active=true] .tea-steam{opacity:.22;animation:habitat-steam 16s ease-in-out infinite}
.room[data-busy=true] *,.room[data-active=false] *,.room[data-motion=false] *,.room[data-focused=true][data-quiet=true] *{animation-play-state:paused!important}
@keyframes habitat-landscape{to{transform:translateX(-85px)}}
@keyframes habitat-steam{0%,100%{opacity:.08;transform:translateY(0)}50%{opacity:.25;transform:translateY(-5px)}}
@media(prefers-reduced-motion:reduce){.room *{animation:none!important;transition:none!important}}
`;
export const SCENE_CSS=BASE_CSS+QUIET_CSS;
const DETAIL_NS='http://www.w3.org/2000/svg';
export function createScene(doc,definition){
 const scene=baseScene(doc,definition),catLayer=scene.element.querySelector('[data-layer="cat"]');
 let cat=null,habitat=null,activeAnimations=[],lastSignature='',held=null,disposed=false;
 if(catLayer){catLayer.remove();cat=createCatRig(doc);habitat=doc.createElement('div');habitat.className='companion-habitat';habitat.append(cat.element);scene.element.append(habitat);}
 scene.element.querySelector('.caption')?.remove();
 const svg=scene.element.querySelector('svg'),view=svg?.querySelector('g[clip-path]');
 const n=(tag,attrs)=>{const node=doc.createElementNS(DETAIL_NS,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
 // Small foreground details use the existing scene host; no rewards or informational layer.
 if(definition.id==='tokyo'){const desk=scene.element.querySelector('[data-layer="desk"]');desk?.append(n('path',{class:'tea-steam',d:'M688 487q-6-9 0-17t0-17M703 486q7-8 0-15t0-15'}));}
 if(definition.id==='train'&&view){const near=n('g',{'data-depth':'near',opacity:'.28',fill:'var(--near)'});for(let i=0;i<7;i++)near.append(n('path',{d:`M${-85+i*175} 475l25-52l25 52Z`}));view.append(near);}
 function cancelDrone(){for(const a of activeAnimations){a.onfinish=null;a.cancel();}activeAnimations=[];}
 function droneClip(pose){
  const drone=scene.element.querySelector('.drone');if(!drone||!['inspect','calibrate','dock'].includes(pose))return;
  const frames=pose==='inspect'?[{transform:'translate(0px,0px) rotate(0deg)'},{offset:.25,transform:'translate(-9px,-6px) rotate(-3deg)'},{offset:.65,transform:'translate(-9px,-6px) rotate(3deg)'},{transform:'translate(0px,0px) rotate(0deg)'}]:pose==='calibrate'?[{transform:'translate(0px,0px) rotate(0deg)'},{offset:.2,transform:'translate(-13px,-12px) rotate(0deg)'},{offset:.43,transform:'translate(-24px,-13px) rotate(-5deg)'},{offset:.7,transform:'translate(-12px,-12px) rotate(4deg)'},{transform:'translate(0px,0px) rotate(0deg)'}]:[{transform:'translate(0px,0px)'},{offset:.3,transform:'translate(-7px,-8px)'},{offset:.74,transform:'translate(0px,5px)'},{transform:'translate(0px,7px)'}];
  const a=drone.animate(frames,{duration:CLIPS[pose],easing:'cubic-bezier(.4,0,.25,1)',iterations:1,fill:'none'});activeAnimations=[a];a.onfinish=()=>cancelDrone();
 }
 return {...scene,
  setCompanionOnly(){const backdrop=scene.element.querySelector(':scope > svg');backdrop?.remove();scene.element.style.background='transparent';scene.element.dataset.companionOnly='true';},
  setHabitat(value){if(!habitat)return;const width=Math.max(0,Math.min(280,value.width));if(value.view==='full'){habitat.style.width=width+'px';habitat.style.left=value.left+'px';habitat.style.right='auto';habitat.style.bottom='6px';}else{habitat.style.width=scene.element.dataset.companionOnly==='true'?'100%':'58%';habitat.style.left='auto';habitat.style.right='0';habitat.style.bottom='0';}},
  update(value){
   if(disposed)return;const s={...value},pose=Object.hasOwn(CLIPS,s.pose)||s.pose==='sleep'?s.pose:'rest';
   const blocked=s.busy===true||s.streaming===true||(s.focused===true&&s.quiet===true);
   const allowed=!blocked&&s.motion===true&&s.active===true;
   s.pose=allowed?pose:'rest';s.idleStage=s.idleStage||'working';
   if(!allowed||pose==='sleep')s.motion=false;
   // Idle reactions do not force closed eyes during an articulated performance.
   s.idle=s.pose==='sleep';
   if((s.busy||s.streaming)&&held){s.stage=held.stage;s.light=held.light;s.label=held.label;}else held={stage:s.stage,light:s.light,label:s.label};
   scene.update(s);
   const signature=[allowed,s.pose,s.poseSerial||0].join(':');if(signature===lastSignature)return;
   lastSignature=signature;cancelDrone();
   if(!allowed){cat?.freeze();return;}
   if(cat){if(pose==='sleep')cat.sleep();else if(pose==='rest')cat.settle();else cat.play(pose);}
   else if(pose!=='rest'&&pose!=='sleep')droneClip(pose);
  },
  motionDiagnostics(){return cat?.diagnostics()||{animations:activeAnimations.length};},
  dispose(){disposed=true;cancelDrone();cat?.destroy();},
  // Local standalone showroom and artwork regression only.
  previewPose(action,progress){cat?.pose(action,progress);}
 };
}
