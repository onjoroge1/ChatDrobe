/* Original articulated performance model. Pure math; no DOM, events, secrets or tracking.
 * Foot targets are solved with two-bone inverse kinematics. All tracks are compiled once
 * per short performance and handed to the browser; there is no per-frame JavaScript loop. */
export const CLIPS = Object.freeze({
 blink:1800, look:4600, ears:2400, breathe:5200, groom:8400,
 scratch:6200, stretch:9600, knead:8800, yawn:6400, curl:10000,
 inspect:6000, calibrate:8500, dock:9000
});
export const CLIP_LABELS=Object.freeze({blink:'Slow blink',look:'Look around',ears:'Ear flick',breathe:'A quiet breath',groom:'Paw wash and face groom',scratch:'Scratch behind the ear',stretch:'Front-paw stretch',knead:'Make biscuits',yawn:'Yawn and settle',curl:'Curl up to sleep',inspect:'Optics inspection',calibrate:'Stabilizer calibration',dock:'Return to dock'});
const DEG=180/Math.PI;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const hold=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
const wave=(t,start,end,cycles)=>{const phase=clamp((t-start)/(end-start));return Math.sin(phase*Math.PI*2*cycles)*hold(t,start,start+.04,end-.04,end);};
/** World-space two-link solution, clamped to avoid a NaN at reach singularities. */
export function limbIK(root,foot,upper,lower,bend=1){
 const dx=foot[0]-root[0],dy=foot[1]-root[1],raw=Math.hypot(dx,dy);
 const distance=clamp(raw,Math.abs(upper-lower)+.01,upper+lower-.01);
 const a=Math.atan2(dy,dx)-bend*Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
 const elbow=[root[0]+upper*Math.cos(a),root[1]+upper*Math.sin(a)];
 const target=raw>distance?[root[0]+dx*distance/raw,root[1]+dy*distance/raw]:foot;
 const b=Math.atan2(target[1]-elbow[1],target[0]-elbow[0]);
 return {root:[...root],elbow,foot:target,upper:a*DEG,lower:b*DEG,error:Math.hypot(target[0]-foot[0],target[1]-foot[1])};
}
/** Sphinx/resting cat. Motion is anatomically coordinated, intentionally illustrative. */
export function catPose(action='rest',t=0){
 t=clamp(t);
 const p={shoulder:[133,111],hip:[207,115],head:[118,77],headAngle:-3,
 frontFar:[148,155],frontNear:[121,157],hindFar:[228,154],hindNear:[214,157],
 eye:1,pupil:[0,0],earL:0,earR:0,jaw:0,tongue:0,spine:1,tail:[18,-12,-25,-33,-26],tailLift:0,sleep:0};
 const blend=(a,b,w)=>[mix(a[0],b[0],w),mix(a[1],b[1],w)];
 if(action==='sleep'||action==='curl'){
  const w=action==='sleep'?1:ramp(t,.12,.92);
  p.shoulder=blend(p.shoulder,[149,135],w);p.hip=blend(p.hip,[205,129],w);
  p.head=blend(p.head,[146,130],w);p.headAngle=mix(-3,-17,w);p.spine=mix(1,.91,w);
  p.frontNear=blend(p.frontNear,[132,158],w);p.frontFar=blend(p.frontFar,[163,155],w);
  p.hindNear=blend(p.hindNear,[197,158],w);p.tail=p.tail.map((a,i)=>mix(a,[112,38,28,20,12][i],w));
  p.eye=1-ramp(w,.45,.88);p.sleep=w;p.earL=-6*w;p.earR=9*w;
  if(action==='curl'){p.headAngle+=4*wave(t,0,.24,1);p.pupil[0]=-2*(1-w);}
 }
 if(action==='blink')p.eye=1-.98*hold(t,.2,.38,.57,.85);
 if(action==='ears'){p.earL=-19*hold(t,.1,.27,.39,.72);p.earR=12*hold(t,.27,.45,.56,.92);p.headAngle+=2*hold(t,.2,.5,.68,1);}
 if(action==='look'){
  const w=hold(t,.05,.2,.77,1);p.headAngle-=8*w;p.head[1]-=4*w;
  p.pupil=[-3*hold(t,.05,.15,.39,.5)+2*hold(t,.47,.58,.78,1),-1.3*w];
  p.earL=-8*w;p.earR=5*w;p.tail[3]+=10*wave(t,.15,.95,1);
  p.eye=1-.98*hold(t,.7,.74,.78,.88);
 }
 if(action==='breathe'){
  const w=Math.sin(t*Math.PI)**2;p.spine+=.045*w;p.shoulder[1]-=1.4*w;p.head[1]-=.8*w;p.eye=1-.2*w;
 }
 if(action==='groom'){
  const sit=hold(t,.04,.2,.82,1),lift=hold(t,.16,.32,.72,.89);
  p.hip[0]-=12*sit;p.shoulder[1]-=4*sit;
  p.head=blend(p.head,[113,94],lift);p.headAngle+=19*lift;
  // Raise first, then lick; paw remains at the muzzle, not a detached floating limb.
  p.frontNear=blend(p.frontNear,[119,117],lift);
  const licks=wave(t,.34,.62,3);p.head[1]+=1.8*licks;p.frontNear[1]-=.5*licks;
  p.tongue=Math.max(0,licks)*lift;p.eye=1-.9*lift;
  const wipe=hold(t,.63,.69,.74,.81);p.frontNear[0]-=8*wipe;p.frontNear[1]-=23*wipe;
  p.headAngle-=7*wipe;p.earL=-5*lift;p.tail[4]+=6*wave(t,.15,.91,1);
 }
 if(action==='scratch'){
  const sit=hold(t,.05,.23,.78,1),raised=hold(t,.22,.36,.7,.84);
  p.hip=blend(p.hip,[183,109],sit);p.shoulder[0]+=3*sit;p.headAngle-=12*sit;p.head[0]+=4*sit;
  p.hindNear=blend(p.hindNear,[144,68],raised);
  const scratch=wave(t,.38,.68,4);p.hindNear[0]+=3*scratch;p.hindNear[1]+=4*scratch;p.headAngle+=1.8*scratch;
  p.eye=1-.94*raised;p.earR=-10*raised;p.tail[2]+=12*hold(t,.15,.32,.7,.94);
 }
 if(action==='stretch'){
  const anticipate=hold(t,.03,.12,.2,.33),w=hold(t,.19,.47,.7,.98);
  p.hip[0]+=4*anticipate;p.shoulder[0]+=3*anticipate;
  p.shoulder=blend(p.shoulder,[118,137],w);p.hip=blend(p.hip,[212,102],w);
  p.frontNear=blend(p.frontNear,[84,159],ramp(t,.15,.33)*(1-ramp(t,.76,.98)));
  p.frontFar=blend(p.frontFar,[116,156],ramp(t,.19,.38)*(1-ramp(t,.81,1)));
  p.head=blend(p.head,[95,119],w);p.headAngle+=12*w;p.eye=1-.8*w;
  p.spine-=.11*w;p.tail[0]-=31*w;p.tail[2]+=20*w;p.hindNear[0]+=5*w;
 }
 if(action==='knead'){
  const w=hold(t,.05,.22,.82,1),a=wave(t,.18,.82,3);
  p.frontNear[1]-=Math.max(0,a)*10;p.frontFar[1]-=Math.max(0,-a)*10;
  p.shoulder[0]+=1.2*a;p.shoulder[1]+=1.5*w+1.3*Math.abs(a);
  p.head[1]+=4*w+1.1*Math.abs(a);p.headAngle+=3*w;p.eye=1-.72*w;
  p.tail[3]+=5*wave(t,.05,.95,1);
 }
 if(action==='yawn'){
  const w=hold(t,.16,.4,.6,.86);p.jaw=w;p.eye=1-.96*w;p.head[1]-=5*w;p.headAngle-=9*w;
  p.earL-=8*w;p.earR+=7*w;p.spine+=.035*w;p.tongue=.4*w;
 }
 return p;
}
const round=v=>Number(v.toFixed(4));
const transform=(x,y,r=0,sx=1,sy=1)=>`translate(${round(x)}px,${round(y)}px) rotate(${round(r)}deg) scale(${round(sx)},${round(sy)})`;
/** All positions are inside a 320 x 190 habitat. The root never walks across the host. */
export function catFrame(action,t){
 const p=catPose(action,t),f={},s=p.shoulder,h=p.hip;
 const angle=Math.atan2(h[1]-s[1],h[0]-s[0])*DEG;
 f.body={transform:transform((s[0]+h[0])/2,(s[1]+h[1])/2,angle,Math.hypot(h[0]-s[0],h[1]-s[1])/74,p.spine)};
 f.chest={transform:transform(s[0]+2,s[1]+1,angle,1,p.spine)};
 f.haunch={transform:transform(h[0],h[1]+6,angle,1,p.spine)};
 f.neck={transform:transform(s[0]-5,s[1]-12,p.headAngle*.35,1,1)};
 f.head={transform:transform(p.head[0],p.head[1],p.headAngle)};
 f.eye={transform:`scaleY(${round(Math.max(.045,p.eye))})`};f.closed={opacity:round(clamp((.2-p.eye)*7))};
 f.pupil={transform:transform(...p.pupil)};f.earL={transform:`rotate(${round(p.earL)}deg)`};f.earR={transform:`rotate(${round(p.earR)}deg)`};
 f.jaw={transform:transform(0,p.jaw*6,0,1,1+p.jaw*.3)};f.mouth={opacity:round(p.jaw),transform:`scaleY(${round(Math.max(.05,p.jaw))})`};
 f.tongue={opacity:round(p.tongue)};
 const specs=[['frontFar',[s[0]+13,s[1]+2],p.frontFar,28,28,-1],['hindFar',[h[0]+6,h[1]],p.hindFar,34,32,1],['frontNear',[s[0]-4,s[1]],p.frontNear,28,29,-1],['hindNear',[h[0],h[1]+2],p.hindNear,38,37,1]];
 for(const[name,root,foot,upper,lower,bend]of specs){const q=limbIK(root,foot,upper,lower,bend);f[name+'Upper']={transform:transform(...q.root,q.upper)};f[name+'Lower']={transform:transform(...q.elbow,q.lower)};f[name+'Paw']={transform:transform(q.foot[0]-4,q.foot[1])};}
 let x=h[0]+20,y=h[1]+12,rotation=0;
 for(let i=0;i<5;i++){rotation+=p.tail[i];f['tail'+i]={transform:transform(x,y,rotation)};x+=18*Math.cos(rotation/DEG);y+=18*Math.sin(rotation/DEG);}
 // A skinned quadratic ribbon follows the tail bones; no hinged-sticker silhouette.
 const pts=[[h[0]+20,h[1]+12]];x=pts[0][0];y=pts[0][1];rotation=0;
 for(let i=0;i<5;i++){rotation+=p.tail[i];x+=18*Math.cos(rotation/DEG);y+=18*Math.sin(rotation/DEG);pts.push([x,y]);}
 const sides=sign=>pts.map((v,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(5,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,r=6.2-i*.8;return [v[0]-sign*(b[1]-a[1])*r/len,v[1]+sign*(b[0]-a[0])*r/len];});
 const l=sides(1),r=sides(-1).reverse(),q=v=>v.map(round).join(' ');
 const smooth=(side)=>side.slice(1,-1).map((v,i)=>'Q '+q(v)+' '+q([(v[0]+side[i+2][0])/2,(v[1]+side[i+2][1])/2])).join(' ');
 const d='M '+q(l[0])+' '+smooth(l)+' L '+q(l[5])+' L '+q(r[0])+' '+smooth(r)+' L '+q(r[5])+' Z';
 f.tailSkin={d:'path("'+d+'")'};
 let bands='';for(const i of [2,4]){const v=pts[i],a=pts[i-1],b=pts[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),rad=5-i*.7;bands+='M '+q([v[0]-(b[1]-a[1])*rad/len,v[1]+(b[0]-a[0])*rad/len])+' L '+q([v[0]+(b[1]-a[1])*rad/len,v[1]-(b[0]-a[0])*rad/len])+' ';}
 f.tailBands={d:'path("'+bands+'")'};
 for(let i=0;i<5;i++)delete f['tail'+i];
 f.shadow={transform:transform(174,161,0,1-.07*p.sleep,1),opacity:.15};
 return f;
}
export function compileCatClip(action){
 if(!Object.hasOwn(CLIPS,action))throw new Error('Unknown companion performance.');
 const duration=CLIPS[action],frames=Math.min(180,Math.max(40,Math.ceil(duration/70))),tracks={};
 for(let i=0;i<=frames;i++){const t=i/frames,frame=catFrame(action,t);for(const[k,v]of Object.entries(frame)){(tracks[k]??=[]).push({offset:t,...v});}}
 // Skip constant tracks. Static base placement already gives every bone its transform.
 const first=catFrame(action,0),last=catFrame(action,1);
 for(const k of Object.keys(tracks))if(tracks[k].every(v=>Object.entries(first[k]).every(([p,x])=>v[p]===x)))delete tracks[k];
 return {duration,tracks,first,last};
}
