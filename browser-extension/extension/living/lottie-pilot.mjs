import {TOKYO_STEAM} from './art/tokyo-steam.mjs';

const loadPackagedPlayer=()=>import('./vendor/lottie-light-5.13.0.mjs');
/** One local SVG-light trial. A failure leaves the existing scene intact.
 * loadPlayer is a test seam; production always uses the pinned packaged module.
 */
export function createLottiePilot(doc,{container,fallback,loadPlayer=loadPackagedPlayer}){
 const reduced=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
 let state={},animation=null,pending=null,ready=false,disposed=false,failed=false,playing=false;
 const fallbackVisibility=fallback?.style?.visibility||'';
 const permitted=()=>!disposed&&!failed&&!doc.hidden&&!reduced?.matches&&state.reducedMotion!==true&&state.motion===true&&state.active===true&&state.busy!==true&&state.streaming!==true&&!(state.focused===true&&state.quiet===true)&&state.pose!=='sleep';
 const showFallback=value=>{if(fallback?.style)fallback.style.visibility=value?fallbackVisibility:'hidden';};
 function fail(){
  failed=true;ready=false;playing=false;showFallback(true);container.hidden=true;
  try{animation?.destroy();}catch{}animation=null;
 }
 function apply(){
  if(!ready||!animation)return;
  const next=permitted();if(next===playing)return;playing=next;
  try{if(next)animation.play();else animation.pause();}catch{fail();}
 }
 function loaded(){if(disposed||failed)return;ready=true;container.hidden=false;showFallback(false);apply();}
 function sync(){
  if(disposed)return;
  if(!permitted()){apply();return;}
  if(animation){apply();return;}
  if(pending||failed)return;
  pending=Promise.resolve().then(loadPlayer).then(module=>{
   if(disposed||!permitted())return;
   const player=module.default;
   player.useWebWorker(false);
   // Thirty authored frames per second; no interpolated subframes or added loop.
   player.setSubframeRendering(false);
   animation=player.loadAnimation({container,renderer:'svg',loop:true,autoplay:false,
    animationData:structuredClone(TOKYO_STEAM),
    rendererSettings:{preserveAspectRatio:'xMidYMid meet',progressiveLoad:false,hideOnTransparent:true,runExpressions:false,focusable:false}});
   animation.addEventListener('DOMLoaded',loaded);
   animation.addEventListener('data_failed',fail);
   animation.addEventListener('error',fail);
   if(animation.isLoaded)loaded();
  }).catch(()=>{if(!disposed)fail();}).finally(()=>{pending=null;});
 }
 doc.addEventListener?.('visibilitychange',sync);
 reduced?.addEventListener?.('change',sync);
 container.hidden=true;
 return {
  update(value){state={...value};sync();},
  diagnostics(){return {runtime:'lottie-svg-light-5.13.0',loaded:ready,loading:!!pending,playing,failed,disposed,frame:animation?Math.floor(animation.currentFrame||0):0};},
  destroy(){
   if(disposed)return;disposed=true;
   doc.removeEventListener?.('visibilitychange',sync);reduced?.removeEventListener?.('change',sync);
   try{animation?.destroy();}catch{}animation=null;ready=false;playing=false;
   showFallback(true);container.hidden=true;
  }
 };
}
