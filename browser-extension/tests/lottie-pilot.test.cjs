const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const base=path.join(__dirname,'../extension/living');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture({defer=false,reject=false}={}){
 const {createLottiePilot}=await import('../extension/living/lottie-pilot.mjs');
 const events=new Map(),mediaEvents=new Map(),handlers=new Map(),calls=[];
 const media={matches:false,addEventListener:(k,v)=>mediaEvents.set(k,v),removeEventListener:k=>mediaEvents.delete(k)};
 const doc={hidden:false,defaultView:{matchMedia:()=>media},addEventListener:(k,v)=>events.set(k,v),removeEventListener:k=>events.delete(k)};
 const animation={isLoaded:false,currentFrame:0,addEventListener:(k,v)=>handlers.set(k,v),play:()=>calls.push('play'),pause:()=>calls.push('pause'),destroy:()=>calls.push('destroy')};
 let resolve,loads=0,options;const wait=new Promise(r=>resolve=r);
 const player={useWebWorker:v=>calls.push(['worker',v]),setSubframeRendering:v=>calls.push(['subframe',v]),loadAnimation:o=>{options=o;return animation;}};
 const fallback={style:{visibility:'visible'}},container={hidden:false};
 const pilot=createLottiePilot(doc,{container,fallback,loadPlayer:async()=>{loads++;if(reject)throw new Error('unavailable');if(defer)await wait;return {default:player};}});
 return{pilot,doc,events,media,mediaEvents,handlers,calls,fallback,container,animation,resolve,loads:()=>loads,options:()=>options};
}
const active={motion:true,active:true};
test('Still and blocked states never import the player; ready playback receives only packaged shape data',async()=>{
 const f=await fixture();for(const state of [{motion:false,active:true},{...active,busy:true},{...active,streaming:true},{...active,focused:true,quiet:true},{...active,reducedMotion:true},{...active,pose:'sleep'}])f.pilot.update(state);
 await flush();assert.equal(f.loads(),0);assert.equal(f.fallback.style.visibility,'visible');
 f.pilot.update(active);f.pilot.update(active);await flush();assert.equal(f.loads(),1);
 const o=f.options();assert.equal(o.autoplay,false);assert.equal(o.renderer,'svg');assert.deepEqual(o.animationData.assets,[]);assert.equal(o.path,undefined);assert.equal(o.rendererSettings.runExpressions,false);
 assert.deepEqual(f.calls.slice(0,2),[['worker',false],['subframe',false]]);
 f.handlers.get('DOMLoaded')();assert.equal(f.pilot.diagnostics().playing,true);assert.equal(f.fallback.style.visibility,'hidden');assert.equal(f.container.hidden,false);
 f.pilot.destroy();
});
test('busy, streaming, focus, sleep and Still pause once and resume without another runtime or animation',async()=>{
 const f=await fixture();f.pilot.update(active);await flush();f.handlers.get('DOMLoaded')();
 for(const patch of [{busy:true},{streaming:true},{focused:true,quiet:true},{pose:'sleep'},{motion:false},{active:false}]){
  f.pilot.update({...active,...patch});assert.equal(f.pilot.diagnostics().playing,false);const n=f.calls.length;f.pilot.update({...active,...patch});assert.equal(f.calls.length,n);
  f.pilot.update(active);assert.equal(f.pilot.diagnostics().playing,true);
 }
 assert.equal(f.loads(),1);f.pilot.destroy();assert.equal(f.calls.at(-1),'destroy');assert.equal(f.events.size,0);assert.equal(f.mediaEvents.size,0);
});
test('document visibility and OS reduced motion independently stop the player',async()=>{
 const f=await fixture();f.pilot.update(active);await flush();f.handlers.get('DOMLoaded')();
 f.doc.hidden=true;f.events.get('visibilitychange')();assert.equal(f.pilot.diagnostics().playing,false);
 f.doc.hidden=false;f.events.get('visibilitychange')();assert.equal(f.pilot.diagnostics().playing,true);
 f.media.matches=true;f.mediaEvents.get('change')();assert.equal(f.pilot.diagnostics().playing,false);
 f.media.matches=false;f.mediaEvents.get('change')();assert.equal(f.pilot.diagnostics().playing,true);f.pilot.destroy();
});
test('late module completion after teardown cannot resurrect a scene',async()=>{
 const f=await fixture({defer:true});f.pilot.update(active);await flush();assert.equal(f.loads(),1);f.pilot.destroy();f.resolve();await flush();assert.equal(f.options(),undefined);assert.equal(f.pilot.diagnostics().disposed,true);assert.equal(f.fallback.style.visibility,'visible');assert.equal(f.container.hidden,true);
});
test('motion disabled during import prevents creating an animation; a later enable can retry',async()=>{
 const f=await fixture({defer:true});f.pilot.update(active);await flush();f.pilot.update({...active,motion:false});f.resolve();await flush();assert.equal(f.options(),undefined);
 f.pilot.update(active);await flush();assert.ok(f.options());f.pilot.destroy();
});
test('module failure or runtime failure preserves artwork, records failure and avoids a retry loop',async()=>{
 for(const kind of ['module','runtime']){const f=await fixture({reject:kind==='module'});f.pilot.update(active);await flush();if(kind==='runtime'){f.handlers.get('DOMLoaded')();f.handlers.get('data_failed')();}
  assert.equal(f.pilot.diagnostics().failed,true);assert.equal(f.fallback.style.visibility,'visible');assert.equal(f.container.hidden,true);f.pilot.update(active);await flush();assert.equal(f.loads(),1);f.pilot.destroy();}
});
test('pinned vendored runtime excludes eval, UMD globals and automatic page discovery',async()=>{
 const source=fs.readFileSync(path.join(base,'vendor/lottie-light-5.13.0.mjs'),'utf8');
 assert.equal(createHash('sha256').update(source).digest('hex'),'f4063511014fabde7e5c6178ae83b12eb44236593e15c15808f0467defb7b365');
 assert.doesNotMatch(source,/\beval\s*\(|\bnew\s+Function\s*\(|window\.bodymovin\s*=|global\.lottie\s*=|readyStateCheckInterval/);
 assert.match(source,/lottie\.version = '5\.13\.0'/);assert.match(source,/export default lottie/);
 const {adaptLottie}=await import('../scripts/vendor-lottie.mjs');assert.throws(()=>adaptLottie(source),/Unreviewed/);
 const {TOKYO_STEAM}=await import('../extension/living/art/tokyo-steam.mjs');assert.deepEqual(TOKYO_STEAM.assets,[]);assert.ok(TOKYO_STEAM.layers.every(x=>x.ty===4));assert.doesNotMatch(JSON.stringify(TOKYO_STEAM),/https?:|data:|javascript:|"fonts"|"chars"/);
});
