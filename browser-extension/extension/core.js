/* MoodDock core: deterministic validation and reducers. No network or page access. */
(function (root) {
  'use strict';
  const THEMES = [{"id":"mooncat","name":"Mooncat Café","label":"Cozy","plan":"free","motif":"cat","pattern":"dots","bg":"#fcf3ea","surface":"#fffaf5","panel":"#f5e5d5","text":"#332a32","muted":"#6f5964","accent":"#97506f","soft":"#f5dfe7","line":"#dec8cd","second":"#c28358","dark":false,"description":"A cinnamon-colored stargazing cat. Warm paper, soft petals, quiet corners."},{"id":"circuit","name":"Circuit Bay","label":"Mecha","plan":"free","motif":"robot","pattern":"grid","bg":"#071b22","surface":"#102a32","panel":"#0b222b","text":"#e0f7f6","muted":"#9dbbc5","accent":"#6aead1","soft":"#1d4a4e","line":"#31505b","second":"#eda969","dark":true,"description":"Your own little orbital workshop. Mint circuits and copper hardware."},{"id":"comic","name":"Comic Club","label":"Comics","plan":"free","motif":"burst","pattern":"dots","bg":"#f5ecff","surface":"#fffcff","panel":"#e8dcf2","text":"#30263c","muted":"#6b567b","accent":"#7845af","soft":"#ead8ff","line":"#cebadd","second":"#e29837","dark":false,"description":"Halftone pages and original cosmic emblems. Make room for big ideas."},{"id":"aurora","name":"Aurora Desk","label":"Atmosphere","plan":"free","motif":"orbit","pattern":"glow","bg":"#10202b","surface":"#172c36","panel":"#0c1a24","text":"#e8f4f4","muted":"#a0bfc9","accent":"#90dbc7","soft":"#294951","line":"#3a5661","second":"#9a96e7","dark":true,"description":"A northern-light palette, glassy surfaces, and a little space to think."},{"id":"paper","name":"Paper & Ink","label":"Minimal","plan":"free","motif":"leaf","pattern":"lines","bg":"#f5f1e7","surface":"#fffdf5","panel":"#eae3d5","text":"#302e27","muted":"#69634f","accent":"#526648","soft":"#e5eadb","line":"#cdc6b4","second":"#ad865a","dark":false,"description":"A sunlit notebook. Serif-friendly, deliberately simple, pleasantly analog."},{"id":"midnight","name":"Midnight Grid","label":"Code","plan":"free","motif":"orbit","pattern":"grid","bg":"#101320","surface":"#191e31","panel":"#0c101b","text":"#eef0ff","muted":"#aab4d3","accent":"#abb5ff","soft":"#303953","line":"#38405c","second":"#75cbd6","dark":true,"description":"A low-key control room for code, ideas, and one more good question."},{"id":"forest","name":"Forest Window","label":"Nature","plan":"free","motif":"leaf","pattern":"glow","bg":"#112c28","surface":"#1a3a33","panel":"#0d231f","text":"#edf4da","muted":"#b3c6a8","accent":"#bfdba0","soft":"#385d40","line":"#466448","second":"#d5b37b","dark":true,"description":"Soft green layers and botanical geometry. The outside, brought inside."},{"id":"ocean","name":"Ocean Glass","label":"Calm","plan":"free","motif":"orbit","pattern":"glow","bg":"#e8f4f5","surface":"#f8feff","panel":"#d3e8ec","text":"#183c47","muted":"#476c78","accent":"#236d86","soft":"#d5ebf1","line":"#a8cbd2","second":"#759cc2","dark":false,"description":"Sea-glass colors and open space. A clear desk for a fresh start."},{"id":"starlit","name":"Starlit Cat","label":"Cozy","plan":"pro","motif":"cat","pattern":"stars","bg":"#241b35","surface":"#312640","panel":"#1d172d","text":"#fceefa","muted":"#ceb4d1","accent":"#e1abd1","soft":"#543c60","line":"#695071","second":"#e6b779","dark":true,"description":"A celestial companion with a lantern and a whole sky of questions."},{"id":"reactor","name":"Mecha Reactor","label":"Mecha","plan":"pro","motif":"robot","pattern":"grid","bg":"#202224","surface":"#2c3032","panel":"#181c1e","text":"#f8f0d9","muted":"#c2bda8","accent":"#efc171","soft":"#534537","line":"#655844","second":"#84d9c7","dark":true,"description":"Warm industrial panels and an original round-eyed explorer robot."},{"id":"sentinel","name":"Neon Sentinel","label":"Comics","plan":"pro","motif":"burst","pattern":"stars","bg":"#201329","surface":"#301d38","panel":"#180e21","text":"#fff0fa","muted":"#d2afd0","accent":"#f0a8d7","soft":"#59354d","line":"#6f4b66","second":"#f1c97c","dark":true,"description":"A graphic-novel nightscape with original orbital insignia. No borrowed heroes."},{"id":"arcade","name":"Retro Arcade","label":"Play","plan":"pro","motif":"orbit","pattern":"grid","bg":"#15152d","surface":"#232340","panel":"#101026","text":"#ecf1ff","muted":"#b1b8dc","accent":"#79e0e5","soft":"#244756","line":"#495575","second":"#e9a0d3","dark":true,"description":"Electric geometry and sunset gradients. One more level, one better idea."},{"id":"rally","name":"Rally Garage","label":"Cars","plan":"free","motif":"rally","pattern":"grid","bg":"#faf5eb","surface":"#fffdf7","panel":"#eee4d3","text":"#302d28","muted":"#695443","accent":"#9e421b","soft":"#f4dfc7","line":"#c4ac91","second":"#e28b4d","dark":false,"description":"An ivory design garage, blueprint details and an original rally car. A clear workbench for your next idea."},{"id":"bridge","name":"Orbital Bridge","label":"Spaceships","plan":"free","motif":"bridge","pattern":"glow","bg":"#edf4fb","surface":"#fcfdff","panel":"#dce8f3","text":"#21344b","muted":"#445d79","accent":"#285f9d","soft":"#d1e2f2","line":"#9fb8d0","second":"#eca865","dark":false,"description":"A pearl-white command deck with a planet-facing viewport and a tiny maintenance drone. Curiosity, ready for launch."},{"id":"observatory","name":"Solar Observatory","label":"Space","plan":"free","motif":"observatory","pattern":"stars","bg":"#f2f5fa","surface":"#fdfefe","panel":"#e0e8f3","text":"#293449","muted":"#4d5e79","accent":"#3e5991","soft":"#dbe3f2","line":"#adbcd3","second":"#d69430","dark":false,"description":"A sunlit observatory with blue instrument panels and a miniature orrery. A quiet place to explore bigger questions."}];
  const P=root.ChatDrobePrefs || (typeof require==='function'?require('./prefs.js'):null);
  const {DEFAULTS,FONTS,prefs,contrast,ink}=P;
  const text = (v,max=200) => typeof v === 'string' ? v.slice(0,max) : '';
  const numeric = (v,lo,hi,fallback) => typeof v==='number' && Number.isFinite(v) ? Math.min(hi,Math.max(lo,v)) : fallback;
  const themeById=id=>THEMES.find(t=>t.id===id)||THEMES[0];
  function safeChatURL(v) {
    try {const u=new URL(v);if(u.protocol!=='https:' || u.hostname!=='chatgpt.com' || u.username || u.password || u.port || !/^\/(?:c\/[\w-]+|g\/[\w-]+\/c\/[\w-]+)\/?$/.test(u.pathname)) return ''; return u.origin+u.pathname;} catch {return '';}
  }
  const cleanList=(x)=>Array.isArray(x)?x.filter(v=>v&&typeof v==='object').slice(0,1000):[];
  function state(v={}) {
    v=v&&typeof v==='object'?v:{};
    return {version:1,prefs:prefs(v.prefs),notes:text(v.notes,20000),timerUntil:numeric(v.timerUntil,0,8640000000000000,0),
      prompts:cleanList(v.prompts).map(p=>({id:text(p.id,80),title:text(p.title,100),body:text(p.body,12000)})).filter(p=>p.id&&p.title&&p.body),
      bookmarks:cleanList(v.bookmarks).map(b=>({id:text(b.id,80),title:text(b.title,100),url:safeChatURL(b.url),tag:text(b.tag,40)})).filter(b=>b.id&&b.title&&b.url),
      presets:cleanList(v.presets).slice(0,100).map(p=>({id:text(p.id,80),name:text(p.name,60),prefs:prefs({...p.prefs,idleMode:'off',wordBitesConsent:false,livingEnabled:false,livingMotion:false,livingReactions:false})})).filter(p=>p.id&&p.name)};
  }
  function reduce(raw,op) {
    const s=state(raw); if(!op || typeof op.type!=='string') throw new Error('Invalid action.');
    switch(op.type) {
      case 'settings':s.prefs=prefs({...s.prefs,...op.value});break;
      case 'notes':s.notes=text(op.value,20000);break;
      case 'timer':s.timerUntil=numeric(op.value,0,8640000000000000,0);break;
      case 'prompt-add': {
        if(s.prompts.length>=1000) throw new Error('Local safety limit reached (1,000 prompts).');
        const p={id:text(op.id,80),title:text(op.title,100).trim(),body:text(op.body,12000).trim()};
        if(!p.id||!p.title||!p.body) throw new Error('Give your prompt a title and text.');
        if(s.prompts.some(x=>x.id===p.id)) throw new Error('Duplicate prompt ID.');
        s.prompts.unshift(p);break;
      }
      case 'prompt-delete':s.prompts=s.prompts.filter(p=>p.id!==op.id);break;
      case 'bookmark-add':{
        const b={id:text(op.id,80),title:text(op.title,100).trim(),url:safeChatURL(op.url),tag:text(op.tag,40).trim()};
        if(!b.id||!b.title||!b.url) throw new Error('Use a saved chat URL on chatgpt.com and add a title.');
        if(s.bookmarks.length>=1000) throw new Error('Local safety limit reached (1,000 shortcuts).');
        s.bookmarks=[b,...s.bookmarks.filter(x=>x.url!==b.url)];break;
      }
      case 'bookmark-delete':s.bookmarks=s.bookmarks.filter(b=>b.id!==op.id);break;
      case 'preset-add':{
        if(s.presets.length>=100) throw new Error('Local safety limit reached (100 presets).');
        const p={id:text(op.id,80),name:text(op.name,60).trim(),prefs:prefs({...s.prefs,idleMode:'off',wordBitesConsent:false,livingEnabled:false,livingMotion:false,livingReactions:false})};
        if(!p.id||!p.name) throw new Error('Name this workspace first.');s.presets.unshift(p);break;
      }
      case 'preset-delete':s.presets=s.presets.filter(p=>p.id!==op.id);break;
      case 'reset':s.prefs={...DEFAULTS,enabled:false};break;
      case 'wipe':return state({prefs:{...DEFAULTS,enabled:false}});
      default:throw new Error('Unsupported action.');
    }
    return s;
  }
  function importAppearance(raw) {
    if(typeof raw!=='string'||raw.length>10000) throw new Error('Appearance file is too large.');
    const v=JSON.parse(raw);
    if(!v||!['mooddock-appearance','chatdrobe-appearance'].includes(v.format)||v.version!==1||!v.prefs||typeof v.prefs!=='object'||Array.isArray(v.prefs)) throw new Error('Not a supported ChatDrobe appearance file.');
    return prefs({...v.prefs,idleMode:'off',wordBitesConsent:false,livingEnabled:false,livingMotion:false,livingReactions:false}); // No URLs, executable styles, account state, or entitlements accepted.
  }
  const api=Object.freeze({THEMES,DEFAULTS,FONTS,prefs,state,reduce,safeChatURL,themeById,importAppearance,contrast,ink});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.MoodDockCore=api;
})(globalThis);
