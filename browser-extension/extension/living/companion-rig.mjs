import {catFrame,compileCatClip,CLIPS} from './companion-motion.mjs';
const RIG_NS='http://www.w3.org/2000/svg';
/** Original ginger-tabby artwork with soft, overlapping silhouettes on the articulated rig. */
export function createCatRig(doc){
 const bones={};
 const n=(tag,a={},...children)=>{const e=doc.createElementNS(RIG_NS,tag);for(const[k,v]of Object.entries(a))e.setAttribute(k,String(v));e.append(...children.flat());return e;};
 const bone=(name,...children)=>{const e=n('g',{'data-bone':name},children);e.style.transformBox='view-box';e.style.transformOrigin='0px 0px';bones[name]=e;return e;};
 const eyeShape='M-20 -2C-20 -10 -5 -10 -4 -2C-5 5 -18 6 -20 -2Z M4 -3C5 -11 20 -11 20 -4C20 3 7 5 4 -3Z';
 const svg=n('svg',{viewBox:'0 0 320 190','aria-hidden':'true',focusable:'false',class:'companion-cat'});
 svg.append(n('defs',{},n('linearGradient',{id:'cd-fur',x1:'0',y1:'0',x2:'.25',y2:'1'},n('stop',{offset:0,'stop-color':'#e6b17b'}),n('stop',{offset:1,'stop-color':'#cc8c5a'})),n('radialGradient',{id:'cd-face',cx:'.36',cy:'.28',r:'.8'},n('stop',{offset:0,'stop-color':'#f3ce99'}),n('stop',{offset:1,'stop-color':'#dfa56e'}))));
 svg.append(bone('shadow',n('ellipse',{rx:84,ry:8,fill:'#654638'})));
 const skin=n('path',{fill:'#ce915f','data-bone':'tailSkin'}),bands=n('path',{'data-bone':'tailBands',stroke:'#a96a47','stroke-width':3.4,'stroke-linecap':'round',opacity:.6,fill:'none'});bones.tailSkin=skin;bones.tailBands=bands;svg.append(skin,bands);
 function leg(name,upper,lower,far=false){const color=far?'#bf865f':'#dca06c',width=name.startsWith('hind')?12:9;
  // Tapered fur shapes overlap at the elbow; identical joint colors avoid a hinged-toy seam.
  return [bone(name+'Upper',n('path',{d:`M-4 ${-width}C${upper*.35} ${-width-2} ${upper*.7} -8 ${upper} -8C${upper+10} -8 ${upper+10} 8 ${upper} 8C${upper*.6} 8 ${upper*.35} ${width+2} -4 ${width}Q-14 0 -4 ${-width}Z`,fill:color})),
   bone(name+'Lower',n('path',{d:`M-2 -8C${lower*.35} -9 ${lower*.7} -6 ${lower} -6Q${lower+7} 0 ${lower} 6C${lower*.65} 7 ${lower*.3} 9 -2 8Q-10 0 -2 -8Z`,fill:color}),n('path',{d:`M${lower*.48} -5Q${lower*.7} -3 ${lower} -5L${lower+1} 4Q${lower*.7} 6 ${lower*.48} 5Z`,fill:far?'#d3a77e':'#f0ce9e',opacity:.7})),
   bone(name+'Paw',n('path',{d:'M-9 -3C-11 -8 -5 -11 1 -10C8 -10 14 -5 13 -1C12 3 0 4 -7 2Q-10 1 -9 -3Z',fill:far?'#d6ad84':'#f5dcb1'}),n('path',{d:'M0 -1q-1 2 0 3M6 -1q-1 2 0 3',fill:'none',stroke:'#b98b64','stroke-width':.85,'stroke-linecap':'round',opacity:.65}))];
 }
 svg.append(...leg('hindFar',34,32,true),...leg('frontFar',28,28,true));
 svg.append(bone('body',n('ellipse',{rx:56,ry:30,fill:'url(#cd-fur)'}),n('path',{d:'M-33 -22Q-26 -17 -24 -8M-13 -28Q-5 -20 -6 -12M9 -28Q18 -21 17 -12M30 -21Q36 -15 34 -8',fill:'none',stroke:'#b37149','stroke-width':4.6,'stroke-linecap':'round',opacity:.52}),n('path',{d:'M-42 15Q-6 34 36 17',fill:'none',stroke:'#f1c994','stroke-width':9,'stroke-linecap':'round',opacity:.5})));
 svg.append(bone('haunch',n('ellipse',{rx:27,ry:28,fill:'#d89c68'}),n('path',{d:'M7 -21Q-8 -20 -12 -10M18 -11Q6 -13 -1 -5',fill:'none',stroke:'#b37149','stroke-width':3.6,'stroke-linecap':'round',opacity:.45})));
 svg.append(bone('chest',n('path',{d:'M-14 -20C-29 -17 -30 5 -18 23Q-2 31 16 18Q23 2 17 -13Q2 -22 -14 -20Z',fill:'#eac18c'})));
 svg.append(...leg('hindNear',38,37),...leg('frontNear',28,29));
 svg.append(bone('neck',n('path',{d:'M-16 -13C-26 -8 -26 10 -17 20Q-2 27 14 11Q18 -1 11 -13Z',fill:'#edc996'})));
 const earL=bone('earL',n('path',{d:'M-28 -11C-32 -23 -33 -42 -28 -43Q-23 -43 -9 -24Z',fill:'#d99b68'}),n('path',{d:'M-27 -21Q-30 -36 -27 -36Q-23 -35 -17 -25Z',fill:'#dfa9a0'}));
 const earR=bone('earR',n('path',{d:'M9 -24Q21 -43 26 -41C31 -37 29 -22 28 -12Z',fill:'#d09566'}),n('path',{d:'M17 -23Q24 -36 25 -33L24 -20Z',fill:'#dca29a'}));
 earL.style.transformOrigin='-17px -16px';earR.style.transformOrigin='18px -15px';
 const pupils=bone('pupil',n('ellipse',{cx:-12,cy:-1.8,rx:3.25,ry:4.1,fill:'#614b3c'}),n('ellipse',{cx:12,cy:-2.7,rx:3.1,ry:3.8,fill:'#614b3c'}),n('circle',{cx:-13.3,cy:-3.6,r:1.2,fill:'#fff8e7',opacity:.95}),n('circle',{cx:10.8,cy:-4.4,r:1.1,fill:'#fff8e7',opacity:.95}));
 const eyes=bone('eye',n('path',{d:eyeShape,fill:'#d4b97c',stroke:'#a88056','stroke-width':.85}),pupils);eyes.style.transformOrigin='0px -2px';
 const jaw=bone('jaw',n('ellipse',{cx:0,cy:18,rx:9,ry:7,fill:'#f6dfb7'}));
 const mouth=bone('mouth',n('ellipse',{cx:0,cy:18,rx:6,ry:7,fill:'#79504b'}));mouth.style.transformOrigin='0px 12px';
 const tongue=bone('tongue',n('path',{d:'M-2.5 18Q-3 24 1 24Q4 23 3 18Z',fill:'#dc9b9d'}));
 const head=bone('head',earL,earR,n('path',{d:'M-24 -23C-12 -31 8 -31 21 -22C30 -16 28 -8 31 0C35 13 23 24 7 27C-8 30 -25 23 -30 12C-35 3 -29 -7 -30 -14Q-29 -20 -24 -23Z',fill:'url(#cd-face)'}),n('path',{d:'M-14 -25Q-12 -20 -10 -17M-3 -28L-2 -18M10 -26Q8 -20 6 -17M-28 -2Q-24 1 -21 1M-28 7L-22 8M28 -4L22 -1M29 5L23 7',fill:'none',stroke:'#b67a4e','stroke-width':2.8,'stroke-linecap':'round',opacity:.6}),eyes,
 bone('closed',n('path',{d:'M-20 -1Q-12 5 -5 -1M5 -2Q13 4 19 -3',fill:'none',stroke:'#8d6548','stroke-width':1.5,'stroke-linecap':'round'})),
 jaw,mouth,n('path',{d:'M-15 9C-15 4 -8 4 -1 8C6 3 13 3 15 8C18 15 10 20 2 19C-7 21 -16 17 -15 9Z',fill:'#f8e3bd'}),n('path',{d:'M-4 7Q0 5 4 7Q4 9 1 11Q-1 12 -4 8Z',fill:'#c38a85'}),n('path',{d:'M0 11v3m0 0q-3 3 -5 1m5-1q3 3 5 0',fill:'none',stroke:'#aa795e','stroke-width':.85,'stroke-linecap':'round'}),tongue,
 n('path',{d:'M-13 11Q-26 7 -38 8M-14 15Q-27 15 -39 18M14 10Q26 5 36 5M15 14Q27 13 37 16',fill:'none',stroke:'#fbebcc','stroke-width':1,'stroke-linecap':'round',opacity:.9}));
 svg.append(head,bones.frontNearPaw);
 let animations=[],currentAction='rest',currentFrame=catFrame('rest',0),lastClip=null,dead=false;
 function apply(frame){for(const[key,values]of Object.entries(frame)){const el=bones[key];if(el)for(const[prop,value]of Object.entries(values))el.style[prop]=String(value);}currentFrame=frame;}
 function stop(freeze=false){
  if(freeze&&animations.length&&!lastClip){const frame={};for(const [key,el]of Object.entries(bones)){const style=doc.defaultView.getComputedStyle(el);frame[key]={};for(const prop of Object.keys(currentFrame[key]||{}))frame[key][prop]=style[prop];}apply(frame);}
  if(freeze&&animations.length&&lastClip){const at=Math.max(0,Math.min(1,(Number(animations[0].currentTime)||0)/lastClip.duration));apply(catFrame(currentAction,at));}
  for(const a of animations){a.onfinish=null;a.cancel();}animations=[];lastClip=null;
 }
 function perform(action){
  if(dead)return;if(action==='rest'||action==='sleep'){stop();currentAction=action;apply(catFrame(action,0));return;}
  if(!Object.hasOwn(CLIPS,action))return;stop();currentAction=action;
  const clip=compileCatClip(action);lastClip=clip;apply(clip.first);
  for(const[name,frames]of Object.entries(clip.tracks)){const el=bones[name];if(!el)continue;const a=el.animate(frames,{duration:clip.duration,fill:'forwards',iterations:1,easing:'linear'});animations.push(a);}
  if(animations.length){const batch=animations;batch[0].onfinish=()=>{if(animations!==batch||dead)return;apply(clip.last);stop();};}
 }
 apply(currentFrame);
 function recover(){
  if(currentAction!=='frozen'){perform('rest');return;}
  const from=currentFrame,to=catFrame('rest',0);stop();currentAction='return';
  for(const [key,values]of Object.entries(to)){const a=bones[key].animate([from[key],values],{duration:450,easing:'ease-out',fill:'forwards'});animations.push(a);}
  const batch=animations;if(batch[0])batch[0].onfinish=()=>{if(animations!==batch||dead)return;apply(to);stop();currentAction='rest';};
 }
 return {element:svg,play:perform,freeze(){stop(true);currentAction='frozen';},settle:recover,sleep(){perform('sleep');},destroy(){dead=true;stop();svg.remove();},diagnostics(){return {action:currentAction,animations:animations.length,bones:Object.keys(bones).length};},
  // Deterministic artwork tests and the explicit preview use this; it never grants access.
  pose(action,t){stop();currentAction=action;apply(catFrame(action,t));}
 };
}
