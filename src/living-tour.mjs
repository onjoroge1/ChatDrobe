/* Active-visible-time demo transport. A 30-second tour is not a productivity timer. */
export const TOUR_MS=30000;
export function createTour({now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,onChange=()=>{}}={}){
 let duration=TOUR_MS,chapters=4,elapsed=0,started=0,intent=false,allowed=true,handle=null,dead=false;
 const position=()=>Math.max(0,Math.min(duration,elapsed+(intent&&allowed?Math.max(0,now()-started):0)));
 function clear(){if(handle!==null){clearTimer(handle);handle=null;}}
 function snapshot(){const at=position();return {elapsed:at,progress:at/duration,stage:Math.min(chapters-1,Math.floor(at/duration*chapters)),playing:intent,advancing:intent&&allowed,complete:at>=duration};}
 function settle(){elapsed=position();started=now();if(elapsed>=duration)intent=false;}
 function schedule(){clear();if(dead||!intent||!allowed)return;const s=snapshot();const boundary=Math.min(duration,(s.stage+1)*duration/chapters);handle=setTimer(()=>{handle=null;settle();onChange(snapshot());schedule();},Math.max(1,boundary-position()));}
 function change(action){if(dead)return;settle();action();started=now();onChange(snapshot());schedule();}
 return {snapshot,
  play(){change(()=>{if(elapsed>=duration)elapsed=0;intent=true;});},
  pause(){change(()=>{intent=false;});},
  seek(value){if(!Number.isFinite(value))return;change(()=>{elapsed=Math.max(0,Math.min(1,value))*duration;if(elapsed>=duration)intent=false;});},
  visible(value){if(allowed===Boolean(value))return;change(()=>{allowed=Boolean(value);});},
  reset(count=4){if(!Number.isInteger(count)||count<1||count>8)throw new Error('Unsupported chapter count.');change(()=>{chapters=count;elapsed=0;intent=false;});},
  destroy(){dead=true;intent=false;clear();}
 };
}
