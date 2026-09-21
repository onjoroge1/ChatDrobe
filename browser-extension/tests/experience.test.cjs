const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../extension/core.js'),P=require('../extension/prefs.js'),A=require('../extension/access.js');
const select=(state,kind,id,motion='still')=>C.reduce(state,{type:'select-experience',value:{kind,id,motion}});

test('one world selection replaces every competing renderer and preserves local records',()=>{
 let s=C.state({notes:'keep',prompts:[{id:'p',title:'Title',body:'Private'}],prefs:{enabled:false,livingEnabled:true,livingWorld:'starship',livingMotion:true,idleMode:'natural',motion:true}});
 s=select(s,'theme','ocean','still');
 assert.deepEqual(P.experience(s.prefs),{kind:'theme',id:'ocean',motion:'still'});
 assert.equal(s.prefs.enabled,true);assert.equal(s.prefs.livingEnabled,false);assert.equal(s.prefs.idleMode,'off');assert.equal(s.prefs.livingMotion,false);
 assert.equal(s.notes,'keep');assert.equal(s.prompts[0].body,'Private');
 s=select(s,'living','train','subtle');
 assert.deepEqual(P.experience(s.prefs),{kind:'living',id:'train',motion:'subtle'});assert.equal(s.prefs.theme,'paper');assert.equal(s.prefs.motion,false);assert.equal(s.prefs.idleMode,'off');
 s=select(s,'companion','cat','playful');
 assert.deepEqual(P.experience(s.prefs),{kind:'companion',id:'cat',motion:'playful'});assert.equal(s.prefs.livingEnabled,false);assert.equal(s.prefs.motion,false);assert.equal(s.prefs.wordBitesConsent,false);
});

test('motion changes preserve customization of the same world and Still stops its motion',()=>{
 let s=select({},'living','tokyo','subtle');
 s=C.reduce(s,{type:'settings',value:{livingWeather:'snow',livingTime:'night',livingView:'full',livingReactions:true,mode:'dark',width:1000}});
 s=select(s,'living','tokyo','playful');
 for(const [key,value] of Object.entries({livingWeather:'snow',livingTime:'night',livingView:'full',livingReactions:true,mode:'dark',width:1000}))assert.equal(s.prefs[key],value,key);
 s=select(s,'living','tokyo','still');assert.equal(s.prefs.livingEnabled,true);assert.equal(s.prefs.livingMotion,false);
 s=select(s,'companion','cat','still');assert.equal(s.prefs.idleMode,'natural');assert.equal(s.prefs.livingMotion,false);
});

test('stored historic renderer conflicts resolve consistently without granting text inspection',()=>{
 const living=P.prefs({livingEnabled:true,idleMode:'bites',wordBitesConsent:true,motion:true});assert.equal(living.idleMode,'off');assert.equal(living.motion,false);
 const natural=P.prefs({idleMode:'stroll',companion:'theme',theme:'starlit',motion:true,livingMotion:true});assert.equal(P.experience(natural).kind,'companion');assert.equal(natural.motion,false);
 assert.equal(P.prefs({idleMode:'bites',wordBitesConsent:false}).idleMode,'off');
});

test('selection rejects unknown worlds, companion IDs and motion policies',()=>{
 for(const value of [{kind:'remote',id:'https://evil.test'}, {kind:'theme',id:'missing'}, {kind:'living',id:'missing'}, {kind:'companion',id:'robot'}, {kind:'theme',id:'mooncat',motion:true},null])assert.throws(()=>C.reduce({}, {type:'select-experience',value}));
});

test('saved appearance round trips all visual settings without account or text permissions',()=>{
 let s=select({},'living','starship','playful');s=C.reduce(s,{type:'settings',value:{mode:'dark',livingView:'full',livingTime:'journey',livingReactions:true,wordBitesConsent:true}});
 s=C.reduce(s,{type:'preset-add',id:'saved',name:'Bridge'});
 const restored=C.importAppearance(JSON.stringify({format:'chatdrobe-appearance',version:1,prefs:{...s.prefs,paid:true,secret:'private'}}));
 for(const candidate of [s.presets[0].prefs,restored]){
  assert.deepEqual(P.experience(candidate),{kind:'living',id:'starship',motion:'playful'});
  assert.equal(candidate.livingView,'full');assert.equal(candidate.livingTime,'journey');assert.equal(candidate.livingReactions,true);assert.equal(candidate.mode,'dark');
  assert.equal(candidate.wordBitesConsent,false);assert.equal(candidate.paid,undefined);assert.equal(candidate.secret,undefined);
  assert.equal(A.effective(candidate,{premium:false}).livingEnabled,false);
 }
});

test('full local backup restores bounded records and appearance while canceling timers and text consent',()=>{
 const source=C.state({prefs:{theme:'starlit',idleMode:'bites',wordBitesConsent:true},notes:'Private notes',timerUntil:999999999,prompts:[{id:'p',title:'Title',body:'Text'}],bookmarks:[{id:'b',title:'Chat',url:'https://chatgpt.com/c/chat?tracking=1'}],presets:[{id:'s',name:'Room',prefs:{livingEnabled:true,livingWorld:'train',livingMotion:true}}]});
 const restored=C.importBackup(JSON.stringify({format:'chatdrobe-local-backup',version:1,state:{...source,paid:true,entitlement:'fake'}}));
 assert.equal(restored.notes,source.notes);assert.deepEqual(restored.prompts,source.prompts);assert.equal(restored.bookmarks[0].url,'https://chatgpt.com/c/chat');
 assert.equal(restored.prefs.theme,'starlit');assert.equal(restored.prefs.wordBitesConsent,false);assert.equal(restored.prefs.idleMode,'off');assert.equal(restored.timerUntil,0);assert.equal(restored.paid,undefined);assert.equal(restored.entitlement,undefined);
 assert.equal(restored.presets[0].prefs.livingMotion,true);
 for(const raw of ['{}','null',JSON.stringify({format:'chatdrobe-local-backup',version:2,state:source}),JSON.stringify({format:'chatdrobe-local-backup',version:1,state:[]})])assert.throws(()=>C.importBackup(raw));
});

test('legacy Natural motion migrates once and an explicit Still choice survives subsequent reads',()=>{
 const legacy={version:1,prefs:P.prefs({idleMode:'natural',livingMotion:false}),notes:'Preserved'};
 const migrated=C.state(legacy);assert.equal(migrated.experienceVersion,1);assert.equal(migrated.prefs.livingMotion,true);assert.equal(migrated.notes,'Preserved');
 const still=select(migrated,'companion','cat','still');assert.equal(still.prefs.livingMotion,false);assert.equal(C.state(still).prefs.livingMotion,false);
 const oldCat=C.state({version:1,prefs:{theme:'starlit',idleMode:'stroll',companion:'theme'}});assert.equal(oldCat.prefs.livingMotion,true);
 const legacyLiving=C.state({version:1,prefs:{livingEnabled:true,livingMotion:false,idleMode:'natural'}});assert.equal(legacyLiving.prefs.livingMotion,false);
});
