/* ChatDrobe side-panel tools. All user data remains in local extension storage.
 * Real extension data uses chrome.storage, not the website's localStorage.
 * Plain-browser demo uses localStorage only when the explicit demo flag is set.
 */
(async function () {
  'use strict';
  const C=globalThis.MoodDockCore;
  if(!C || document.getElementById('mooddock-root')) return;
  const DEMO=globalThis.__MOODDOCK_DEMO__===true;
  const SIDE=location.protocol==='chrome-extension:'||globalThis.__CHATDROBE_SIDE_FIXTURE__===true;
  if(!DEMO && !SIDE)return;
  const root=document.createElement('div');root.id='mooddock-root';
  const shadow=root.attachShadow({mode:'open'});
  const sheet=document.createElement('style');sheet.textContent=globalThis.MoodDockPanelCSS;shadow.append(sheet);
  document.documentElement.append(root);
  let access={premium:false,testerPreview:false,paid:false},demoPreview=false;
  let s=C.state(),tab='worlds',filter='All',tier='free',tool='prompts',open=true,promptQuery='',lastFocus=null;
  let localQueue=Promise.resolve(),uiQueue=Promise.resolve(),noteDirty=false,noteSaving=false,clockTick=null,lastScene=null;
  // Sandboxed previews may not expose localStorage. The demo can still run in memory.
  let demoStorage=null,demoMemory={};
  if(DEMO){try{demoStorage=window.localStorage;demoStorage.getItem('mooddock-demo');}catch{demoStorage=null;}}
  const originalVars=new Map();
  const varNames=['--md-width','--md-font','--md-font-size','--md-line-height','--md-accent','--md-link'];
  const attrs=['data-md-enabled','data-md-theme','data-md-focus','data-md-motion','data-md-decoration','data-md-bubbles'];
  for(const k of varNames)originalVars.set(k,{v:document.documentElement.style.getPropertyValue(k),p:document.documentElement.style.getPropertyPriority(k)});
  function el(tag,attr={},...children){
    const node=document.createElement(tag);
    for(const [k,v] of Object.entries(attr)){
      if(v===undefined||v===null)continue;
      if(k==='class')node.className=v;
      else if(k==='on')Object.entries(v).forEach(([event,fn])=>node.addEventListener(event,fn));
      else if(k==='value')node.value=v;
      else if(k==='checked')node.checked=Boolean(v);
      else if(k==='hidden')node.hidden=Boolean(v);
      else node.setAttribute(k,String(v));
    }
    for(const c of children.flat(Infinity))if(c!==null&&c!==undefined)node.append(typeof c==='string'?document.createTextNode(c):c);
    return node;
  }
  function button(label,fn,klass='ghost',attrs={}){return el('button',{type:'button',class:klass,on:{click:fn},...attrs},label);}
  function title(kicker,heading,desc){return [el('div',{class:'eyebrow'},kicker),el('h1',{class:'sectionTitle'},heading),el('p',{class:'sub'},desc)];}
  function field(label,node,extra=''){const l=el('label',{class:'field'},el('span',{class:'fieldTitle'},label),node);if(extra)l.append(el('p',{class:'tiny'},extra));return l;}
  function uid(){
    if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
    // getRandomValues remains available to offline/sandboxed showroom documents.
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function info(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
  async function request(kind,action){
    if(DEMO){
      localQueue=localQueue.catch(()=>{}).then(()=>{
        let raw=demoMemory;if(demoStorage){try{raw=JSON.parse(demoStorage.getItem('mooddock-demo')||'{}');}catch{raw={};}}
        let data=C.state(raw);if(kind==='mutate'){data=C.reduce(data,action);if(demoStorage)demoStorage.setItem('mooddock-demo',JSON.stringify(data));else demoMemory=data;}return data;
      });return localQueue;
    }
    const reply=await chrome.runtime.sendMessage({scope:'mooddock',kind,action});
    if(!reply?.ok)throw new Error(reply?.error||'Extension was reloaded. Refresh this page.');
    access=reply.access||access;return C.state(reply.state);
  }
  function mutate(action,redraw=false){
    const run=uiQueue.catch(()=>{}).then(async()=>{
      try{s=await request('mutate',action);apply();if(redraw)render();info(DEMO&&!demoStorage?'Demo saved in memory only.':'Saved on this browser.');return true;}
      catch(err){info(err.message||'Could not save changes.',true);return false;}
    });uiQueue=run;return run;
  }
  async function openUpgrade(world='',target=null){
    if(DEMO){info('Premium upgrade preview. Checkout is not connected; no payment is collected.');return;}
    try{info('Checking Premium access…');const reply=await chrome.runtime.sendMessage({scope:'mooddock',kind:'open-upgrade',world,target});if(!reply?.ok)throw new Error(reply?.error||'Could not check access.');if(reply.applied){access=reply.access;s=C.state(reply.state);apply();render();info(access.adminPremium?'Applied with complimentary Admin Premium.':'Premium theme applied.');}else info(reply.errorHint||'Connect your account once to continue. The selected world will be applied when Premium is verified.');}catch(e){info(e.message,true);}
  }
  function settings(value,redraw=false){
    if(!access.premium&&ChatDrobeAccess.requiresPremium(value)){void openUpgrade(value.theme||'',value);render();return Promise.resolve(false);}
    return mutate({type:'settings',value},redraw);
  }
  async function testerPreview(enabled){
    if(enabled&&!confirm('Enable Premium features for private testing? This is not a purchase or a paid subscription.'))return;
    if(DEMO){demoPreview=enabled;access={premium:enabled,testerPreview:enabled,paid:false};render();return;}
    try{const r=await chrome.runtime.sendMessage({scope:'mooddock',kind:'tester-preview',enabled});if(!r?.ok)throw new Error(r?.error||'Could not change preview.');access=r.access;s=C.state(r.state);apply();render();info(enabled?'Private tester preview on — not a paid subscription.':'Free mode restored.');}catch(e){info(e.message,true);}
  }
  function restoreVars(){for(const [k,{v,p}]of originalVars){if(v)document.documentElement.style.setProperty(k,v,p);else document.documentElement.style.removeProperty(k);}}
  // Static original vector primitives. No user-supplied SVG or HTML is executed.
  function art(theme){
    const ns='http://www.w3.org/2000/svg';
    const n=(tag,attributes,...children)=>{const x=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([k,v])=>x.setAttribute(k,String(v)));children.forEach(c=>x.append(c));return x;};
    const svg=n('svg',{viewBox:'0 0 200 200',fill:'none','aria-hidden':'true'});
    const a=theme.accent,b=theme.second,stroke=theme.dark?theme.text:theme.muted;
    svg.append(n('circle',{cx:111,cy:91,r:67,fill:a,opacity:.12}));
    if(theme.motif==='cat'){
      svg.append(n('path',{d:'M68 135 Q38 140 49 162 Q80 189 131 156 Q149 143 138 113 L135 61 L111 80 Q99 78 87 81 L63 62 L67 105 Q57 119 68 135Z',fill:b,stroke:stroke,'stroke-width':3,'stroke-linejoin':'round'}));
      svg.append(n('path',{d:'M88 137 Q69 157 97 164 M138 146 Q180 155 175 123 Q171 108 160 115',stroke:stroke,'stroke-width':7,'stroke-linecap':'round'}));
      svg.append(n('ellipse',{cx:86,cy:108,rx:3,ry:5,fill:stroke}),n('ellipse',{cx:116,cy:107,rx:3,ry:5,fill:stroke}),n('path',{d:'M98 117 L103 117 M101 121 Q109 128 115 121',stroke:stroke,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M128 56 Q143 40 146 59 Q148 44 164 50 Q149 51 151 69 Q144 55 128 56Z',fill:a}));
      svg.append(n('circle',{cx:88,cy:89,r:4,fill:theme.surface}),n('circle',{cx:96,cy:92,r:2,fill:theme.surface}));
    }else if(theme.motif==='robot'){
      svg.append(n('rect',{x:60,y:69,width:85,height:73,rx:26,fill:a,stroke:stroke,'stroke-width':3}));
      svg.append(n('rect',{x:72,y:84,width:61,height:31,rx:14,fill:theme.bg}),n('circle',{cx:88,cy:100,r:6,fill:b}),n('circle',{cx:116,cy:100,r:6,fill:b}));
      svg.append(n('path',{d:'M101 69V49 M79 146 L73 165 H87 M124 146 L130 165 H116 M57 103 L44 115 M150 101 L165 113',stroke:stroke,'stroke-width':6,'stroke-linecap':'round'}));
      svg.append(n('circle',{cx:101,cy:44,r:7,fill:b}),n('path',{d:'M87 126 H117',stroke:theme.bg,'stroke-width':4,'stroke-linecap':'round'}));
      svg.append(n('circle',{cx:166,cy:60,r:13,stroke:b,'stroke-width':3}));
    }else if(theme.motif==='burst'){
      svg.append(n('path',{d:'M102 28 L117 65 L158 51 L145 91 L182 110 L143 129 L155 169 L115 155 L94 185 L77 148 L36 162 L49 121 L18 101 L58 85 L47 43 L84 59Z',fill:b,stroke:stroke,'stroke-width':3,'stroke-linejoin':'round'}));
      svg.append(n('circle',{cx:101,cy:105,r:37,fill:a,stroke:stroke,'stroke-width':3}),n('ellipse',{cx:101,cy:105,rx:48,ry:15,transform:'rotate(-35 101 105)',stroke:theme.surface,'stroke-width':5}),n('circle',{cx:101,cy:105,r:10,fill:theme.surface}));
    }else if(theme.motif==='rally'){
      svg.append(n('rect',{x:14,y:23,width:172,height:146,rx:17,fill:theme.surface,stroke:theme.line,'stroke-width':2}));
      svg.append(n('path',{d:'M29 44 H170 M29 54 H112 M30 145 H168 M39 31 V157 M164 31 V157',stroke:theme.line,'stroke-width':1}));
      svg.append(n('path',{d:'M25 138 H177',stroke:stroke,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M38 104 L61 80 Q65 75 79 75 H116 L142 99 L164 105 L170 123 H31 L32 111Z',fill:b,stroke:stroke,'stroke-width':3,'stroke-linejoin':'round'}));
      svg.append(n('path',{d:'M67 82 H86 V98 H54Z M94 82 H114 L135 98 H94Z',fill:'#4f6875'}));
      svg.append(n('path',{d:'M145 106 H163 V112 H145Z',fill:'#ffdf8b'}));
      for(const x of [60,141])svg.append(n('circle',{cx:x,cy:125,r:14,fill:'#303841',stroke:theme.surface,'stroke-width':2}),n('circle',{cx:x,cy:125,r:6,fill:'#b9c4cc'}));
      svg.append(n('rect',{x:87,y:102,width:25,height:17,rx:3,fill:theme.surface}),n('path',{d:'M93 108 H102 L94 115 H103 M107 107 H111 L108 116',stroke:stroke,'stroke-width':1.5,'stroke-linejoin':'round'}));
      svg.append(n('path',{d:'M26 70 H45 M36 60 V80',stroke:a,'stroke-width':2}));
    }else if(theme.motif==='bridge'){
      svg.append(n('rect',{x:11,y:20,width:178,height:153,rx:27,fill:theme.surface,stroke:theme.line,'stroke-width':2}));
      svg.append(n('rect',{x:24,y:33,width:152,height:87,rx:25,fill:'#132d49',stroke:a,'stroke-width':3}));
      svg.append(n('circle',{cx:129,cy:73,r:29,fill:'#7cafd9'}),n('path',{d:'M112 53 Q138 46 145 68 L128 70 L125 85 L105 86',fill:'#bce0e5',opacity:.8}));
      for(const [x,y,r]of [[41,54,1.5],[72,83,2],[88,45,1],[151,102,1]])svg.append(n('circle',{cx:x,cy:y,r,fill:'#fff7d3'}));
      svg.append(n('path',{d:'M20 147 L35 132 H166 L181 148 L175 163 H26Z',fill:theme.soft,stroke:theme.line,'stroke-width':2}));
      svg.append(n('path',{d:'M36 144 H80 M122 144 H163 M35 154 H63',stroke:a,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('ellipse',{cx:95,cy:115,rx:29,ry:9,fill:theme.line,opacity:.3}));
      svg.append(n('path',{d:'M58 101 L68 91 M58 101 L73 108 M126 101 L115 91 M126 101 L110 108',stroke:b,'stroke-width':5,'stroke-linecap':'round'}));
      svg.append(n('rect',{x:70,y:77,width:44,height:36,rx:14,fill:'#eef6fb',stroke:a,'stroke-width':2}),n('rect',{x:77,y:85,width:30,height:15,rx:6,fill:'#234361'}));
      svg.append(n('circle',{cx:85,cy:92,r:3,fill:'#95e1df'}),n('circle',{cx:99,cy:92,r:3,fill:'#95e1df'}),n('path',{d:'M92 77 V67',stroke:a,'stroke-width':2}),n('circle',{cx:92,cy:65,r:3,fill:b}));
    }else if(theme.motif==='observatory'){
      svg.append(n('rect',{x:13,y:20,width:174,height:154,rx:20,fill:theme.surface,stroke:theme.line,'stroke-width':2}));
      svg.append(n('circle',{cx:102,cy:92,r:66,fill:theme.bg,stroke:theme.line,'stroke-width':1}));
      svg.append(n('ellipse',{cx:101,cy:94,rx:66,ry:28,transform:'rotate(-22 101 94)',stroke:a,'stroke-width':1.5}),n('ellipse',{cx:101,cy:94,rx:48,ry:46,transform:'rotate(15 101 94)',stroke:theme.line,'stroke-width':1.5}));
      svg.append(n('circle',{cx:101,cy:94,r:19,fill:b}),n('circle',{cx:96,cy:88,r:9,fill:'#ffcf77',opacity:.8}));
      svg.append(n('circle',{cx:153,cy:63,r:11,fill:'#5b86b0',stroke:theme.surface,'stroke-width':2}),n('circle',{cx:51,cy:126,r:6,fill:'#a181bc'}),n('circle',{cx:63,cy:62,r:4,fill:a}));
      svg.append(n('path',{d:'M101 137 V154 M82 157 H120 M36 159 H62 M139 159 H164',stroke:a,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M29 38 H46 M37 30 V47 M150 35 H168',stroke:theme.line,'stroke-width':2}));
    }else if(theme.motif==='leaf'){
      svg.append(n('path',{d:'M101 168 V65',stroke:a,'stroke-width':5,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M98 137 Q43 139 43 98 Q87 93 99 137 M105 108 Q159 116 164 69 Q115 65 105 108 M99 82 Q64 75 73 39 Q109 45 99 82',fill:a,stroke:stroke,'stroke-width':2}));
      svg.append(n('path',{d:'M73 174 H130',stroke:b,'stroke-width':7,'stroke-linecap':'round'}));
    }else{
      svg.append(n('circle',{cx:109,cy:106,r:40,fill:a,opacity:.8}),n('ellipse',{cx:109,cy:106,rx:76,ry:23,transform:'rotate(-28 109 106)',stroke:b,'stroke-width':6}),n('circle',{cx:58,cy:42,r:8,fill:b}),n('circle',{cx:157,cy:156,r:5,fill:a}));
    }
    return svg;
  }
  const panel=el('section',{class:'panel','aria-label':'ChatDrobe workspace controls'});
  const header=el('header',{class:'head'},el('div',{class:'brandrow'},el('span',{class:'brandmark','aria-hidden':'true'},'◔'),el('span',{class:'brand'},'ChatDrobe'),el('span',{class:'badge'},'PRIVATE BETA'),button('×',()=>setOpen(false),'iconbutton',{'aria-label':'Close ChatDrobe'})),el('p',{class:'tagline'},'Dress your ChatGPT workspace.'));
  const nav=el('nav',{class:'nav','aria-label':'ChatDrobe sections'});
  const body=el('div',{class:'content'});
  const status=el('div',{class:'status',role:'status','aria-live':'polite'},DEMO&&!demoStorage?'Sandbox demo · In-memory storage only':'Free tools stay local · Account linking is optional');
  const pause=button('Pause styling',()=>settings({enabled:!s.prefs.enabled},false));
  panel.append(header,nav,body,el('footer',{class:'footer'},status,pause));shadow.append(panel);
  const dock=button('◔ ChatDrobe',()=>setOpen(true),'dock',{'aria-label':'Open ChatDrobe'});shadow.append(dock);
  const scenery=el('div',{class:'decoration','aria-hidden':'true'});if(!SIDE)shadow.prepend(scenery);
  if(SIDE){dock.hidden=true;header.querySelector('.iconbutton')?.remove();const sideStyle=el('style',{},':host{display:block;position:static!important;width:100%;min-height:100vh;}.panel{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;}.dock,.decoration{display:none!important;}.content{padding:18px!important;}.grid{gap:10px!important;}');shadow.append(sideStyle);}
  function setOpen(value){
    if(SIDE&&!value)return;
    if(!value&&noteDirty){info('Save your notes before closing this panel.',true);return;}
    if(value&&!open)lastFocus=document.activeElement;
    open=value;panel.hidden=!open;dock.hidden=open;scenery.hidden=open||!s.prefs.enabled||!s.prefs.decoration;
    if(DEMO)document.body.dataset.mdPanel=String(open);
    if(open){render();panel.querySelector('button')?.focus({preventScroll:true});}
    else if(lastFocus?.isConnected&&lastFocus!==root)lastFocus.focus?.({preventScroll:true});
    syncClock();
  }
  function apply(){
    if(SIDE){
      root.setAttribute('data-panel-mode',s.prefs.panelMode);
      document.documentElement.style.colorScheme=s.prefs.panelMode==='system'?'light dark':s.prefs.panelMode;
      pause.textContent=s.prefs.enabled?'Pause styling':'Resume styling';syncClock();return;
    }
    const p=s.prefs,html=document.documentElement,t=C.themeById(p.theme);restoreVars();
    if(!p.enabled){attrs.forEach(a=>html.removeAttribute(a));}
    else{
      html.setAttribute('data-md-enabled','true');html.setAttribute('data-md-theme',t.id);
      html.setAttribute('data-md-focus',String(p.focus));html.setAttribute('data-md-motion',String(p.motion));html.setAttribute('data-md-decoration',String(p.decoration));html.setAttribute('data-md-bubbles',String(p.bubbles));
      html.style.setProperty('--md-width',`${p.width}px`);html.style.setProperty('--md-font',C.FONTS[p.font]);html.style.setProperty('--md-font-size',`${p.fontSize}px`);html.style.setProperty('--md-line-height',String(p.lineHeight));
      // Keep readable link color even when the chosen custom accent is too faint.
      if(p.accent){html.style.setProperty('--md-accent',p.accent);html.style.setProperty('--md-link',C.contrast(p.accent,t.bg)>=4.5?p.accent:t.accent);}
    }
    if(lastScene!==t.id){scenery.replaceChildren(art(t));lastScene=t.id;}scenery.hidden=open||!p.enabled||!p.decoration||window.innerWidth<1250;
    pause.textContent=p.enabled?'Pause styling':'Resume styling';
    dock.title='Alt + Shift + M';updateClock();
  }
  function changeTab(next){if(noteDirty){info('Save your notes before switching sections.',true);return;}tab=next;render();}
  function render(){
    nav.replaceChildren(...[['worlds','Worlds'],['read','Read'],['living','Living'],['play','Play'],['tools','Tools'],['account','Account'],['about','About']].map(([key,label])=>button(label,()=>changeTab(key),'',{'aria-pressed':String(tab===key)})));
    body.replaceChildren();
    if(tab==='worlds')renderWorlds();else if(tab==='read')renderRead();else if(tab==='living')renderLiving();else if(tab==='play')renderPlay();else if(tab==='tools')renderTools();else if(tab==='account')renderAccount();else renderAbout();
    syncClock();
  }
  function renderWorlds(){
    body.append(...title('YOUR WORKSPACE, REIMAGINED','Find your world.','Free essentials. Premium personality. Choose a Premium world to review the upgrade, then connect your account.'));
    body.append(el('div',{class:'tierTabs',role:'group','aria-label':'Theme collection'},
      button('Free · '+C.THEMES.filter(t=>t.plan==='free').length,()=>{tier='free';filter='All';render();},'',{'aria-pressed':String(tier==='free')}),
      button('Premium · '+C.THEMES.filter(t=>t.plan==='pro').length,()=>{tier='pro';filter='All';render();},'',{'aria-pressed':String(tier==='pro')})));
    if(tier==='pro')body.append(el('div',{class:'premiumNote'},access.premium?(access.adminPremium?'Admin Premium · complimentary':'Test Plus verified.'):'Premium is locked. Connect an account to test the subscription.',button('Meet the companions',()=>changeTab('play'),'ghost')));
    body.append(el('div',{class:'filters'},...['All',...new Set(C.THEMES.map(t=>t.label))].map(v=>button(v,()=>{filter=v;render();},'chip',{'aria-pressed':String(filter===v)}))));
    const grid=el('div',{class:'grid'});
    for(const t of C.THEMES.filter(t=>t.plan===tier&&(filter==='All'||t.label===filter))){
      const cover=el('div',{class:'cover'});cover.style.background=`radial-gradient(ellipse at 10% 10%, ${t.soft}, transparent),linear-gradient(140deg,${t.bg},${t.panel})`;cover.style.color=t.muted;
      cover.append(el('div',{class:'miniwindow'},...Array.from({length:4},()=>el('i'))),art(t));
      const locked=t.plan==='pro'&&!access.premium;
      const card=button('',()=>locked?openUpgrade(t.id):settings({theme:t.id,enabled:true,accent:''},true),'world',{'aria-label':`${locked?'Upgrade for':'Apply'} ${t.name}`,'aria-pressed':String(s.prefs.theme===t.id&&s.prefs.enabled),title:t.description});
      card.append(cover,el('div',{class:'worldinfo'},el('span',{class:'worldtitle'},t.name),el('span',{class:'worldmeta'},el('span',{},t.label),el('span',{},t.plan==='free'?'Free':(access.premium?(access.adminPremium?'Admin Premium':'Test Plus'):'Premium · locked')))));
      if(locked)card.append(el('span',{class:'lockBadge','aria-hidden':'true'},'Premium'));
      if(!locked&&s.prefs.theme===t.id&&s.prefs.enabled)card.append(el('span',{class:'check','aria-hidden':'true'},'✓'));
      grid.append(card);
    }
    if(!grid.children.length)grid.append(el('p',{class:'empty'},'No worlds in this filter. Choose All.'));
    body.append(el('p',{class:'readingNote'},'New: Rally Garage · Orbital Bridge · Solar Observatory. Complete light/dark worlds are Free; their idle routines are Premium features.'),grid,el('div',{class:'callout'},el('strong',{},'Themes, not just a coat of paint.'),'Coordinated surfaces, type controls, conversation bubbles, patterns and original little companions.'));
    body.append(el('p',{class:'notice'},'All characters here are original prototype designs. No Hello Kitty, Transformers, Marvel or DC assets are included.'));
  }
  function switchControl(label,key,detail){const input=el('input',{type:'checkbox',checked:s.prefs[key],on:{change:e=>settings({[key]:e.target.checked})}});return el('label',{class:'switch'},el('span',{},label,detail?el('div',{class:'detail'},detail):null),input);}
  function rangeControl(label,key,min,max,step,unit){
    const output=el('output',{},String(s.prefs[key])+unit);const input=el('input',{type:'range',min,max,step,value:s.prefs[key],'aria-label':label,on:{input:e=>{output.textContent=e.target.value+unit;},change:e=>settings({[key]:Number(e.target.value)})}});
    return el('label',{class:'field'},el('span',{class:'fieldTitle'},label,output),input);
  }
  function renderRead(){
    body.append(...title('MAKE ROOM TO THINK','Your reading rhythm.','Keep the parts you need. Give the rest some space.'));
    body.append(el('div',{class:'row'},button('Balanced',()=>settings({width:850,font:'system',fontSize:16,lineHeight:1.65,focus:false},true)),button('Reading',()=>settings({width:760,font:'serif',fontSize:18,lineHeight:1.9,focus:true},true)),button('Coding',()=>settings({width:1200,font:'system',fontSize:15,lineHeight:1.6,focus:false},true))));
    const font=el('select',{'aria-label':'Reading font',on:{change:e=>settings({font:e.target.value})}},...Object.keys(C.FONTS).map(k=>el('option',{value:k},({system:'System sans',serif:'Book serif',mono:'Monospace'})[k])));font.value=s.prefs.font;
    body.append(button('Use light workspace and panel',()=>settings({mode:'light',panelMode:'light'},true),'primary'));
    const mode=el('select',{'aria-label':'Workspace appearance',on:{change:e=>settings({mode:e.target.value})}},
      ...[['theme','World’s original palette'],['light','Light variant'],['dark','Dark variant'],['chatgpt','Follow ChatGPT appearance'],['system','Follow system appearance']].map(([v,n])=>el('option',{value:v},n)));mode.value=s.prefs.mode;
    const panelMode=el('select',{'aria-label':'Panel appearance',on:{change:e=>settings({panelMode:e.target.value})}},...['system','light','dark'].map(v=>el('option',{value:v},v[0].toUpperCase()+v.slice(1))));panelMode.value=s.prefs.panelMode;
    body.append(field('Workspace appearance',mode,'Choose Follow ChatGPT appearance to change automatically with ChatGPT. New installations start in Light. Light/Dark and the original palette are fixed choices. Existing selections are preserved.'),field('Panel appearance',panelMode));
    body.append(button('Match ChatGPT light / dark',()=>settings({mode:'chatgpt'},true),'primary'));
    body.append(el('p',{class:'readingNote'},'The input bar is centered in the conversation column, with a separate surface and visible focus ring. The original ChatGPT warning remains visible in the native footer.'));
    body.append(field('Reading font',font),rangeControl('Text size','fontSize',13,24,1,' px'),rangeControl('Line spacing','lineHeight',1.3,2.2,.05,'×'),rangeControl('Conversation width','width',600,1400,25,' px'));
    body.append(switchControl('Focus mode','focus','Hide the history sidebar. Turn off to restore it.'),switchControl('Conversation bubbles','bubbles'),switchControl('Ambient decorations','decoration'),switchControl('Gentle companion motion','motion','Off by default. For articulated cat behaviors, choose Natural companion in Play. Reduced motion is respected.'));
    body.append(el('hr',{class:'rule'}));
    const name=el('input',{type:'text',maxlength:60,placeholder:'e.g. My writing desk','aria-label':'Workspace name'});
    body.append(field('Save this workspace',name),button('Save workspace',async()=>{if(await mutate({type:'preset-add',id:uid(),name:name.value},true))info('Workspace saved locally.');},'primary'));
    const list=el('div',{class:'stack'});for(const p of s.presets)list.append(el('div',{class:'saved'},el('div',{class:'savedtitle'},p.name),el('div',{class:'row'},button('Apply',()=>settings({...p.prefs,enabled:true},true)),button('Delete',()=>mutate({type:'preset-delete',id:p.id},true),'ghost danger',{'aria-label':`Delete workspace ${p.name}`}))));body.append(list);
    body.append(el('p',{class:'readingNote'},'Reading controls do not change the AI model or its answers. These are comfort preferences, not a medical treatment or an accessibility certification.'));
  }
  function selectControl(label,key,options){const select=el('select',{'aria-label':label,on:{change:e=>settings({[key]:key==='idleSeconds'?Number(e.target.value):e.target.value},key==='companion')}},...options.map(([v,n])=>el('option',{value:v},n)));select.value=String(s.prefs[key]);return field(label,select);}
  function renderLiving(){
    body.append(...title('PLUS · LIVING WORLDS LAB','Choose a place, not a palette.','Layered rooms, weather and focus journeys. No conversation text, sound or external weather service is used.'));
    const worlds=[['tokyo','Rainy Tokyo Loft','mooncat','A window over the city. A desk lamp and a sleeping cat.'],['starship','Starship Journey','bridge','Earth → Moon → asteroids → Jupiter → deep space.'],['train','Cozy Train Journey','paper','City → farmland → mountains → snow → sunset.']];
    if(!access.premium){
      body.append(el('div',{class:'callout'},'Connect your account to verify your subscription or complimentary administrator access.'),button('Explore Plus',()=>openUpgrade(),'primary'));
      for(const [id,name,palette,detail] of worlds)body.append(el('div',{class:'saved'},el('strong',{},name),el('p',{class:'tiny'},detail),button('Connect for '+name,()=>openUpgrade(palette,{theme:palette,livingEnabled:true,livingWorld:id}),'ghost')));
      body.append(el('p',{class:'tiny'},'Your selected world is remembered and applied after verification. Motion stays off until you enable it.'));return;
    }
    for(const [id,name,palette,detail] of worlds){body.append(el('div',{class:'saved'},el('strong',{},name),el('p',{class:'tiny'},detail),button(s.prefs.livingEnabled&&s.prefs.livingWorld===id?'Selected':'Enter world',()=>settings({livingEnabled:true,livingWorld:id,livingWeather:id==='tokyo'?'rain':'clear',theme:palette,enabled:true},true),s.prefs.livingWorld===id?'primary':'ghost')));}
    body.append(selectControl('Environment presentation','livingView',[['portal','Portal — a small window'],['full','Full World — around the reading column']]));
    const weather=s.prefs.livingWorld==='starship'?['clear','aurora']:['clear','rain','snow','fog'];
    body.append(selectControl('Illustrated weather','livingWeather',weather.map(v=>[v,v[0].toUpperCase()+v.slice(1)])),selectControl('Scene lighting','livingTime',[['day','Day'],['dusk','Golden hour'],['night','Night'],['journey','Follow focus journey'],['local','Follow local clock (not real sunrise)']]));
    body.append(selectControl('Companion behavior','livingBehavior',[['progressive','Progressive — richer behavior as the workspace rests'],['subtle','Subtle — blinks and quiet breaths only']]));
    body.append(el('p',{class:'readingNote'},'45 seconds: notice and look. 2 minutes: groom or scratch. 4 minutes: stretch and knead. 8–10 minutes: settle to sleep. Actions stay in the margin with long quiet gaps. Reading without input also counts as inactivity; use Subtle or Quiet during focus for stillness.'));
    body.append(button('Preview the motion — no waiting',()=>{const url=chrome.runtime.getURL('motion-preview.html');chrome.tabs.create({url});},'ghost'));
    body.append(el('h3',{},'Atmosphere recipes'),el('div',{class:'row'},button('Rainy writing',()=>settings({livingEnabled:true,livingWorld:'tokyo',livingWeather:'rain',livingTime:'dusk',theme:'mooncat',enabled:true},true)),button('Deep-space focus',()=>settings({livingEnabled:true,livingWorld:'starship',livingWeather:'aurora',livingTime:'night',livingQuiet:true,theme:'bridge',enabled:true},true)),button('Snowy window seat',()=>settings({livingEnabled:true,livingWorld:'train',livingWeather:'snow',livingTime:'day',theme:'paper',enabled:true},true))));
    body.append(switchControl('Ambient scene motion','livingMotion','Off by default. Articulated companions, subtle weather and scene depth. Input, selected text and streaming pause movement; no conversation content is read.'),switchControl('Quiet during focus','livingQuiet','Keeps all motion and companion routines still during a focus session. No scene badges or completion pop-ups.'),switchControl('Activity reactions','livingReactions','Locally observes input occurrence and composer control state, never draft text or key values. Sleep/wake, desk light and supported streaming signals.'));
    body.append(el('div',{class:'callout'},'Journeys use the focus timer, not how much you type. Elapsed timer minutes are not measured productive work.'),el('div',{class:'row'},...[5,25,45,90].map(m=>button(m+' min journey',async()=>{if(await mutate({type:'timer',value:Date.now()+m*60000}))info('Focus session started. Return to ChatGPT; the scene advances at chapter boundaries.');}))),button('Cancel focus session',()=>mutate({type:'timer',value:0})));
    const progress=el('p',{class:'readingNote'},'Focus totals are stored locally.');body.append(progress);
    if(!DEMO)chrome.runtime.sendMessage({scope:'mooddock',kind:'living-state'}).then(r=>{if(r?.ok&&progress.isConnected)progress.textContent=`Completed timer sessions: ${r.progress.completed} · Scheduled minutes completed: ${r.progress.minutes}. No message contents are stored.`;}).catch(()=>{});
    body.append(button('Refresh focus totals',()=>render()),button('Reset focus history',async()=>{if(!confirm('Reset timer-session totals and cancel the current focus timer? Notes and saved prompts stay unchanged.'))return;if(!DEMO){const r=await chrome.runtime.sendMessage({scope:'mooddock',kind:'living-reset-progress'});if(!r?.ok){info(r?.error||'Reset failed.',true);return;}s=await request('read');}render();}),button('Turn Living Worlds off',()=>settings({livingEnabled:false},true),'primary'));
    body.append(el('p',{class:'readingNote'},'Full World protects the whole reading band. Portal uses a clear margin above the input area. If no margin exists, the scene hides instead of covering controls; try a narrower conversation width. Audio, real weather, custom uploads and creator publishing are not implemented.'));
  }
  function renderPlay(){
    body.append(...title(access.testerPreview?'PREMIUM · PRIVATE TESTER PREVIEW':'PREMIUM COMPANIONS','A little life on your desk.','Original companions that wait until you pause. No sound, no autoplay video, no message deletion.'));
    if(!access.premium){body.append(el('div',{class:'callout'},el('strong',{},'A natural companion, not a floating emoji.'),'The illustrated cat looks, grooms, scratches and stretches in place after quiet intervals. All effects yield to input and respect reduced motion.'),button('Explore Premium',()=>openUpgrade(),'primary'),el('p',{class:'tiny'},'Connect your account from Account. A verified subscription or complimentary admin grant unlocks companions.'));return;}
    body.append(el('div',{class:'petStage','aria-hidden':'true'},s.prefs.companion==='theme'?art(C.themeById(s.prefs.theme)):el('span',{class:'petFace'},({cat:'😺',robot:'🤖',spark:'✨'})[s.prefs.companion]),el('span',{},'Pause. Play. Back to work.')));
    const routine=({rally:'Rally cruise: the wheels roll, the car parks, and its headlights glow once.',bridge:'Drone inspection: undock, inspect a decorative console, then return to charge.',observatory:'Solar orbit: a planet makes one circuit of the miniature observatory.'})[s.prefs.theme];
    if(routine)body.append(el('div',{class:'callout'},el('strong',{},routine),'Choose This world’s character + World routine. Uses a small clear page margin; it will skip when there is not enough space. No conversation text is read by these routines.'));
    body.append(el('div',{class:'callout'},el('strong',{},'Natural companion · new'),'Use the articulated cat with your current static theme, without a whole room. Progressive idle behavior stays in a protected margin.'),button('Use the natural cat in this theme',()=>settings({idleMode:'natural',livingEnabled:false,companion:'cat'},true),'primary'),selectControl('Natural companion behavior','livingBehavior',[['progressive','Progressive idle behavior'],['subtle','Subtle — blinks and breathing']]));
    body.append(selectControl('Companion','companion',[['theme','This world’s character'],['cat','Natural cat 🐈'],['robot','Robot emoji 🤖'],['spark','Sparkles ✨']]));
    const effect=el('select',{'aria-label':'Idle effect',on:{change:e=>{
      const value=e.target.value;
      if(value==='bites'&&!s.prefs.wordBitesConsent){info('First enable the Word Bites permission below.',true);e.target.value=s.prefs.idleMode;return;}
      settings({idleMode:value});
    }}},el('option',{value:'off'},'Off — no idle monitoring'),el('option',{value:'natural'},'Natural cat — stays in a safe margin'),el('option',{value:'stroll'},'World routine — cats use Natural motion'),el('option',{value:'bites'},'Word Bites — reversible text illusion'));effect.value=s.prefs.idleMode;
    const natural=s.prefs.idleMode==='natural'||s.prefs.idleMode==='stroll'&&(s.prefs.companion==='cat'||s.prefs.companion==='theme'&&['mooncat','starlit'].includes(s.prefs.theme));
    body.append(field('Idle effect',effect));
    if(!natural)body.append(selectControl('Start after inactivity','idleSeconds',[[30,'30 seconds'],[60,'1 minute'],[120,'2 minutes'],[300,'5 minutes']]));
    else body.append(el('p',{class:'readingNote'},'Natural mode starts with a quiet glance after 45 seconds, becomes more involved at 2 and 4 minutes, and settles at 8–10 minutes. Preview each action immediately in the separate studio.'));
    const consent=el('input',{type:'checkbox',checked:s.prefs.wordBitesConsent,on:{change:e=>{const allowed=e.target.checked;settings({wordBitesConsent:allowed,...(!allowed&&s.prefs.idleMode==='bites'?{idleMode:'off'}:{})},true);}}});
    body.append(el('label',{class:'switch'},el('span',{},'Allow Word Bites on visible assistant text',el('div',{class:'detail'},'Optional: examines short, visible assistant text locally to pick up to three words. No sampled text is saved or transmitted. Your draft, links, code and user messages are excluded.')),consent));
    body.append(el('div',{class:'callout'},el('strong',{},'An illusion, not an edit.'),'Only the text’s temporary visual highlight changes. Moving the mouse, typing, scrolling or switching tabs restores it immediately. Each appearance ends by itself, with one run per idle spell.'));
    body.append(el('div',{class:'row'},button(natural?'Preview natural motion — no waiting':'Preview on chat in 3 seconds',async()=>{
      if(natural){chrome.tabs.create({url:chrome.runtime.getURL('motion-preview.html')});return;}
      if(DEMO){info('This panel fixture does not control a real ChatGPT tab.');return;}
      try{const reply=await chrome.runtime.sendMessage({scope:'mooddock',kind:'idle-preview'});if(!reply?.ok)throw new Error(reply?.error||'Could not start preview.');info('Preview armed. Keep the mouse still for 3 seconds; activity cancels it.');}catch(e){info(e.message,true);}
    },'primary'),button('Turn idle effects off',()=>settings({idleMode:'off'},true))));
    body.append(el('p',{class:'readingNote'},'Reduced-motion settings, hidden tabs, text selection, visible generation controls, modal dialogs and playing media suppress idle effects. Unknown UI states may need additional compatibility fixes. Access is controlled by your verified subscription or complimentary admin grant. Natural mode uses its progressive timing; the separate legacy effects use the selected inactivity threshold.'));
  }
  function switchTool(next){if(noteDirty){info('Save your notes before switching tools.',true);return;}tool=next;render();}
  function renderTools(){
    body.append(...title('SMALL TOOLS, USEFUL EVERY DAY','Keep your flow.','Everything you save stays in this browser profile.'));
    body.append(el('div',{class:'filters'},...['prompts','notes','shortcuts','timer'].map(v=>button(v[0].toUpperCase()+v.slice(1),()=>switchTool(v),'chip',{'aria-pressed':String(tool===v)}))));
    if(tool==='prompts')renderPrompts();else if(tool==='notes')renderNotes();else if(tool==='shortcuts')renderShortcuts();else renderTimer();
  }
  async function copy(text){try{await navigator.clipboard.writeText(text);info('Copied. Paste it into ChatGPT when ready.');}catch{info('Clipboard access was blocked. Select the saved text to copy manually.',true);}}
  function renderPrompts(){
    const name=el('input',{type:'text',maxlength:100,placeholder:'Give this prompt a name','aria-label':'Prompt title'});
    const input=el('textarea',{maxlength:12000,placeholder:'Your reusable prompt…','aria-label':'Prompt text'});
    body.append(field('Title',name),field('Prompt',input),button('Save prompt',()=>mutate({type:'prompt-add',id:uid(),title:name.value,body:input.value},true),'primary'));
    body.append(el('p',{class:'readingNote'},'Copy and paste only. ChatDrobe never sends a message, inserts hidden instructions, or captures your prompt history.'));
    const list=el('div',{class:'stack'});
    const search=el('input',{class:'search',type:'search',placeholder:'Search saved prompts…','aria-label':'Search prompts',value:promptQuery,on:{input:e=>{promptQuery=e.target.value;draw();}}});
    body.append(el('hr',{class:'rule'}),search,list);
    function draw(){list.replaceChildren();const matches=s.prompts.filter(p=>(p.title+' '+p.body).toLowerCase().includes(promptQuery.toLowerCase()));if(!matches.length)list.append(el('p',{class:'empty'},'No saved prompts here yet. Add one above.'));for(const p of matches)list.append(el('div',{class:'saved'},el('div',{class:'savedtitle'},p.title),el('div',{class:'savedbody'},p.body),el('div',{class:'row'},button('Copy',()=>copy(p.body)),button('Delete',()=>mutate({type:'prompt-delete',id:p.id},true),'ghost danger',{'aria-label':`Delete prompt ${p.title}`}))));}draw();
  }
  function renderNotes(){
    const area=el('textarea',{maxlength:20000,value:s.notes,placeholder:'Keep an idea, a reminder, or your next step…','aria-label':'Workspace notes',on:{input:()=>{noteDirty=true;info('Unsaved note changes.');}}});area.style.minHeight='240px';
    const save=button('Save notes',async()=>{noteSaving=true;save.disabled=true;area.disabled=true;const ok=await mutate({type:'notes',value:area.value});if(ok)noteDirty=false;noteSaving=false;save.disabled=false;area.disabled=false;},'primary');
    body.append(field('Your local scratchpad',area),save,el('p',{class:'readingNote'},'These are workspace-wide notes, not notes attached to your ChatGPT account. Save before leaving. Anyone with access to this browser profile can read them. Do not store passwords or secrets here.'));
  }
  function renderShortcuts(){
    const name=el('input',{type:'text',maxlength:100,placeholder:'e.g. Weekly planning','aria-label':'Shortcut title'});
    const url=el('input',{type:'url',placeholder:'https://chatgpt.com/c/…','aria-label':'Chat URL'});
    const tagInput=el('input',{type:'text',maxlength:40,placeholder:'e.g. Work, Study','aria-label':'Shortcut tag'});
    body.append(field('Shortcut name',name),field('Paste a saved chat URL',url),field('Tag',tagInput),button('Save shortcut',()=>mutate({type:'bookmark-add',id:uid(),title:name.value,url:url.value,tag:tagInput.value},true),'primary'),el('p',{class:'readingNote'},'Manual local bookmarks only. No account-wide indexing or conversation downloads. Opening a shortcut navigates this tab.'));
    const list=el('div',{class:'stack'});for(const b of s.bookmarks)list.append(el('div',{class:'saved'},el('a',{href:b.url,rel:'noreferrer'},b.title),el('p',{class:'tiny'},b.tag||'Untagged'),button('Delete',()=>mutate({type:'bookmark-delete',id:b.id},true),'ghost danger',{'aria-label':`Delete shortcut ${b.title}`})));body.append(list);
  }
  function renderTimer(){
    body.append(el('div',{class:'timer'},el('p',{class:'tiny'},'ONE THING AT A TIME'),el('div',{class:'clock','data-clock':'true','aria-label':'Focus time remaining'},'25:00'),el('p',{class:'tiny','data-timer-label':'true'},'Choose a session below.'),el('div',{class:'row'},button('25 min',()=>mutate({type:'timer',value:Date.now()+25*60*1000})),button('5 min',()=>mutate({type:'timer',value:Date.now()+5*60*1000})),button('Reset',()=>mutate({type:'timer',value:0})))));
    body.append(el('p',{class:'readingNote'},'No sound or background notifications. The deadline is saved locally and the display catches up when a tab wakes. Closing every ChatGPT tab does not send you a reminder.'));
  }
  function updateClock(){const clocks=shadow.querySelectorAll('[data-clock]');const left=s.timerUntil?Math.max(0,Math.ceil((s.timerUntil-Date.now())/1000)):1500;for(const c of clocks)c.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');const label=shadow.querySelector('[data-timer-label]');if(label)label.textContent=s.timerUntil?(left?'A little uninterrupted time.':'Session complete. Take a breath.'):'Choose a session below.';}
  function downloadAppearance(){const blob=new Blob([JSON.stringify({format:'chatdrobe-appearance',version:1,prefs:s.prefs},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a',{href:url,download:'chatdrobe-appearance.json'});shadow.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);info('Appearance exported. Notes and prompts are not included.');}

  function renderAccount(){
   body.append(...title('ACCOUNT · STRIPE SANDBOX','Your Premium access.','Connect to your ChatDrobe account. No ChatGPT messages, notes or prompts are sent.'));
   body.append(el('div',{class:'callout'},el('strong',{},access.adminPremium?'Admin Premium — complimentary':access.testSubscription?'Test Plus — verified':'Free'),el('p',{},access.accountEmail||'No account connected.')));
   body.append(button('Open account connection',async()=>{const r=await chrome.runtime.sendMessage({scope:'mooddock',kind:'open-account'});if(!r?.ok)info(r?.error||'Unable to open account.',true);},'primary'));
   body.append(button('Refresh Premium access',async()=>{const r=await chrome.runtime.sendMessage({scope:'mooddock',kind:'billing-refresh'});if(!r?.ok){info(r?.error||'Unable to refresh.',true);return;}s=await request('read');render();info(r.billing.lastError||(r.billing.adminPremium?'Admin Premium ready.':r.billing.testSubscription?'Test Plus verified.':'Free account.'));}));
   body.append(el('p',{class:'readingNote'},'This build accepts signed subscriber access or complimentary administrator access. There is no tester override. Once your account is connected and verified, Premium worlds apply directly. Access may remain cached for up to ten minutes after server-side cancellation; local disconnect locks it immediately.'));
  }
  function renderAbout(){
    body.append(...title('AN INDEPENDENT PROJECT','A useful free version.','A paid version worth choosing—not a paywall around comfortable reading.'));
    body.append(el('div',{class:'callout'},el('strong',{},'Sandbox build · 0.7.0'),'Free mode is the default. Premium unlocks from a linked account with a verified test subscription or current administrator access. Admin Premium is complimentary; no live payments or tester override.'));
    body.append(el('div',{class:'two'},el('div',{class:'plan'},el('h3',{},'Free'),el('div',{class:'price'},'$0'),el('p',{},'No subscription required'),el('div',{class:'bulletline'},'11 original starter worlds'),el('div',{class:'bulletline'},'All reading controls'),el('div',{class:'bulletline'},'50 prompts · 25 shortcuts'),el('div',{class:'bulletline'},'Notes + focus timer')),el('div',{class:'plan'},el('h3',{},'Premium / Plus'),el('div',{class:'price'},'$29/year'),el('p',{},'Annual plan · sandbox testing only'),el('div',{class:'bulletline'},'Full premium world library'),el('div',{class:'bulletline'},'Idle companions + Word Bites'),el('div',{class:'bulletline'},'Living rooms + weather + journeys'),el('div',{class:'bulletline'},'Three Living environments'))));
    body.append(el('p',{class:'readingNote'},'* Planned features, not implemented in this beta. Cross-device sync is not included.'));
    if(!access.premium)body.append(button('Explore Premium',()=>openUpgrade(),'primary'));
    const siteLinks=ChatDrobeAccess.websiteLinks();
    body.append(el('div',{class:'row'},...Object.entries({home:'ChatDrobe website ↗',premium:'Premium details ↗',help:'Help ↗'}).filter(([name])=>siteLinks[name]).map(([name,label])=>el('a',{href:siteLinks[name],target:'_blank',rel:'noopener noreferrer',referrerpolicy:'no-referrer'},label))));
    if(ChatDrobeCommerceConfig.channel==='private-beta'&&ChatDrobeCommerceConfig.allowTesterPreview)body.append(el('div',{class:'callout'},el('strong',{},'Private testing only'),el('p',{},'This deliberately bypasses payment for this test package. It does not claim a purchase and is not enabled by appearance imports.'),button(access.testerPreview?'Turn off tester preview':'Enable private tester preview',()=>testerPreview(!access.testerPreview),'ghost')));
    body.append(el('hr',{class:'rule'}),el('h2',{class:'savedtitle'},'Your appearance, portable'));
    const file=el('input',{type:'file',accept:'.json,application/json','aria-label':'Import appearance JSON',on:{change:async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>10000)throw new Error('Choose a JSON file smaller than 10 KB.');const prefs=C.importAppearance(await f.text());await settings(prefs,true);}catch(err){info(err.message,true);}}}});
    body.append(button('Export appearance JSON',downloadAppearance),field('Import appearance',file),el('p',{class:'tiny'},'Only validated appearance settings. No scripts, images, prompts, notes, or payment status. Importing or applying a saved workspace never grants Word Bites permission.'));
    body.append(button('Export local data backup',()=>{
      if(!window.confirm('This backup includes your saved notes, prompts and chat shortcuts. Save it privately; do not upload it to public bug reports.'))return;
      const url=URL.createObjectURL(new Blob([JSON.stringify({format:'chatdrobe-local-backup',version:1,state:s},null,2)],{type:'application/json'}));
      const a=el('a',{href:url,download:'chatdrobe-local-backup.json'});shadow.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);info('Local data backup exported. Keep it private.');
    }));
    body.append(el('hr',{class:'rule'}),el('h2',{class:'savedtitle'},'Privacy & recovery'),el('p',{class:'notice'},'This build has no analytics. Linking an account enables account-only requests to www.chatdrobe.com and periodic entitlement refreshes. No messages or local notes are sent. Website links open www.chatdrobe.com only when you click them; the site receives a normal browser visit, not your ChatDrobe notes or conversations. It stores only what you save into ChatDrobe plus appearance preferences, the timer, and local aggregate focus-session totals. It does not run ChatGPT requests. The optional Word Bites effect briefly examines small visible assistant-text fragments in memory. It never stores or transmits that text; with the effect off, no text scan runs. Data is local, not encrypted, and shared across accounts using the same browser profile.'));
    body.append(el('div',{class:'row'},button('Restore original appearance',()=>mutate({type:'reset'},true)),button('Delete all ChatDrobe data',async()=>{if(window.confirm('Delete your saved ChatDrobe prompts, notes, shortcuts, workspaces, and timer from this browser? This cannot be undone.')){await mutate({type:'wipe'},true);}},'ghost danger')));
    if(SIDE)body.append(button('Check active ChatGPT tab',async()=>{try{const reply=await chrome.runtime.sendMessage({scope:'mooddock',kind:'diagnostics'});if(!reply?.ok)throw new Error(reply?.error||'No active ChatGPT tab found.');info(`Page: ${reply.stats.applyCount} applies, ${reply.stats.writeCount} writes, ${reply.stats.extraDOMNodes} scene. Root observer: ${reply.stats.rootAppearanceObserver?'on':'off'}. Living: ${reply.living?.reason||'Off'} (${reply.living?.sceneNodes||0} scene nodes). Idle: ${reply.idle?.running?'running':reply.idle?.enabled?'armed':'off'}; module ${reply.idle?.loaded?'loaded':'not loaded'}.`);}catch(e){info(e.message,true);}}));
    body.append(el('p',{class:'readingNote'},'ChatDrobe is a working codename, not a cleared trademark. Independent of OpenAI. Not an official ChatGPT feature. Browser-only: does not skin the mobile or desktop apps.'));
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open&&e.composedPath().includes(root)){e.stopPropagation();setOpen(false);}if(DEMO&&e.altKey&&e.shiftKey&&e.code==='KeyM'){e.preventDefault();setOpen(!open);}},true);
  window.addEventListener('beforeunload',e=>{if(noteDirty||noteSaving){e.preventDefault();e.returnValue='';}});
  window.addEventListener('resize',()=>{scenery.hidden=open||!s.prefs.enabled||!s.prefs.decoration||window.innerWidth<1250;});
  function syncClock(){
    clearTimeout(clockTick);clockTick=null;
    if(!open||document.hidden||tab!=='tools'||tool!=='timer')return;
    updateClock();
    if(s.timerUntil>Date.now())clockTick=setTimeout(syncClock,1000);
  }
  document.addEventListener('visibilitychange',syncClock);
  window.addEventListener('pagehide',()=>{clearTimeout(clockTick);clockTick=null;});
  window.addEventListener('pageshow',syncClock);
  if(!DEMO){
    chrome.runtime.onMessage.addListener((msg,sender,respond)=>{if(sender.id===chrome.runtime.id&&msg?.scope==='mooddock'&&msg.kind==='toggle'){setOpen(!open);respond({ok:true});}});
    window.addEventListener('focus',()=>{chrome.runtime.sendMessage({scope:'mooddock',kind:'billing-refresh'}).catch(()=>{});});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.mooddock||changes['chatdrobe:access-beta-v1']||changes['chatdrobe:billing-v1'])){const before=access.premium,source=access.accessSource;request('read').then(data=>{s=data;apply();if((before!==access.premium||source!==access.accessSource)&&['worlds','living','account','play'].includes(tab))render();}).catch(()=>{});/* Never redraw unsaved notes, prompts or reading controls. */}});
  } else window.addEventListener('storage',e=>{if(e.key==='mooddock-demo'){try{s=C.state(JSON.parse(e.newValue||'{}'));apply();}catch{}}});
  try{s=await request('read');apply();render();panel.hidden=!open;dock.hidden=open;if(DEMO)document.body.dataset.mdPanel=String(open);}
  catch(err){info(err.message,true);panel.hidden=false;dock.hidden=true;open=true;render();}
})();
