const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../extension/prefs.js'),C=require('../extension/core.js');
const base=path.join(__dirname,'../extension');
test('30 palette variants keep normal text readable on all main surfaces',()=>{
 const palettes=require('../extension/palettes.json');
 for(const[id,modes]of Object.entries(palettes))for(const[mode,p]of Object.entries(modes)){
  for(const key of ['bg','surface','panel','soft'])assert.ok(P.contrast(p.text,p[key])>=4.5,`${id}/${mode} text on ${key}`);
  for(const key of ['bg','surface','panel'])assert.ok(P.contrast(p.muted,p[key])>=4.5,`${id}/${mode} muted on ${key}`);
  assert.ok(P.contrast(p.accent,P.ink(p.accent))>=4.5);
 }
});
test('existing preferences migrate without turning on text inspection',()=>{const p=P.prefs({theme:'comic',motion:true});assert.equal(p.mode,'light');assert.equal(p.idleMode,'off');assert.equal(p.wordBitesConsent,false);assert.equal(p.motion,true);});
test('word-bites requires explicit consent while stroll needs no text permission',()=>{assert.equal(P.prefs({idleMode:'bites'}).idleMode,'off');assert.equal(P.prefs({idleMode:'bites',wordBitesConsent:true}).idleMode,'bites');assert.equal(P.prefs({idleMode:'stroll'}).idleMode,'stroll');});
test('appearance imports cannot authorize idle monitoring or text inspection',()=>{const value=C.importAppearance(JSON.stringify({format:'chatdrobe-appearance',version:1,prefs:{theme:'starlit',idleMode:'bites',wordBitesConsent:true}}));assert.equal(value.theme,'starlit');assert.equal(value.idleMode,'off');assert.equal(value.wordBitesConsent,false);});
test('mode resolution respects explicit appearance without changing native settings',()=>{
 assert.equal(P.scheme(P.prefs({theme:'mooncat',mode:'theme'}),{nativeDark:true}),'light');
 assert.equal(P.scheme(P.prefs({theme:'circuit',mode:'light'})),'light');
 assert.equal(P.scheme(P.prefs({mode:'chatgpt'}),{nativeDark:true}),'dark');
 assert.equal(P.scheme(P.prefs({mode:'system'}),{systemDark:true}),'dark');
});
test('unknown behavior, timing, code and entitlement settings are discarded',()=>{const p=P.prefs({mode:'bad',idleMode:'eval',idleSeconds:-3,companion:'<svg>',isPro:true,css:'html{}'});assert.equal(p.idleMode,'off');assert.equal(p.idleSeconds,60);assert.equal(p.companion,'theme');assert.equal(p.isPro,undefined);assert.equal(p.css,undefined);});
test('engines are lazy; local focus alarms are the only added permission',()=>{const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));assert.ok(!m.content_scripts[0].js.includes('idle.js'));assert.deepEqual(m.web_accessible_resources,[{resources:['idle.js','world-routines.js','living/engine.mjs','living/model.mjs','living/scene.mjs','living/quiet-scene.mjs','living/quiet-policy.mjs','living/companion-motion.mjs','living/companion-rig.mjs','living/lottie-pilot.mjs','living/art/tokyo-nook.mjs','living/art/tokyo-plant-art.mjs','living/art/tokyo-steam.mjs','living/vendor/lottie-light-5.13.0.mjs'],matches:['https://chatgpt.com/*']}]);assert.deepEqual(m.permissions,['storage','sidePanel','alarms']);});
test('word-bites code has finite bounds, no message edits, and cancels highlights',()=>{const src=fs.readFileSync(path.join(base,'idle.js'),'utf8');assert.ok(!/setInterval\(|requestAnimationFrame\(|innerHTML|deleteContents\(|extractContents\(|insertNode\(|fetch\(/.test(src));assert.match(src,/chars<1536/);assert.match(src,/nodes<80/);assert.match(src,/ranges.length>=limit/);assert.match(src,/highlights\?\.delete\('chatdrobe-idle-bite'\)/);});
// Includes canonical experience selection and a page-side application acknowledgment.
test('twenty kilobyte eager-JS budget excluding opt-in rendering code',()=>{const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));const bytes=m.content_scripts[0].js.reduce((n,f)=>n+fs.statSync(path.join(base,f)).size,0);assert.ok(bytes<20000,`${bytes} bytes`);});

test('generated link colors meet contrast on their theme surfaces',()=>{
 const css=fs.readFileSync(path.join(base,'themes.css'),'utf8'),palettes=require('../extension/palettes.json');
 for(const[id,modes]of Object.entries(palettes))for(const[mode,p]of Object.entries(modes)){
  const line=css.split('\n').find(l=>l.startsWith(`html[data-md-theme="${id}"][data-md-scheme="${mode}"]`));
  const link=line.match(/--md-link:(#[a-f0-9]{6})/)[1];
  for(const surface of ['bg','surface','panel','soft'])assert.ok(P.contrast(link,p[surface])>=4.5,`${id}/${mode}/${surface}`);
 }
});

test('saved workspaces cannot reinstate a revoked text-inspection permission',()=>{let s=C.state({prefs:{idleMode:'bites',wordBitesConsent:true}});s=C.reduce(s,{type:'preset-add',id:'test',name:'Test'});assert.equal(s.presets[0].prefs.idleMode,'off');assert.equal(s.presets[0].prefs.wordBitesConsent,false);assert.equal(C.state({presets:[{id:'old',name:'Old',prefs:{idleMode:'bites',wordBitesConsent:true}}]}).presets[0].prefs.wordBitesConsent,false);});
