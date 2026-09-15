import {createScene as baseScene,SCENE_CSS as BASE_CSS} from './scene.mjs';
/* A shared renderer refinement, not a new world. No overlay labels, text reads or layout writes. */
export const QUIET_CSS=`
.caption{display:none!important}
.room .traffic,.room .craft,.room .drone,.room .signal{animation:none!important}
.room[data-weather=rain] .rain{opacity:.22!important}
.room[data-weather=snow] .snow{opacity:.42!important}
.room[data-weather=aurora] .aurora{opacity:.18!important}
.room .landscape-move{animation-duration:100s!important}
.room .planet-turn{animation-duration:240s!important}
.quiet-cat-head{transform-origin:814px 533px}.quiet-cat-paw{transform-origin:797px 552px}.quiet-cat-hind{transform-origin:858px 550px}
.quiet-cat-tail{transform-origin:862px 540px}.quiet-cat-tongue{opacity:0}.quiet-cat-closed{display:none}.quiet-cat-eyes{transform-box:fill-box;transform-origin:center}
.room[data-idle=true] .quiet-cat-eyes,.room[data-pose=sleep] .quiet-cat-eyes{display:none}
.room[data-idle=true] .quiet-cat-closed,.room[data-pose=sleep] .quiet-cat-closed{display:inline}
.room[data-pose=blink][data-motion=true][data-active=true] .quiet-cat-eyes{animation:quiet-blink .9s ease-in-out 1}
.room[data-pose=groom][data-motion=true][data-active=true] .quiet-cat-paw{animation:quiet-paw 4.2s ease-in-out 1}
.room[data-pose=groom][data-motion=true][data-active=true] .quiet-cat-head{animation:quiet-groom 4.2s ease-in-out 1}
.room[data-pose=groom][data-motion=true][data-active=true] .quiet-cat-tongue{animation:quiet-lick 4.2s ease-in-out 1}
.room[data-pose=scratch][data-motion=true][data-active=true] .quiet-cat-hind{animation:quiet-scratch 2.8s ease-in-out 1}
.room[data-pose=scratch][data-motion=true][data-active=true] .quiet-cat-head{animation:quiet-tilt 2.8s ease-in-out 1}
.room[data-pose=scratch][data-motion=true][data-active=true] .quiet-cat-tail{animation:quiet-tail 2.8s ease-in-out 1}
.room[data-pose=inspect][data-motion=true][data-active=true] .drone{animation:quiet-inspect 4s ease-in-out 1!important}
.room[data-pose=groom] .quiet-cat-closed,.room[data-pose=scratch] .quiet-cat-closed{display:inline}
.room[data-pose=groom] .quiet-cat-eyes,.room[data-pose=scratch] .quiet-cat-eyes{display:none}
.room[data-motion=false] .quiet-cat *,.room[data-active=false] .quiet-cat *{animation:none!important}
@keyframes quiet-blink{0%,30%,75%,100%{transform:scaleY(1)}48%,57%{transform:scaleY(.08)}}
@keyframes quiet-paw{0%,100%{transform:none}20%,80%{transform:translate(10px,-14px) rotate(-35deg)}}
@keyframes quiet-groom{0%,100%{transform:none}20%,38%,57%,76%{transform:translateY(3px) rotate(9deg)}29%,47%,66%{transform:translateY(5px) rotate(12deg)}}
@keyframes quiet-lick{0%,20%,39%,58%,77%,100%{opacity:0}27%,32%,46%,51%,65%,70%{opacity:1}}
@keyframes quiet-scratch{0%,100%{transform:none}16%,34%,52%,70%{transform:translate(-13px,-26px) rotate(-13deg)}25%,43%,61%,79%{transform:translate(-16px,-19px) rotate(1deg)}}
@keyframes quiet-tilt{0%,100%{transform:none}18%,78%{transform:rotate(-7deg)}}
@keyframes quiet-tail{50%{transform:rotate(4deg)}}
@keyframes quiet-inspect{0%,100%{transform:none}35%{transform:translate(-10px,-5px) rotate(-2deg)}65%{transform:translate(-10px,-3px) rotate(2deg)}}
@media(prefers-reduced-motion:reduce){.room *{animation:none!important;transition:none!important}}
`;
export const SCENE_CSS=BASE_CSS+QUIET_CSS;
const QUIET_NS='http://www.w3.org/2000/svg';
function catRig(doc){
 const n=(tag,attrs,...children)=>{const e=doc.createElementNS(QUIET_NS,tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,String(v));e.append(...children);return e;};
 const head=n('g',{class:'quiet-cat-head'},
  n('path',{d:'M779 531L773 479L795 490L824 486L846 468L851 521Q821 547 779 531Z',fill:'#d7a776'}),
  n('path',{d:'M778 487l9 8l-8 8M839 480l-8 9l11 7',fill:'#bd8c79'}),
  n('g',{class:'quiet-cat-eyes'},n('ellipse',{cx:797,cy:513,rx:3,ry:3.6,fill:'#493d3c'}),n('ellipse',{cx:827,cy:509,rx:3,ry:3.6,fill:'#493d3c'})),
  n('path',{class:'quiet-cat-closed',d:'M790 513q7 7 14 0 M819 509q7 7 14 0',stroke:'#493d3c','stroke-width':3,fill:'none'}),
  n('path',{d:'M809 520l7-1l-3 4Z',fill:'#97685d'}),
  n('path',{class:'quiet-cat-tongue',d:'M812 525q3 11 7 6l-2-6Z',fill:'#ce8490'}));
 return n('g',{class:'quiet-cat'},
  n('path',{class:'quiet-cat-tail',d:'M861 540Q928 557 910 513',fill:'none',stroke:'#ae7b58','stroke-width':13,'stroke-linecap':'round'}),
  n('ellipse',{cx:822,cy:546,rx:64,ry:31,fill:'#c18b61'}),
  n('path',{class:'quiet-cat-hind',d:'M858 550q7-15 12-20',fill:'none',stroke:'#d7a776','stroke-width':12,'stroke-linecap':'round'}),
  head,
  n('path',{class:'quiet-cat-paw',d:'M797 552q6-10 6-20',fill:'none',stroke:'#e1b88e','stroke-width':12,'stroke-linecap':'round'}));
}
export function createScene(doc,definition){
 const scene=baseScene(doc,definition),cat=scene.element.querySelector('[data-layer="cat"]');
 if(cat)cat.replaceChildren(catRig(doc));
 scene.element.querySelector('.caption')?.remove();
 let held=null;
 return {...scene,update(value){
  const s={...value};
  s.pose=['blink','groom','scratch','inspect','sleep'].includes(s.pose)?s.pose:'rest';
  const blocked=s.busy===true||s.streaming===true||(s.focused===true&&s.quiet===true);
  if(blocked||!s.motion||!s.active){s.pose='rest';s.motion=false;}
  // Do not change chapter or illumination underneath an active writer/streaming answer.
  if((s.busy||s.streaming)&&held){s.stage=held.stage;s.light=held.light;s.label=held.label;}
  else held={stage:s.stage,light:s.light,label:s.label};
  scene.update(s);
 }};
}
