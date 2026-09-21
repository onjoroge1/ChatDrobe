import {catFrame,compileCatClip,CLIPS} from './companion-motion.mjs';
const RIG_NS='http://www.w3.org/2000/svg';
/** Original tabby artwork with separately articulated joints, toes, eyelids and tail. */
export function createCatRig(doc){
 const bones={};
 const n=(tag,a={},...children)=>{const e=doc.createElementNS(RIG_NS,tag);for(const[k,v]of Object.entries(a))e.setAttribute(k,String(v));e.append(...children.flat());return e;};
 const bone=(name,...children)=>{const e=n('g',{'data-bone':name},children);e.style.transformBox='view-box';e.style.transformOrigin='0px 0px';bones[name]=e;return e;};
 const svg=n('svg',{viewBox:'0 0 320 190','aria-hidden':'true',focusable:'false',class:'companion-cat'});
 svg.append(n('defs',{},n('linearGradient',{id:'cd-fur',x1:'0',y1:'0',x2:'.25',y2:'1'},n('stop',{offset:0,'stop-color':'#dfb182'}),n('stop',{offset:1,'stop-color':'#b8774e'})),n('radialGradient',{id:'cd-face',cx:'.36',cy:'.28',r:'.8'},n('stop',{offset:0,'stop-color':'#f1cf9b'}),n('stop',{offset:1,'stop-color':'#cc925f'}))));
 svg.append(bone('shadow',n('ellipse',{rx:84,ry:8,fill:'#4b3324'})));
 const skin=n('path',{fill:'#b77d51','data-bone':'tailSkin'}),bands=n('path',{'data-bone':'tailBands',stroke:'#774633','stroke-width':3.4,opacity:.55,fill:'none'});bones.tailSkin=skin;bones.tailBands=bands;svg.append(skin,bands);
 function leg(name,upper,lower,far=false){const color=far?'#a16949':'#d5a578',shade=far?'#945d41':'#ad704c';
  return [bone(name+'Upper',n('path',{d:`M0 0L${upper} 0`,stroke:shade,'stroke-width':name.startsWith('hind')?22:16,'stroke-linecap':'round'})),
   bone(name+'Lower',n('path',{d:`M0 0L${lower} 0`,stroke:color,'stroke-width':13,'stroke-linecap':'round'}),n('path',{d:'M8 -5L10 4 M16 -5L18 4',fill:'none',stroke:'#81543d','stroke-width':3,opacity:.45})),
   bone(name+'Paw',n('path',{d:'M-8 -4Q-9 -11 0 -11Q8 -10 12 -5L12 0Q5 4 -8 1Z',fill:far?'#bc926e':'#f1d7ad',stroke:far?'#a97d59':'#d8b78b','stroke-width':.7}),n('path',{d:'M-1 -2v4M5 -1v3',fill:'none',stroke:'#997554','stroke-width':.8,opacity:.8}))];
 }
 svg.append(...leg('hindFar',34,32,true),...leg('frontFar',28,28,true));
 svg.append(bone('body',n('ellipse',{rx:56,ry:29,fill:'url(#cd-fur)'}),n('path',{d:'M-35 -19Q-24 -5 -26 2M-17 -26Q-7 -14 -8 -5M5 -28Q17 -17 15 -6M28 -21Q37 -12 34 -2',fill:'none',stroke:'#8d5637','stroke-width':5,'stroke-linecap':'round',opacity:.4}),n('path',{d:'M-42 16Q-3 35 37 15',fill:'none',stroke:'#f2ce96','stroke-width':8,'stroke-linecap':'round',opacity:.45})));
 svg.append(bone('haunch',n('ellipse',{rx:26,ry:28,fill:'#c58b5c'}),n('path',{d:'M8 -22Q-10 -19 -12 -8M19 -11Q2 -10 -3 0',fill:'none',stroke:'#885239','stroke-width':4,'stroke-linecap':'round',opacity:.35})));
 svg.append(bone('chest',n('path',{d:'M-14 -19Q-32 -10 -19 25Q-4 31 18 17L23 -10Z',fill:'#e4bc87'})));
 svg.append(...leg('hindNear',38,37),...leg('frontNear',28,29));
 svg.append(bone('neck',n('path',{d:'M-15 -12Q-27 -2 -19 20Q-4 27 14 12L13 -12Z',fill:'#dfb583'})));
 const earL=bone('earL',n('path',{d:'M-27 -11Q-36 -48 -27 -46Q-15 -41 -8 -24Z',fill:'#cf925f',stroke:'#9d6749','stroke-width':1}),n('path',{d:'M-27 -21L-29 -38L-16 -25Z',fill:'#ce9690'}));
 const earR=bone('earR',n('path',{d:'M9 -24Q21 -47 27 -43Q30 -30 28 -12Z',fill:'#c48b5c',stroke:'#9d6749','stroke-width':1}),n('path',{d:'M17 -23L24 -35L24 -19Z',fill:'#ce9690'}));
 earL.style.transformOrigin='-17px -16px';earR.style.transformOrigin='18px -15px';
 const pupils=bone('pupil',n('ellipse',{cx:-12,cy:-2,rx:1.7,ry:5.7,fill:'#172b28'}),n('ellipse',{cx:12,cy:-3.2,rx:1.7,ry:5.2,fill:'#172b28'}),n('circle',{cx:-13.5,cy:-4,r:1.3,fill:'#fff',opacity:.95}),n('circle',{cx:10.7,cy:-5,r:1.2,fill:'#fff',opacity:.95}));
 const eyes=bone('eye',n('path',{d:'M-21 -2Q-14 -10 -4 -2Q-12 7 -21 -2Z M4 -3Q12 -11 20 -4Q13 5 4 -3Z',fill:'#b1c99a',stroke:'#685446','stroke-width':1.1}),pupils);eyes.style.transformOrigin='0px -2px';
 const jaw=bone('jaw',n('ellipse',{cx:0,cy:18,rx:9,ry:7,fill:'#f4dbb5'}));
 const mouth=bone('mouth',n('ellipse',{cx:0,cy:18,rx:6,ry:7,fill:'#523638'}));mouth.style.transformOrigin='0px 12px';
 const tongue=bone('tongue',n('path',{d:'M-2.5 18Q-3 24 1 24Q4 23 3 18Z',fill:'#d78d96'}));
 const head=bone('head',earL,earR,n('path',{d:'M-25 -23Q-4 -34 19 -24Q33 -19 29 0Q28 23 3 27Q-22 23 -29 7Q-35 -12 -25 -23Z',fill:'url(#cd-face)',stroke:'#b57d53','stroke-width':.9}),n('path',{d:'M-16 -26l4 13M-4 -29l2 13M9 -28l-3 12M-29 -4l10 3M-28 5l10 1M25 -7l-7 2',stroke:'#8a533b','stroke-width':3.4,'stroke-linecap':'round',opacity:.48}),eyes,
 bone('closed',n('path',{d:'M-20 -1Q-12 5 -5 -1M5 -2Q13 4 19 -3',fill:'none',stroke:'#665044','stroke-width':1.7,'stroke-linecap':'round'})),
 jaw,mouth,n('ellipse',{cx:-6,cy:11,rx:9,ry:7,fill:'#f5dcaf'}),n('ellipse',{cx:6,cy:10,rx:9,ry:7,fill:'#f7dfb7'}),n('path',{d:'M-5 7Q0 3 5 7L1 11Q-1 12 -5 7Z',fill:'#ac7270'}),n('path',{d:'M0 11v4m0 0q-3 4 -6 1m6-1q3 4 6 0',fill:'none',stroke:'#825e50','stroke-width':1}),tongue,
 n('path',{d:'M-10 10L-39 5M-11 14L-41 14M-10 17L-36 23M12 9L35 1M13 13L38 12M12 16L35 21',fill:'none',stroke:'#edddc3','stroke-width':1,'stroke-linecap':'round',opacity:.95}));
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
