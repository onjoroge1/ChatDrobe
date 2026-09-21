const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
async function boot(origin='https://chatgpt.com'){
 let callback,resolve;const applies=[],events={};let calls=0;
 const chrome={runtime:{id:'id',onMessage:{addListener:fn=>callback=fn},sendMessage:()=>{calls++;return new Promise(r=>resolve=r);}}};
 const context=vm.createContext({chrome,ChatDrobePrefs:require('../extension/prefs.js'),location:{origin},ChatDrobeAdapter:{create:()=>({apply:p=>applies.push(p),diagnostics:()=>({applyCount:applies.length})})},document:{},window:{addEventListener:(n,f)=>events[n]=f}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../extension/boot.js'),'utf8'),context);
 return{applies,events,get calls(){return calls;},reply:r=>resolve(r),message:(m,s={id:'id'})=>callback(m,s,()=>{})};
}
test('boot never initializes on an unrelated origin',async()=>{const b=await boot('https://example.com');assert.equal(b.calls,0);});
test('boot uses one preference request without loading workspace records',async()=>{const b=await boot();assert.equal(b.calls,1);b.reply({ok:true,snapshot:{revision:0,prefs:{theme:'mooncat'}}});await new Promise(setImmediate);assert.equal(b.applies[0].theme,'mooncat');});
test('stale startup reply cannot overwrite a newer theme broadcast',async()=>{const b=await boot();b.message({scope:'mooddock',kind:'prefs',snapshot:{revision:2,prefs:{theme:'circuit'}}});b.reply({ok:true,snapshot:{revision:1,prefs:{theme:'mooncat'}}});await new Promise(setImmediate);assert.equal(b.applies.length,1);assert.equal(b.applies[0].theme,'circuit');});
test('messages from another extension are ignored',async()=>{const b=await boot();b.message({scope:'mooddock',kind:'prefs',snapshot:{revision:2,prefs:{theme:'circuit'}}},{id:'other'});assert.equal(b.applies.length,0);});
test('BFCache restore refreshes once; normal pageshow does not',async()=>{const b=await boot();b.events.pageshow({persisted:false});assert.equal(b.calls,1);b.events.pageshow({persisted:true});assert.equal(b.calls,2);});
