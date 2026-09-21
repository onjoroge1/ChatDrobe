import {CLIPS} from './companion-motion.mjs';
/* One scheduler; stages enrich choreography, never its volume or on-screen UI. */
export const QUIET_TIMING=Object.freeze({busy:10000,idle:45000,comfortable:120000,deep:240000,winding:480000,cooldown:75000,sleep:600000});
export const POSES=CLIPS;
export function idleStage(age){return age<45000?'working':age<120000?'noticing':age<240000?'comfortable':age<480000?'unwinding':age<600000?'settling':'asleep';}
const CAT={noticing:['look','blink','ears','breathe'],comfortable:['groom','scratch','yawn'],unwinding:['stretch','knead','groom'],settling:['curl']};
const DRONE={noticing:['inspect'],comfortable:['calibrate','inspect'],unwinding:['calibrate','inspect'],settling:['dock']};
export function createQuietPolicy({now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,onChange=()=>{}}={}){
 let flags={enabled:false,active:false,quiet:false,world:'tokyo',behavior:'progressive'},last=now(),due=last+45000,timer=null,timerAt=Infinity,pose='rest',until=0,dead=false,signature='',serial=0;
 const rounds={};const allowed=()=>flags.enabled&&flags.active&&!flags.quiet;
 function cancel(){if(timer!==null)clearTimer(timer);timer=null;timerAt=Infinity;}
 function snapshot(){const age=Math.max(0,now()-last);return {busy:allowed()&&age<QUIET_TIMING.busy,pose:allowed()?pose:'rest',enabled:allowed(),stage:allowed()?idleStage(age):'working',serial};}
 function publish(){const s=snapshot(),key=JSON.stringify(s);if(key!==signature){signature=key;onChange(s);}}
 function schedule(){if(dead||!allowed()||pose==='sleep')return;const t=now(),age=t-last;const next=pose==='rest'?Math.min(due,last+QUIET_TIMING.sleep):until;const at=age<QUIET_TIMING.busy?Math.min(next,last+QUIET_TIMING.busy):next;if(timer!==null&&timerAt<=at)return;cancel();timerAt=at;timer=setTimer(tick,Math.max(1,at-t));}
 function tick(){
  timer=null;timerAt=Infinity;if(dead||!allowed())return;const t=now(),age=t-last;
  if(pose!=='rest'&&pose!=='sleep'&&t>=until){pose=['curl','dock'].includes(pose)?'sleep':'rest';until=0;}
  if(age>=QUIET_TIMING.sleep)pose='sleep';
  else if(pose==='rest'&&t>=due&&age>=QUIET_TIMING.idle){
   const stage=idleStage(age),quiet=flags.behavior==='subtle';
   const options=quiet?(flags.world==='starship'?['inspect']:['blink','breathe','ears']):(flags.world==='starship'?DRONE[stage]:CAT[stage]);
   const key=flags.world+':'+(quiet?'subtle':stage);const round=rounds[key]||0;rounds[key]=round+1;
   pose=options[round%options.length];until=t+CLIPS[pose];due=until+(quiet?150000:QUIET_TIMING.cooldown);serial++;
  }
  publish();schedule();
 }
 return {configure(value={}){
  const next={enabled:value.enabled===true,active:value.active===true,quiet:value.quiet===true,world:['tokyo','train','starship'].includes(value.world)?value.world:'tokyo',behavior:value.behavior==='subtle'?'subtle':'progressive'};
  if(dead||JSON.stringify(flags)===JSON.stringify(next))return;flags=next;cancel();pose='rest';until=0;last=now();due=last+QUIET_TIMING.idle;for(const k of Object.keys(rounds))delete rounds[k];publish();schedule();
 },activity(){if(dead||!allowed())return;last=now();due=Math.max(due,last+QUIET_TIMING.idle);pose='rest';until=0;publish();schedule();},snapshot,diagnostics(){return {...snapshot(),timer:timer!==null};},dispose(){dead=true;cancel();pose='rest';}};
}
